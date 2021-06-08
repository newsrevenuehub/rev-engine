import logging
from datetime import datetime

import pytz

from apps.contributions.models import Contribution


logger = logging.getLogger(__name__)


class StripeWebhookProcessor:
    def __init__(self, event):
        self.event = event
        self.obj_data = self.event.data["object"]

    def payment_intent_is_subscription(self):
        """
        If it has a customer, it's a recurring payment.
        """
        return bool(self.obj_data.get("customer"))

    def get_contribution_from_event(self):
        if self.payment_intent_is_subscription():
            # Fetch recurring contributions by customer id. A unique Stripe Customer is created for every Subscription.
            return Contribution.objects.get(provider_customer_id=self.obj_data["customer"])
        return Contribution.objects.get(provider_payment_id=self.obj_data["id"])

    def process(self):
        logger.info(f'Processing Stripe Event of type "{self.event.type}"')
        object_type = self.obj_data["object"]

        if object_type == "payment_intent":
            self.process_payment_intent()
        else:
            logger.warn(f'Recieved un-handled Stripe object of type "{object_type}"')

    def process_payment_intent(self):
        if self.event.type == "payment_intent.canceled":
            self.handle_payment_intent_canceled()

        if self.event.type == "payment_intent.payment_failed":
            self.handle_payment_intent_failed()

        if self.event.type == "payment_intent.succeeded":
            self.handle_payment_intent_succeeded()

    # PaymentIntent processing
    def handle_payment_intent_canceled(self):
        contribution = self.get_contribution_from_event()
        if self._cancellation_was_rejection():
            contribution.status = Contribution.REJECTED[0]
            contribution.payment_provider_data = self.event
            logger.info(f"Contribution {contribution} rejected.")
        else:
            contribution.status = Contribution.CANCELED[0]
            contribution.payment_provider_data = self.event
            logger.info(f"Contribution {contribution} canceled.")

        contribution.save()
        logger.info(f"Contribution {contribution} canceled.")

    def handle_payment_intent_failed(self):
        contribution = self.get_contribution_from_event()
        contribution.status = Contribution.FAILED[0]
        contribution.payment_provider_data = self.event
        contribution.save()
        logger.info(f"Contribution {contribution} failed.")

    def handle_payment_intent_succeeded(self):
        contribution = self.get_contribution_from_event()
        contribution.payment_provider_data = self.event
        contribution.last_payment_date = datetime.fromtimestamp(self.obj_data["created"]).replace(tzinfo=pytz.UTC)
        contribution.status = Contribution.PAID[0]

        if self.payment_intent_is_subscription():
            # If it's a subscription, we should grab the payment_intent id from the event and store it as provider_payment_id
            contribution.provider_payment_id = self.obj_data["id"]

        contribution.save()
        logger.info(f"Contribution {contribution} succeeded.")

    def _cancellation_was_rejection(self):
        return self.obj_data.get("cancellation_reason") == "fraudulent"
