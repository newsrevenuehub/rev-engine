import logging

from django.conf import settings

from apps.contributions.models import Contribution


logger = logging.getLogger(__name__)


class StripeWebhookProcessor:
    def __init__(self, event):
        if event.type not in settings.STRIPE_WEBHOOK_EVENTS:
            raise ValueError(f"Stripe Webhook event '{event.type}' is not supported.")
        self.event = event
        self.obj_data = self.event.data["object"]

    def get_contribution_by_reference_id(self):
        try:
            return Contribution.objects.get(provider_reference_id=self.obj_data["id"])
        except Contribution.DoesNotExist as e:
            logger.error(
                f"Stripe webhook event recieved with object reference id '{self.obj_data['id']}', but no Contribution could be found by that reference"
            )

    def process(self):
        object_type = self.obj_data["object"]

        if object_type == "payment_intent":
            self.process_payment_intent()

    def process_payment_intent(self):
        if self.event.type == "payment_intent.canceled":
            self.handle_payment_intent_canceled()

        if self.event.type == "payment_intent.payment_failed":
            self.handle_payment_intent_failed()

        if self.event.type == "payment_intent.succeeded":
            self.handle_payment_intent_succeeded()

    def handle_payment_intent_canceled(self):
        contribution = self.get_contribution_by_reference_id()
        contribution.payment_state = Contribution.CANCELED[0]
        contribution.payment_provider_data = self.event
        contribution.save()

    def handle_payment_intent_failed(self):
        contribution = self.get_contribution_by_reference_id()
        contribution.payment_state = Contribution.FAILED[0]
        contribution.payment_provider_data = self.event
        contribution.save()

    def handle_payment_intent_succeeded(self):
        contribution = self.get_contribution_by_reference_id()
        contribution.payment_state = Contribution.PAID[0]
        contribution.payment_provider_data = self.event
        contribution.save()
