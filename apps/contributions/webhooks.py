import datetime
import logging

from django.conf import settings

from apps.contributions.models import Contribution, ContributionStatus
from apps.slack.models import SlackNotificationTypes


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
        object_type = self.obj_data["object"]

        if object_type == "payment_intent":
            self.process_payment_intent()
        elif object_type == "subscription":
            self.process_subscription()
        else:
            logger.warning('Recieved un-handled Stripe object of type "%s"', object_type)

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

        contribution.save()
        logger.info("Contribution %s canceled.", contribution)

    def handle_payment_intent_failed(self):
        contribution = self.get_contribution_from_event()
        contribution.status = ContributionStatus.FAILED
        contribution.payment_provider_data = self.event
        contribution.save()
        logger.info("Contribution %s failed.", contribution)

    def handle_payment_intent_succeeded(self):
        contribution = self.get_contribution_from_event()
        contribution.payment_provider_data = self.event
        contribution.last_payment_date = datetime.datetime.fromtimestamp(
            self.obj_data["created"], tz=datetime.timezone.utc
        )
        contribution.status = ContributionStatus.PAID

        # Grab the payment_intent id from the event and store it as provider_payment_id
        contribution.provider_payment_id = self.obj_data["id"]
        # Grab payment_method_id
        contribution.provider_payment_method_id = self.obj_data.get("payment_method")

        contribution.save(slack_notification=SlackNotificationTypes.SUCCESS)
        logger.info("Contribution %s succeeded.", contribution)

    def _cancellation_was_rejection(self):
        return self.obj_data.get("cancellation_reason") == "fraudulent"

    # Subscription Processing
    def process_subscription(self):
        if self.event.type == "customer.subscription.updated":
            self.handle_subscription_updated()

        if self.event.type == "customer.subscription.deleted":
            self.handle_subscription_canceled()

    def handle_subscription_updated(self):
        """
        It looks like Stripe gives us event.data.previous_attributes, which is a dict of updated attributes previous values.
        """
        contribution = self.get_contribution_from_event()
        contribution.payment_provider_data = self.obj_data
        contribution.provider_subscription_id = self.obj_data["id"]

        if "default_payment_method" in self.event.data["previous_attributes"]:
            # If stripe reports 'default_payment_method' as a previous attribute, then we've updated 'default_payment_method'
            contribution.provider_payment_method_id = self.obj_data["default_payment_method"]

        contribution.save()

    def handle_subscription_canceled(self):
        """
        Somebody has manually canceled this subscription.
        NOTE: Might be a good place to send a slack notification?
        """
        logger.info("Contribution canceled event")
        contribution = self.get_contribution_from_event()
        contribution.payment_provider_data = self.obj_data
        contribution.status = ContributionStatus.CANCELED
        contribution.save()
