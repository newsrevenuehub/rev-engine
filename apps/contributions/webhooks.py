import datetime
import logging
import operator
from dataclasses import dataclass
from functools import cached_property, reduce

from django.conf import settings
from django.db.models import Q
from django.utils.timezone import make_aware

import reversion

from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus
from apps.contributions.types import StripeEventData


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@dataclass
class StripeWebhookProcessor:
    event: StripeEventData

    def __post_init__(self):
        logger.info("Processing Stripe webhook event %s: %s - %s", self.event_id, self.event_type, self.id)

    @property
    def obj_data(self) -> dict:
        return self.event["data"]["object"]

    @property
    def object_type(self) -> str:
        return self.obj_data["object"]

    @property
    def event_id(self) -> str:
        return self.event["id"]

    @property
    def id(self) -> str:
        # This is the Stripe ID of the object in the event. While subscription and payment intent have an ID in the payload,
        # invoice.upcoming and payment_method.attached events do not, so we have to return None.
        return self.obj_data.get("id", None)

    @property
    def event_type(self) -> str:
        return self.event["type"]

    @property
    def live_mode(self) -> bool:
        return self.event["livemode"]

    @property
    def customer_id(self) -> str:
        return self.obj_data["customer"]

    @cached_property
    def contribution(self) -> Contribution:
        match self.object_type:
            case "subscription":
                return Contribution.objects.get(provider_subscription_id=self.id)
            case "payment_intent":
                conditions = [Q(provider_payment_id=self.id)]
                if self.customer_id:  # pragma: no branch
                    conditions.append(Q(provider_customer_id=self.customer_id))
                return Contribution.objects.get(reduce(operator.or_, conditions))
            case "payment_method":
                return Contribution.objects.get(provider_customer_id=self.customer_id)
            case "invoice":
                return Contribution.objects.get(provider_subscription_id=self.obj_data["subscription"])
            case _:
                raise Contribution.DoesNotExist("No contribution found for event")

    @property
    def rejected(self):
        # Not all Stripe entities in webhooks will have a cancellation_reason (for instance, invoice-related events do not).
        return self.obj_data.get("cancellation_reason", None) == "fraudulent"

    def route_request(self):
        logger.debug("Routing request for event type %s", self.event_type)
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
            case "payment_method.attached":
                return self.handle_payment_method_attached()
            case "invoice.upcoming":
                return self.handle_invoice_upcoming()
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
                self.event["account"],
            )
            return False
        if not settings.STRIPE_LIVE_MODE and self.live_mode:
            logger.debug(
                "Live mode event %s for account %s received while in test mode",
                self.event_id,
                self.event["account"],
            )
            return False
        return True

    def process(self):
        if not self.webhook_live_mode_agrees_with_environment:
            logger.warning("Received webhook in wrong mode; ignoring")
            return
        self.route_request()
        logger.info("Successfully processed webhook event %s", self.event_id)

    def _handle_contribution_update(self, update_data: dict, revision_comment: str):
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
        self._handle_contribution_update(
            {
                "payment_provider_data": self.event,
                "provider_payment_id": self.id,
                "provider_payment_method_id": self.obj_data.get("payment_method"),
                "provider_payment_method_details": self.contribution.fetch_stripe_payment_method(),
                "last_payment_date": datetime.datetime.fromtimestamp(
                    self.obj_data["created"], tz=datetime.timezone.utc
                ),
                "status": ContributionStatus.PAID,
            },
            "`StripeWebhookProcessor.handle_payment_intent_succeeded` updated contribution",
        )
        self.contribution.handle_thank_you_email()

    def handle_subscription_updated(self):
        # If stripe reports 'default_payment_method' as a previous attribute, then we've updated 'default_payment_method'
        update_data = {
            "payment_provider_data": self.event,
            "provider_subscription_id": self.id,
        }
        if (
            "default_payment_method" in self.event["data"]["previous_attributes"]
            and self.obj_data["default_payment_method"]
        ):
            update_data["provider_payment_method_id"] = self.obj_data["default_payment_method"]

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

    def handle_payment_method_attached(self):
        self._handle_contribution_update(
            {"provider_payment_method_id": self.id},
            "`StripeWebhookProcessor.process_payment_method_attached` updated contribution",
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
