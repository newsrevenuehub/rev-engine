from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse

from rest_framework.test import APIRequestFactory, APITestCase
from stripe.error import SignatureVerificationError
from stripe.stripe_object import StripeObject

from apps.contributions.models import Contribution
from apps.contributions.views import process_stripe_webhook_view
from apps.contributions.webhooks import StripeWebhookProcessor


valid_secret = "myvalidstripesecret"
invalid_secret = "notavalidsecret"


class MockPaymentIntentEvent(StripeObject):
    id = 1
    # Something, somewhere down the line, needs this to be set just so...
    _transient_values = []

    def __init__(self, event_type=None, intent_id=None, object_type="payment_intent", cancellation_reason=None):
        self.type = event_type
        self.data = {"object": {"id": intent_id, "object": object_type, "cancellation_reason": cancellation_reason}}


def mock_valid_signature_verification_with_valid_event(*args, **kwargs):
    return MockPaymentIntentEvent(event_type="payment_intent.canceled")


def mock_valid_signature_verification(*args, **kwargs):
    return MockPaymentIntentEvent(event_type="test")


def mock_invalid_signature_verification(*args, **kwargs):
    raise SignatureVerificationError("message", "sig_header")


def mock_valid_signature_bad_payload_verification(*args, **kwargs):
    raise ValueError()


@override_settings(STRIPE_WEBHOOK_SECRET=valid_secret)
class StripeWebhooksTest(APITestCase):
    def _create_contribution(self, ref_id=None):
        return Contribution.objects.create(
            provider_reference_id=ref_id, amount=1000, payment_state=Contribution.PROCESSING[0]
        )

    def _run_webhook_view_with_request(self):
        request = APIRequestFactory().post(reverse("stripe-webhooks"))
        request.META["HTTP_STRIPE_SIGNATURE"] = "testing"
        return process_stripe_webhook_view(request)

    @patch("stripe.Webhook.construct_event", side_effect=mock_valid_signature_verification)
    def test_valid_webhook_signature_proceeds(self, *args):
        response = self._run_webhook_view_with_request()
        self.assertEqual(response.status_code, 200)

    @patch("stripe.Webhook.construct_event", side_effect=mock_invalid_signature_verification)
    def test_invalid_webhook_signature_response(self, *args):
        response = self._run_webhook_view_with_request()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid signature")

    @patch("stripe.Webhook.construct_event", side_effect=mock_valid_signature_bad_payload_verification)
    def test_malformed_webhook_body_response(self, *args):
        response = self._run_webhook_view_with_request()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid payload")

    @patch(
        "stripe.Webhook.construct_event",
        side_effect=mock_valid_signature_verification_with_valid_event,
    )
    def test_webhook_view_invalid_contribution(self, *args):
        self._create_contribution(ref_id="abcd")
        response = self._run_webhook_view_with_request()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid payment_intent_id")

    def test_payment_intent_canceled_webhook(self):
        ref_id = "1234"
        contribution = self._create_contribution(ref_id=ref_id)
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(event_type="payment_intent.canceled", intent_id=ref_id)
        )
        processor.process()
        contribution.refresh_from_db()
        self.assertEqual(contribution.payment_state, Contribution.CANCELED[0])

    def test_payment_intent_fraudulent(self):
        ref_id = "1234"
        contribution = self._create_contribution(ref_id=ref_id)
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(
                event_type="payment_intent.canceled", intent_id=ref_id, cancellation_reason="fraudulent"
            )
        )
        processor.process()
        contribution.refresh_from_db()
        self.assertEqual(contribution.payment_state, Contribution.REJECTED[0])

    def test_payment_intent_payment_failed_webhook(self):
        ref_id = "1234"
        contribution = self._create_contribution(ref_id=ref_id)
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(event_type="payment_intent.payment_failed", intent_id=ref_id)
        )
        processor.process()
        contribution.refresh_from_db()
        self.assertEqual(contribution.payment_state, Contribution.FAILED[0])

    def test_payment_intent_succeeded_webhook(self):
        ref_id = "1234"
        contribution = self._create_contribution(ref_id=ref_id)
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(event_type="payment_intent.succeeded", intent_id=ref_id)
        )
        processor.process()
        contribution.refresh_from_db()
        self.assertEqual(contribution.payment_state, Contribution.PAID[0])

    def test_webhook_with_invalid_contribution_reference_id(self):
        self._create_contribution(ref_id="abcd")
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(event_type="payment_intent.succeeded", intent_id="1234")
        )
        self.assertRaises(Contribution.DoesNotExist, processor.process)

    @patch("apps.contributions.webhooks.logger.warn")
    def test_unknown_event_logs_helpful_message(self, mock_logger):
        self._create_contribution(ref_id="abcd")
        fake_event_object = "criminal_activiy"
        processor = StripeWebhookProcessor(MockPaymentIntentEvent(object_type=fake_event_object, intent_id="1234"))
        processor.process()
        mock_logger.assert_called_with(f'Recieved un-handled Stripe object of type "{fake_event_object}"')
