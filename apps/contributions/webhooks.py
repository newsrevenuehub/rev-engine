import datetime
import logging

from django.conf import settings
from django.utils.timezone import make_aware

import reversion

from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class StripeWebhookProcessor:
    def __init__(self, event):
        logger.info("StripeWebhookProcessor initialized with event data: %s", event)
        self.event = event
        self.obj_data = self.event.data["object"]

    def get_contribution_from_event(self):
        logger.info("StripeWebhookProcessor.get_contribution_from_event called with event data: %s", self.event)
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
        logger.info('StripeWebhookProcessor.process processing Stripe Event of type "%s"', self.event.type)
        logger.debug(
            "StripeWebhookProcessor event received in live mode: %s; stripe live mode on: %s",
            self.event.livemode,
            settings.STRIPE_LIVE_MODE,
        )
        object_type = self.obj_data["object"]
        if settings.STRIPE_LIVE_MODE and not self.event.livemode:
            logger.debug(
                "StripeWebhookProcessor.process test mode event %s for account %s received while in live mode; ignoring",
                self.event.id,
                self.event.account,
            )
            return
        if not settings.STRIPE_LIVE_MODE and self.event.livemode:
            logger.debug(
                "StripeWebhookProcessor.process live mode event %s for account %s received while in test mode; ignoring",
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
        logger.info("StripeWebhookProcessor.process_payment_intent called")
        if self.event.type == "payment_intent.canceled":
            self.handle_payment_intent_canceled()

        if self.event.type == "payment_intent.payment_failed":
            self.handle_payment_intent_failed()

        if self.event.type == "payment_intent.succeeded":
            self.handle_payment_intent_succeeded()

    def handle_payment_intent_canceled(self):
        logger.info("StripeWebhookProcessor.handle_payment_intent_canceled called")
        contribution = self.get_contribution_from_event()
        if self._cancellation_was_rejection():
            contribution.status = ContributionStatus.REJECTED
            contribution.payment_provider_data = self.event
            logger.info("StripeWebhookProcessor.handle_payment_intent_canceled Contribution %s rejected.", contribution)
        else:
            contribution.status = ContributionStatus.CANCELED
            contribution.payment_provider_data = self.event
            logger.info("Contribution %s canceled.", contribution)
        with reversion.create_revision():
            contribution.save(update_fields={"status", "payment_provider_data", "modified"})
            logger.info("Contribution %s canceled.", contribution)
            reversion.set_comment(
                f"`StripeWebhookProcessor.handle_payment_intent_canceled` webhook handler ran for contribution with ID {contribution.id}"
            )

    def handle_payment_intent_failed(self):
        logger.info("StripeWebhookProcessor.handle_payment_intent_failed called")
        contribution = self.get_contribution_from_event()
        contribution.status = ContributionStatus.FAILED
        contribution.payment_provider_data = self.event
        with reversion.create_revision():
            contribution.save(update_fields={"status", "payment_provider_data", "modified"})
            logger.info("Contribution %s failed.", contribution)
            reversion.set_comment(
                f"StripeWebhookProcessor.handle_payment_intent_failed webhook handler updated payment provider data for contribution with ID {contribution.id}."
            )

    def handle_payment_intent_succeeded(self):
        logger.info("StripeWebhookProcessor.handle_payment_intent_succeeded called")
        contribution = self.get_contribution_from_event()
        contribution.payment_provider_data = self.event
        contribution.provider_payment_id = self.obj_data["id"]
        contribution.provider_payment_method_id = self.obj_data.get("payment_method")
        contribution.provider_payment_method_details = contribution.fetch_stripe_payment_method()
        contribution.last_payment_date = datetime.datetime.fromtimestamp(
            self.obj_data["created"], tz=datetime.timezone.utc
        )
        contribution.status = ContributionStatus.PAID
        with reversion.create_revision():
            contribution.save(
                update_fields={
                    "status",
                    "last_payment_date",
                    "provider_payment_id",
                    "provider_payment_method_id",
                    "provider_payment_method_details",
                    "payment_provider_data",
                    "modified",
                }
            )
            reversion.set_comment(
                f"StripeWebhookProcessor.handle_payment_intent_succeeded webhook handler updated contribution with ID {contribution.id}"
            )
        contribution.handle_thank_you_email()
        logger.info("StripeWebhookProcessor.handle_payment_intent_succeeded Contribution %s succeeded.", contribution)

    def _cancellation_was_rejection(self):
        return self.obj_data.get("cancellation_reason") == "fraudulent"

    # Subscription Processing
    def process_subscription(self):
        logger.info("StripeWebhookProcessor.process_subscription called")
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
        logger.info("StripeWebhookProcessor.handle_subscription_updated called")
        # If stripe reports 'default_payment_method' as a previous attribute, then we've updated 'default_payment_method'
        contribution = self.get_contribution_from_event()
        contribution.payment_provider_data = self.event
        contribution.provider_subscription_id = self.obj_data["id"]
        update_fields = {"modified", "payment_provider_data", "provider_subscription_id"}
        if (
            "default_payment_method" in self.event.data["previous_attributes"]
            and self.obj_data["default_payment_method"]
        ):
            contribution.provider_payment_method_id = self.obj_data["default_payment_method"]
            update_fields.add("provider_payment_method_id")
        with reversion.create_revision():
            contribution.save(update_fields=update_fields)
            reversion.set_comment(
                f"`StripeWebhookProcessor.handle_subscription_updated` webhook handler ran for contribution with ID {contribution.id}"
            )

    def handle_subscription_canceled(self):
        """
        Somebody has manually canceled this subscription.
        NOTE: Might be a good place to send a slack notification?
        """
        logger.info("StripeWebhookProcessor.handle_subscription_canceled Contribution canceled event")
        contribution = self.get_contribution_from_event()
        contribution.payment_provider_data = self.event
        contribution.status = ContributionStatus.CANCELED
        with reversion.create_revision():
            contribution.save(update_fields={"status", "payment_provider_data", "modified"})
            reversion.set_comment(
                f"`StripeWebhookProcessor.handle_subscription_canceled` webhook handler updated contribution with ID {contribution.id}"
            )

    def process_payment_method(self):
        logger.info("StripeWebhookProcessor.process_payment_method called")
        if self.event.type == "payment_method.attached":
            contribution = Contribution.objects.get(provider_customer_id=self.obj_data["customer"])
            contribution.provider_payment_method_id = self.obj_data["id"]
            with reversion.create_revision():
                reversion.set_comment(
                    f"StripeWebhookProcessor.process_payment_method webhook handler processed contribution with ID {contribution.id}"
                )
                contribution.save(update_fields={"provider_payment_method_id", "modified"})

    def process_invoice(self):
        """When Stripe sends a webhook about an upcoming subscription charge, we send an email reminder

        NB: You can configure how many days before a new charge this webhook should fire in the Stripe dashboard
        at https://dashboard.stripe.com/settings/billing/automatic under the `Upcoming renewal events` setting, which
        can be set to 3, 7, 15, 30, or 45 days.
        """
        logger.info("StripeWebhookProcessor.process_invoice called")
        if self.event.type != "invoice.upcoming":
            logger.info("StripeWebhookProcessor.process_invoice called with event %s which is a noop", self.event.type)
            return
        contribution = Contribution.objects.get(provider_subscription_id=self.obj_data["subscription"])
        if contribution.interval == ContributionInterval.YEARLY:
            logger.info(
                "StripeWebhookProcessor.process_invoice called for contribution %s which is yearly. Triggering a reminder email."
            )
            contribution.send_recurring_contribution_email_reminder(
                make_aware(datetime.datetime.fromtimestamp(self.obj_data["next_payment_attempt"])).date()
            )
        else:
            logger.info("StripeWebhookProcessor.process_invoice called for contribution %s which is not yearly. Noop.")
