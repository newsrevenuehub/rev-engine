import datetime
import json
import logging
from dataclasses import dataclass
from functools import cached_property
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils.timezone import make_aware

import reversion
import stripe

from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Payment,
)
from apps.contributions.typings import (
    InvalidMetadataError,
    StripeEventData,
    cast_metadata_to_stripe_payment_metadata_schema,
)
from apps.emails.models import TransactionalEmailRecord


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@dataclass
class StripeWebhookProcessor:
    event: StripeEventData

    def __post_init__(self):
        logger.info("Processing Stripe webhook event %s: %s - %s", self.event_id, self.event_type, self.id)

    @property
    def customer_id(self) -> str:
        return self.obj_data["customer"]

    @property
    def obj_data(self) -> dict:
        return self.event.data["object"]

    @property
    def object_type(self) -> str:
        return self.obj_data["object"]

    @property
    def event_id(self) -> str:
        return self.event.id

    @property
    def id(self) -> str:
        # This is the Stripe ID of the object in the event. While subscription and payment intent have an ID in the payload,
        # invoice.upcoming events do not, so we have to return None.
        return self.obj_data.get("id", None)

    @property
    def event_type(self) -> str:
        return self.event.type

    @property
    def live_mode(self) -> bool:
        return self.event.livemode

    @cached_property
    def contribution(self) -> Contribution | None:
        try:
            match self.object_type:
                case "subscription":
                    return Contribution.objects.get(provider_subscription_id=self.id)
                case "payment_intent":
                    return Contribution.objects.get(provider_payment_id=self.id)
                case "invoice":
                    return Contribution.objects.get(provider_subscription_id=self.obj_data["subscription"])
                case "charge":
                    return Contribution.objects.get(provider_payment_id=self.obj_data["payment_intent"])
                # NB: Conspicously absent is "payment_method". Although we handle payment_method.attached events
                # which have this object type, we potentially will have > 1 contributions with the same provider_customer_id,
                # which is the contribution field that we match to the customer ID in the event.
                case _:
                    return None

        except Contribution.DoesNotExist:
            return None

    @property
    def rejected(self):
        # Not all Stripe entities in webhooks will have a cancellation_reason (for instance, invoice-related events do not).
        return self.obj_data.get("cancellation_reason", None) == "fraudulent"

    def route_request(self):
        logger.info("Routing request for event type %s", self.event_type)
        match self.event_type:
            case "payment_intent.canceled":
                return self.handle_payment_intent_canceled()
            case "payment_intent.payment_failed":
                return self.handle_payment_intent_failed()
            case "payment_intent.succeeded":
                return self.handle_payment_intent_succeeded()
            case "customer.subscription.updated":
                return self.handle_subscription_updated()
            case "customer.subscription.deleted":
                return self.handle_subscription_canceled()
            case "invoice.upcoming":
                return self.handle_invoice_upcoming()
            case "invoice.payment_succeeded":
                self.handle_invoice_payment_succeeded()
            case "charge.refunded":
                return Payment.from_stripe_charge_refunded_event(event=self.event)
            case "charge.succeeded":
                return self.handle_charge_succeeded()
            case "payment_method.attached":
                return self.handle_payment_method_attached()
            case _:
                logger.warning(
                    "StripeWebhookProcessor.route_request received unexpected event type %s", self.event_type
                )
                return None

    @property
    def webhook_live_mode_agrees_with_environment(self) -> bool:
        logger.debug(
            "Event in live mode: %s; settings stripe live mode on: %s",
            self.live_mode,
            settings.STRIPE_LIVE_MODE,
        )
        if settings.STRIPE_LIVE_MODE and not self.live_mode:
            logger.debug(
                "Test mode event %s for account %s received while in live mode",
                self.event_id,
                self.event.account,
            )
            return False
        if not settings.STRIPE_LIVE_MODE and self.live_mode:
            logger.debug(
                "Live mode event %s for account %s received while in test mode",
                self.event_id,
                self.event.account,
            )
            return False
        return True

    @staticmethod
    def ignore_for_metadata_schema_version_1_6(contribution: Contribution | None) -> bool:
        """Return if we can determine that the event is for a contribution with metadata schema version 1.6.

        We ignore these contributions because we want webhooks related to them to be exclusively handled by
        Switchboard in order to avoid race conditions.

        NB: This method will return False if self.contribution is None, and we expect that to be the case when dealing
        with payment_method.attached event, as match that event by its customer ID field, and that's non-unique on Contributions.
        At present, the only action for payment_method.attached events is to update the contribution with the payment method ID and details,
        and our self._handle_pm_update_event() knows to ignore schema version 1.6 contributions.
        """
        if contribution and (metadata := contribution.contribution_metadata):
            return metadata.get("schema_version") == "1.6"
        return False

    def process(self):
        if not self.webhook_live_mode_agrees_with_environment:
            logger.warning("Received webhook in wrong mode; ignoring")
            return
        # For charge.succeeded and payment_method.attached, there is not necessarily a single contribution associated with the event,
        # and that's not an indication of a data integrity issue. In the case of payment_method.attached, in particular, it's logically
        # possible for there to be > 1 contribution with the customer ID on the event in the system, and we need to update all of them
        # (unless they are on metadata schema version 1.6, which is ignored), whereas self.contribution is meant to return a single
        # contribution. On the other hand, we expect to receive webhooks for charge.succeeded events for which we don't have contributions,
        # and we need to ignore those.
        if self.event_type not in ("charge.succeeded", "payment_method.attached") and not self.contribution:
            raise Contribution.DoesNotExist("No contribution found")
        # We ignore any events that have a single contribution whose metadata schema version is 1.6, as these will be handled by
        # Switchboard.
        if self.ignore_for_metadata_schema_version_1_6(self.contribution):
            logger.info("Ingoring event %s with schema version 1.6")
            return
        self.route_request()
        logger.info("Successfully processed webhook event %s", self.event_id)

    def get_metadata_update_value(
        self, contribution_metadata: dict[str, Any], stripe_metadata: dict[str, Any]
    ) -> dict[str, Any]:
        """Get the value to update (if any) for contribution_metadata property based on its current state and state of Stripe metadata."""
        logger.info(
            "Getting metadata update value for contribution %s", self.contribution.id if self.contribution else None
        )
        cast_from_contribution = None
        cast_from_stripe = None
        if contribution_metadata:
            try:
                cast_from_contribution = cast_metadata_to_stripe_payment_metadata_schema(contribution_metadata)
            except InvalidMetadataError as exc:
                logger.info("Failed to cast metadata to schema: %s", exc)
        if stripe_metadata:
            try:
                cast_from_stripe = cast_metadata_to_stripe_payment_metadata_schema(stripe_metadata)
            except InvalidMetadataError as exc:
                logger.info("Failed to cast metadata to schema: %s", exc)

        if cast_from_stripe and cast_from_stripe != cast_from_contribution:
            logger.info("Metadata update value found")
            return json.loads(cast_from_stripe.model_dump_json())
        logger.info("No metadata update value found")
        return {}

    def _handle_contribution_update(self, update_data: dict, revision_comment: str):
        """Update contribution with the given data and create a revision.

        Note that this method updates contribution.contribution_metadata in some cases.
        """
        if self.event_type != "charge.succeeded" and not self.contribution:
            raise Contribution.DoesNotExist("No contribution found")
        metadata = self.obj_data.get("metadata")
        if metadata and (
            update_value := self.get_metadata_update_value(
                contribution_metadata=self.contribution.contribution_metadata, stripe_metadata=metadata
            )
        ):
            update_data["contribution_metadata"] = update_value
        for k, v in update_data.items():
            setattr(self.contribution, k, v)
        with reversion.create_revision():
            self.contribution.save(update_fields={*update_data.keys(), "modified"})
            reversion.set_comment(revision_comment)

    def _add_pm_id_and_payment_method_details(self, pm_id: str, update_data: dict) -> dict:
        data = {**update_data}
        if pm_id:
            data["provider_payment_method_id"] = pm_id
            data["provider_payment_method_details"] = self.contribution.fetch_stripe_payment_method(pm_id)
        return data

    def _handle_pm_update_event(self, query: dict, pm_id: str, caller: str) -> None:
        logger.info("Updating contributions matching query %s with payment method data for id %s", query, pm_id)
        updated = 0
        # TODO @BW: Make this a .get() instead of .filter() once provider_payment_id is unique
        # DEV-5661
        details = stripe.PaymentMethod.retrieve(pm_id, stripe_account=self.event.account)
        for x in Contribution.objects.filter(**query).exclude(contribution_metadata__schema_version="1.6"):
            x.provider_payment_method_id = pm_id
            x.provider_payment_method_details = details
            with reversion.create_revision():
                x.save(update_fields={"provider_payment_method_id", "provider_payment_method_details", "modified"})
                updated += 1
                reversion.set_comment(f"Payment method data updated on behalf of {caller}")
        logger.info("Updated %s contributions with provider payment method ID", updated)

    @transaction.atomic
    def handle_payment_method_attached(self):
        """Handle payment method attached event.

        This event is triggered when a payment method is attached to a customer. We use this event to update
        the contribution provider_payment_method_id and provider_payment_method_details fields. This is specifically
        needed to ensure those values get captured in case of flagged-recurring contributions where the user completes
        the payment form. Attaching the PM to the contribution is what makes it ineligible for marking as abandoned.
        """
        logger.info("Handling payment method attached event for customer %s", self.customer_id)
        if self.customer_id:
            self._handle_pm_update_event(
                query={"provider_customer_id": self.customer_id},
                pm_id=self.obj_data["id"],
                caller="StripeWebhookProcessor.handle_payment_method_attached",
            )

    @transaction.atomic
    def handle_charge_succeeded(self):
        """Handle charge succeeded event.

        The specific need here is that in case of flagged one-time contributions, we need a hook that causes
        the provider payment method ID captured in Stripe payment form to be saved back to the contribution, as that allows
        for identification of abandoned cart instances (we infer that if after certain time period end up with contribution
        whose value for provider payment ID is null, it was abandoned).

        Specifically, we update the provider_payment_method_id and provider_payment_method_details fields.
        """
        logger.info("Handling charge succeeded event for payment intent %s", self.obj_data["payment_intent"])
        if pi_id := self.obj_data["payment_intent"]:
            # NB: The _handle_pm_update_event method tries to update any/all contributions that meet the query and does not assume
            # a single contribution. `provider_payment_id` used to be non-unique on contribution model, so we needed to potentially
            # update more than one contribution on handle_charge_succeeded events. `provider_payment_id` is now unique, but we still
            # use this method because it provides a generic way to update the provider_payment_method_id and provider_payment_method_details
            # fields, even though we'll only update at most one contribution here.
            self._handle_pm_update_event(
                query={"provider_payment_id": pi_id},
                pm_id=self.obj_data["payment_method"],
                caller="StripeWebhookProcessor.handle_charge_succeeded",
            )
        else:
            logger.warning(
                "No payment intent ID found in charge succeeded event with id %s for account %s",
                self.event_id,
                self.event.account,
            )

    def handle_payment_intent_canceled(self):
        self._handle_contribution_update(
            {
                "status": ContributionStatus.REJECTED if self.rejected else ContributionStatus.CANCELED,
            },
            "`StripeWebhookProcessor.handle_payment_intent_canceled` updated contribution",
        )

    def handle_payment_intent_failed(self):
        self._handle_contribution_update(
            {"status": ContributionStatus.FAILED},
            "`StripeWebhookProcessor.handle_payment_intent_failed` updated contribution",
        )

    def handle_payment_intent_succeeded(self):
        """Handle a payment intent succeeded event if it's for a one-time.

        If it's for a recurring contribution, we expect to handle that in the
        invoice.payment_succeeded event handler.

        This method does the following when payment intent is for a one-time contribution:

        - Update contribution with payment provider data, also update status
        - Create a payment instance
        - Send receipt email (if it's v1.4 metadata schema version)
        """
        if self.obj_data.get("invoice", None):
            logger.info(
                "Payment intent %s in event %s appears to be for a subscription, which are handled in different webhook receiver",
                self.id,
                self.event_id,
            )
            return
        with transaction.atomic():
            payment = Payment.from_stripe_payment_intent_succeeded_event(event=self.event)
            contribution_update_data = self._add_pm_id_and_payment_method_details(
                pm_id=self.obj_data["payment_method"],
                update_data={
                    "last_payment_date": payment.created,
                    "status": ContributionStatus.PAID,
                },
            )
            self._handle_contribution_update(
                contribution_update_data,
                "`StripeWebhookProcessor.handle_payment_intent_succeeded` updated contribution",
            )
            if (self.contribution.contribution_metadata or {}).get("schema_version") == "1.4":
                TransactionalEmailRecord.handle_receipt_email(
                    contribution=self.contribution, show_billing_history=False
                )

    def handle_subscription_updated(self):
        update_data = self._add_pm_id_and_payment_method_details(
            pm_id=self.obj_data["default_payment_method"],
            # TODO @BW: Send empty dict for update_data in StripeWebhookProcessor.handle_subscription_updated
            # DEV-5744
            update_data={"provider_subscription_id": self.id},
        )
        self._handle_contribution_update(
            update_data, "`StripeWebhookProcessor.handle_subscription_updated` updated contribution"
        )
        # If the payment method has changed, send an appropriate email. We need
        # to do a none check here because an update event also is emitted when
        # the initial contribution occurs. See
        # https://stripe.com/docs/api/events/object#event_object-data-previous_attributes

        if (
            isinstance(self.event.data["previous_attributes"], dict)
            and "default_payment_method" in self.event.data["previous_attributes"]
            and self.event.data["previous_attributes"]["default_payment_method"] is not None
        ):
            self.contribution.send_recurring_contribution_payment_updated_email()

    def handle_subscription_canceled(self):
        self._handle_contribution_update(
            {"status": ContributionStatus.CANCELED},
            "`StripeWebhookProcessor.handle_subscription_canceled` updated contribution",
        )
        self.contribution.send_recurring_contribution_canceled_email()

    def handle_invoice_upcoming(self):
        """When Stripe sends a webhook about an upcoming subscription charge, we send an email reminder.

        NB: You can configure how many days before a new charge this webhook should fire in the Stripe dashboard
        at https://dashboard.stripe.com/settings/billing/automatic under the `Upcoming renewal events` setting, which
        can be set to 3, 7, 15, 30, or 45 days.
        """
        if self.contribution.interval == ContributionInterval.YEARLY:
            logger.info(
                "StripeWebhookProcessor.process_invoice called for contribution %s which is yearly. Triggering a reminder email.",
                self.contribution.id,
            )
            self.contribution.send_recurring_contribution_email_reminder(
                make_aware(
                    datetime.datetime.fromtimestamp(  # noqa: DTZ006 make_aware handles tz
                        self.obj_data["next_payment_attempt"]
                    )
                ).date()
            )
        else:
            logger.debug(
                "StripeWebhookProcessor.process_invoice called for contribution %s which is not yearly. Noop.",
                self.contribution.id,
            )

    def handle_invoice_payment_succeeded(self):
        """Handle invoice payment succeeded event.

        - Create a payment
        - Update payment method data
        - Update contribution
        - If it's the first payment, and if it's v1.4 metadata, send a receipt email
        """
        with transaction.atomic():
            payment = Payment.from_stripe_invoice_payment_succeeded_event(event=self.event)
            pi = stripe.PaymentIntent.retrieve(
                self.obj_data["payment_intent"],
                stripe_account=self.event.account,
            )
            update_data = self._add_pm_id_and_payment_method_details(
                pm_id=pi.payment_method,
                update_data={
                    "last_payment_date": payment.created,
                    "status": ContributionStatus.PAID,
                },
            )
            self._handle_contribution_update(
                update_data,
                "`StripeWebhookProcessor.handle_invoice_payment_succeeded` updated contribution",
            )
        if (
            payment.contribution.payment_set.count() == 1
            and (payment.contribution.contribution_metadata or {}).get("schema_version") == "1.4"
        ):
            # TODO @BW: Publish event when receipt email is sent
            # DEV-5841
            TransactionalEmailRecord.handle_receipt_email(contribution=self.contribution, show_billing_history=False)
