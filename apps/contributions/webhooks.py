import datetime
import logging
import operator
from dataclasses import dataclass
from functools import cached_property, reduce

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils.timezone import make_aware

import reversion
import stripe

from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Payment,
)
from apps.contributions.types import StripeEventData


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@dataclass
class StripeWebhookProcessor:
    event: StripeEventData

    def __post_init__(self):
        logger.info("Processing Stripe webhook event %s: %s - %s", self.event_id, self.event_type, self.id)

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

    @property
    def customer_id(self) -> str:
        return self.obj_data["customer"]

    @cached_property
    def contribution(self) -> Contribution | None:
        try:
            match self.object_type:
                case "subscription":
                    return Contribution.objects.get(provider_subscription_id=self.id)
                case "payment_intent":
                    conditions = [Q(provider_payment_id=self.id)]
                    if self.customer_id:  # pragma: no branch
                        conditions.append(Q(provider_customer_id=self.customer_id))
                    return Contribution.objects.get(reduce(operator.or_, conditions))
                case "invoice":
                    return Contribution.objects.get(provider_subscription_id=self.obj_data["subscription"])
                case "charge":
                    return Contribution.objects.get(provider_payment_id=self.obj_data["payment_intent"])
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
            case _:
                logger.warning(
                    "StripeWebhookProcessor.route_request received unexpected event type %s", self.event_type
                )
                return

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

    def process(self):
        if not self.webhook_live_mode_agrees_with_environment:
            logger.warning("Received webhook in wrong mode; ignoring")
            return
        if not self.contribution:
            raise Contribution.DoesNotExist("No contribution found")
        self.route_request()
        logger.info("Successfully processed webhook event %s", self.event_id)

    def _handle_contribution_update(self, update_data: dict, revision_comment: str):
        if not self.contribution:
            raise Contribution.DoesNotExist("No contribution found")
        for k, v in update_data.items():
            setattr(self.contribution, k, v)
        with reversion.create_revision():
            self.contribution.save(update_fields=set(list(update_data.keys()) + ["modified"]))
            reversion.set_comment(revision_comment)

    def handle_payment_intent_canceled(self):
        self._handle_contribution_update(
            {
                "status": ContributionStatus.REJECTED if self.rejected else ContributionStatus.CANCELED,
                "payment_provider_data": self.event,
            },
            "`StripeWebhookProcessor.handle_payment_intent_canceled` updated contribution",
        )

    def handle_payment_intent_failed(self):
        self._handle_contribution_update(
            {"status": ContributionStatus.FAILED, "payment_provider_data": self.event},
            "`StripeWebhookProcessor.handle_payment_intent_failed` updated contribution",
        )

    def handle_payment_intent_succeeded(self):
        """Handle a payment intent succeeded event if it's for a one time.

        If it's for a recurring contribution, we expect to handle that in the
        invoice.payment_succeeded event handler.

        This method does the following when payment intent is for a one time contribution:

        - Update contribution with payment provider data, also update status
        - Create a payment instance
        - Send thank you email
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
            contribution_update_data = {
                # TODO: [DEV-4295] Get rid of payment_provider_data as it's an inconistent reference to whichever event happened to cause creation
                "payment_provider_data": self.event,
                "provider_payment_method_id": self.obj_data.get("payment_method"),
                "provider_payment_method_details": self.contribution.fetch_stripe_payment_method(),
                "last_payment_date": payment.created,
                "status": ContributionStatus.PAID,
            }
            self._handle_contribution_update(
                contribution_update_data,
                "`StripeWebhookProcessor.handle_payment_intent_succeeded` updated contribution",
            )
            self.contribution.handle_thank_you_email()

    def handle_subscription_updated(self):
        update_data = {
            "payment_provider_data": self.event,
            "provider_subscription_id": self.id,
            "provider_payment_method_id": (pm_id := self.obj_data["default_payment_method"]),
            "provider_payment_method_details": self.contribution.fetch_stripe_payment_method(
                provider_payment_method_id=pm_id
            ),
        }
        self._handle_contribution_update(
            update_data, "`StripeWebhookProcessor.handle_subscription_updated` updated contribution"
        )

    def handle_subscription_canceled(self):
        self._handle_contribution_update(
            {
                "payment_provider_data": self.event,
                "status": ContributionStatus.CANCELED,
            },
            "`StripeWebhookProcessor.handle_subscription_canceled` updated contribution",
        )

    def handle_invoice_upcoming(self):
        """When Stripe sends a webhook about an upcoming subscription charge, we send an email reminder

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
                make_aware(datetime.datetime.fromtimestamp(self.obj_data["next_payment_attempt"])).date()
            )
        else:
            logger.debug(
                "StripeWebhookProcessor.process_invoice called for contribution %s which is not yearly. Noop.",
                self.contribution.id,
            )

    def handle_invoice_payment_succeeded(self):
        with transaction.atomic():
            payment = Payment.from_stripe_invoice_payment_succeeded_event(event=self.event)
            pi = stripe.PaymentIntent.retrieve(
                self.obj_data["payment_intent"],
                stripe_account=self.event.account,
            )
            self._handle_contribution_update(
                {
                    "last_payment_date": payment.created,
                    "status": ContributionStatus.PAID,
                    "payment_provider_data": self.event,
                    # TODO: Determine if we really want to update this from here and not from subscription updated only
                    "provider_payment_method_id": pi.payment_method,
                    "provider_payment_method_details": self.contribution.fetch_stripe_payment_method(),
                },
                "`StripeWebhookProcessor.handle_payment_intent_succeeded` updated contribution",
            )
        if payment.contribution.payment_set.count() == 1:
            self.contribution.handle_thank_you_email()
