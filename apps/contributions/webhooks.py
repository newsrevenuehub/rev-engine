import datetime
import logging

from django.conf import settings
from django.utils.timezone import make_aware

from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class StripeWebhookProcessor:
    def __init__(self, event):
        logger.info("StripeWebhookProcessor initialized with event data: %s", event)
        self.event = event
        self.obj_data = self.event.data["object"]

    def get_contribution_from_event(self):
        if (event_type := self.obj_data["object"]) == "subscription":
            # TODO: [DEV-2467] this will generate lots of spurious errors for events from Stripe that we don't care about. See ticket.
            return Contribution.objects.get(provider_subscription_id=self.obj_data["id"])
        elif event_type == "payment_intent":
            try:
                return Contribution.objects.get(provider_payment_id=self.obj_data["id"])
            except Contribution.DoesNotExist:
                if customer_id := self.obj_data.get("customer"):
                    # This is fine as long as we continue to generate a unique customer per charge.
                    return Contribution.objects.get(provider_customer_id=customer_id)
                else:
                    raise

    def process(self):
        logger.info('Processing Stripe Event of type "%s"', self.event.type)
        logger.debug(
            "Event received in live mode: %s; stripe live mode on: %s", self.event.livemode, settings.STRIPE_LIVE_MODE
        )
        object_type = self.obj_data["object"]
        if settings.STRIPE_LIVE_MODE and not self.event.livemode:
            logger.info(
                "test mode event %s for account %s received while in live mode; ignoring",
                self.event.id,
                self.event.account,
            )
            return
        if not settings.STRIPE_LIVE_MODE and self.event.livemode:
            logger.info(
                "live mode event %s for account %s received while in test mode; ignoring",
                self.event.id,
                self.event.account,
            )
            return

        if object_type == "payment_intent":
            self.process_payment_intent()
        elif object_type == "subscription":
            self.process_subscription()
        elif object_type == "payment_method":
            self.process_payment_method()
        elif object_type == "invoice":
            self.process_invoice()
        else:
            logger.warning('Received un-handled Stripe object of type "%s"', object_type)

    # PaymentIntent processing
    def process_payment_intent(self):
        if self.event.type == "payment_intent.canceled":
            self.handle_payment_intent_canceled()

        if self.event.type == "payment_intent.payment_failed":
            self.handle_payment_intent_failed()

        if self.event.type == "payment_intent.succeeded":
            self.handle_payment_intent_succeeded()

    def handle_payment_intent_canceled(self):
        contribution = self.get_contribution_from_event()
        if self._cancellation_was_rejection():
            contribution.status = ContributionStatus.REJECTED
            contribution.payment_provider_data = self.event
            logger.info("Contribution %s rejected.", contribution)
        else:
            contribution.status = ContributionStatus.CANCELED
            contribution.payment_provider_data = self.event
            logger.info("Contribution %s canceled.", contribution)

        contribution.save(update_fields=["status", "payment_provider_data", "modified"])
        logger.info("Contribution %s canceled.", contribution)

    def handle_payment_intent_failed(self):
        contribution = self.get_contribution_from_event()
        contribution.status = ContributionStatus.FAILED
        contribution.payment_provider_data = self.event
        contribution.save(update_fields=["status", "payment_provider_data", "modified"])
        logger.info("Contribution %s failed.", contribution)

    def handle_payment_intent_succeeded(self):
        contribution = self.get_contribution_from_event()
        if contribution.interval == ContributionInterval.ONE_TIME:
            self.handle_payment_intent_succeeded_for_one_time(contribution)
        else:
            self.handle_payment_intent_succeeded_for_subscription(contribution)

    def handle_payment_intent_succeeded_for_subscription(self, contribution: Contribution) -> None:
        contribution.last_payment_date = datetime.datetime.fromtimestamp(
            self.obj_data["created"], tz=datetime.timezone.utc
        )
        update_fields = ["modified", "last_payment_date"]
        # if its status is paid, we can deduce that this is not the first charge for the subscription
        if contribution.status == ContributionStatus.PAID:
            logger.info(
                (
                    "`StripeWebhookProcessor.handle_payment_intent_succeded_for_subscription` "
                    "was called for contribution (ID: %s) that has already had a successful payment."
                ),
                contribution.id,
            )
            contribution.last_payment_date = datetime.datetime.fromtimestamp(
                self.obj_data["created"], tz=datetime.timezone.utc
            )
            contribution.save(update_fields=update_fields)
            return
        else:
            logger.info(
                (
                    "`StripeWebhookProcessor.handle_payment_intent_succeded_for_subscription` "
                    "was called for contribution (ID: %s) whose status is not paid but is %s."
                ),
                contribution.id,
                contribution.status,
            )
            contribution.payment_provider_data = self.event
            contribution.provider_payment_id = self.obj_data["id"]
            contribution.provider_payment_method_id = self.obj_data.get("payment_method")
            contribution.last_payment_date = datetime.datetime.fromtimestamp(
                self.obj_data["created"], tz=datetime.timezone.utc
            )
            contribution.status = ContributionStatus.PAID
            update_fields.extend(
                [
                    "status",
                    "provider_payment_id",
                    "provider_payment_method_id",
                    "payment_provider_data",
                ]
            )
            contribution.handle_thank_you_email()
            contribution.save(update_fields=update_fields)

    def handle_payment_intent_succeeded_for_one_time(self, contribution: Contribution) -> None:
        contribution.payment_provider_data = self.event
        contribution.provider_payment_id = self.obj_data["id"]
        contribution.provider_payment_method_id = self.obj_data.get("payment_method")
        contribution.last_payment_date = datetime.datetime.fromtimestamp(
            self.obj_data["created"], tz=datetime.timezone.utc
        )
        contribution.status = ContributionStatus.PAID
        contribution.save(
            update_fields=[
                "status",
                "last_payment_date",
                "provider_payment_id",
                "provider_payment_method_id",
                "payment_provider_data",
                "modified",
            ]
        )
        contribution.handle_thank_you_email()
        logger.info("Contribution %s succeeded.", contribution)

    def _cancellation_was_rejection(self):
        return self.obj_data.get("cancellation_reason") == "fraudulent"

    # Subscription Processing
    def process_subscription(self):
        if self.event.type == "customer.subscription.updated":
            self.handle_subscription_updated()
        elif self.event.type == "customer.subscription.deleted":
            self.handle_subscription_canceled()
        else:
            logger.warning(
                "`StripeWebhookProcessor.process_subscription` called with unexpected event type: %s", self.event.type
            )

    def handle_subscription_updated(self):
        """
        It looks like Stripe gives us event.data.previous_attributes, which is a dict of updated attributes previous values.
        """
        # If stripe reports 'default_payment_method' as a previous attribute, then we've updated 'default_payment_method'
        contribution = self.get_contribution_from_event()
        contribution.payment_provider_data = self.event
        contribution.provider_subscription_id = self.obj_data["id"]
        update_fields = ["modified", "payment_provider_data", "provider_subscription_id"]
        if "default_payment_method" in self.event.data["previous_attributes"]:
            contribution.provider_payment_method_id = self.obj_data["default_payment_method"]
            update_fields.append("provider_payment_method_id")
        contribution.save(update_fields=update_fields)

    def handle_subscription_canceled(self):
        """
        Somebody has manually canceled this subscription.
        NOTE: Might be a good place to send a slack notification?
        """
        logger.info("Contribution canceled event")
        contribution = self.get_contribution_from_event()
        contribution.payment_provider_data = self.event
        contribution.status = ContributionStatus.CANCELED
        contribution.save(update_fields=["status", "payment_provider_data", "modified"])

    def process_payment_method(self):
        logger.info("`process_payment_method` called")
        if self.event.type == "payment_method.attached":
            contribution = Contribution.objects.get(provider_customer_id=self.obj_data["customer"])
            contribution.provider_payment_method_id = self.obj_data["id"]
            contribution.save(update_fields=["provider_payment_method_id", "modified"])

    def process_invoice(self):
        """When Stripe sends a webhook about an upcoming subscription charge, we send an email reminder

        NB: You can configure how many days before a new charge this webhook should fire in the Stripe dashboard
        at https://dashboard.stripe.com/settings/billing/automatic under the `Upcoming renewal events` setting, which
        can be set to 3, 7, 15, 30, or 45 days.
        """
        logger.info("`StripeWebhookProcessor.process_upcoming_invoice`")
        if self.event.type != "invoice.upcoming":
            return
        contribution = Contribution.objects.get(provider_subscription_id=self.obj_data["subscription"])
        if contribution.interval == ContributionInterval.YEARLY:
            contribution.send_recurring_contribution_email_reminder(
                make_aware(datetime.datetime.fromtimestamp(self.obj_data["next_payment_attempt"])).date()
            )
