import logging

from apps.contributions.models import Contribution


logger = logging.getLogger(__name__)


class StripeWebhookProcessor:
    def __init__(self, event):
        self.event = event
        self.obj_data = self.event.data["object"]

    def get_contribution_by_reference_id(self):
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

    def handle_payment_intent_canceled(self):
        contribution = self.get_contribution_by_reference_id()
        if self._cancellation_was_rejection():
            contribution.payment_state = Contribution.REJECTED[0]
            contribution.payment_provider_data = self.event
            logger.info(f"Contribution id: {contribution} rejected.")
        else:
            contribution.payment_state = Contribution.CANCELED[0]
            contribution.payment_provider_data = self.event
            logger.info(f"Contribution id: {contribution} canceled.")

        contribution.save()
        logger.info(f"Contribution id: {contribution} cancelled.")

    def handle_payment_intent_failed(self):
        contribution = self.get_contribution_by_reference_id()
        contribution.payment_state = Contribution.FAILED[0]
        contribution.payment_provider_data = self.event
        contribution.save()
        logger.info(f"Contribution id: {contribution} failed.")

    def handle_payment_intent_succeeded(self):
        contribution = self.get_contribution_by_reference_id()
        contribution.payment_state = Contribution.PAID[0]
        contribution.payment_provider_data = self.event
        contribution.save()
        logger.info(f"Contribution id: {contribution} succeeded.")

    def _cancellation_was_rejection(self):
        return self.obj_data["cancellation_reason"] == "fraudulent"
