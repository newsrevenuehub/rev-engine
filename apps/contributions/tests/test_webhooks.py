from datetime import datetime
from unittest.mock import patch

from django.conf import settings
from django.core import mail
from django.test import override_settings
from django.urls import reverse

from rest_framework.test import APIRequestFactory, APITestCase
from stripe.error import SignatureVerificationError
from stripe.stripe_object import StripeObject

from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.views import process_stripe_webhook_view
from apps.contributions.webhooks import StripeWebhookProcessor
from apps.organizations.tests.factories import OrganizationFactory


valid_secret = "myvalidstripesecret"
invalid_secret = "notavalidsecret"


class MockPaymentIntentEvent(StripeObject):
    id = 1
    # Something, somewhere down the line, needs this to be set just so...
    _transient_values = []

    def __init__(
        self, event_type=None, intent_id=None, object_type="payment_intent", cancellation_reason=None, customer=None
    ):
        self.type = event_type
        self.data = {
            "object": {
                "id": intent_id,
                "object": object_type,
                "cancellation_reason": cancellation_reason,
                "customer": customer,
                "created": datetime.now().timestamp(),
            }
        }


class MockSubscriptionEvent(StripeObject):
    id = 1
    # Something, somewhere down the line, needs this to be set just so...
    _transient_values = []

    def __init__(
        self,
        event_type=None,
        intent_id=None,
        new_payment_method="",
        previous_attributes={},
        object_type="subscription",
        cancellation_reason=None,
        customer=None,
    ):
        self.type = event_type
        self.data = {
            "object": {
                "id": intent_id,
                "object": object_type,
                "cancellation_reason": cancellation_reason,
                "customer": customer,
                "created": datetime.now().timestamp(),
                "default_payment_method": new_payment_method,
            },
            "previous_attributes": previous_attributes,
        }


def mock_valid_signature_verification_with_payment_intent(*args, **kwargs):
    return MockPaymentIntentEvent(event_type="payment_intent.canceled")


def mock_valid_signature_verification(*args, **kwargs):
    return MockPaymentIntentEvent(event_type="test")


def mock_invalid_signature_verification(*args, **kwargs):
    raise SignatureVerificationError("message", "sig_header")


def mock_valid_signature_bad_payload_verification(*args, **kwargs):
    raise ValueError()


@override_settings(STRIPE_WEBHOOK_SECRET=valid_secret)
class PaymentIntentWebhooksTest(APITestCase):
    def _create_contribution(self, ref_id=None):
        return Contribution.objects.create(
            provider_payment_id=ref_id, amount=1000, status=ContributionStatus.PROCESSING
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
        side_effect=mock_valid_signature_verification_with_payment_intent,
    )
    @patch("apps.contributions.views.logger")
    def test_webhook_view_invalid_contribution(self, mock_logger, *args):
        self._create_contribution(ref_id="abcd")
        self._run_webhook_view_with_request()
        mock_logger.error.assert_called_once_with("Could not find contribution matching provider_payment_id")

    def test_payment_intent_canceled_webhook(self):
        ref_id = "1234"
        contribution = self._create_contribution(ref_id=ref_id)
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(event_type="payment_intent.canceled", intent_id=ref_id)
        )
        processor.process()
        contribution.refresh_from_db()
        self.assertEqual(contribution.status, ContributionStatus.CANCELED)

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
        self.assertEqual(contribution.status, ContributionStatus.REJECTED)

    def test_payment_intent_payment_failed_webhook(self):
        ref_id = "1234"
        contribution = self._create_contribution(ref_id=ref_id)
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(event_type="payment_intent.payment_failed", intent_id=ref_id)
        )
        processor.process()
        contribution.refresh_from_db()
        self.assertEqual(contribution.status, ContributionStatus.FAILED)

    @patch("apps.contributions.models.SlackManager")
    def test_payment_intent_succeeded_webhook(self, mock):
        ref_id = "1234"
        contribution = self._create_contribution(ref_id=ref_id)
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(event_type="payment_intent.succeeded", intent_id=ref_id)
        )
        processor.process()
        contribution.refresh_from_db()
        self.assertEqual(contribution.status, ContributionStatus.PAID)

    def test_webhook_with_invalid_contribution_reference_id(self):
        self._create_contribution(ref_id="abcd")
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(event_type="payment_intent.succeeded", intent_id="1234")
        )
        self.assertRaises(Contribution.DoesNotExist, processor.process)

    @patch("apps.contributions.webhooks.logger")
    def test_unknown_event_logs_helpful_message(self, mock_logger):
        self._create_contribution(ref_id="abcd")
        fake_event_object = "criminal_activiy"
        processor = StripeWebhookProcessor(MockPaymentIntentEvent(object_type=fake_event_object, intent_id="1234"))
        processor.process()
        mock_logger.warning.assert_called_with(f'Recieved un-handled Stripe object of type "{fake_event_object}"')


class CustomerSubscriptionWebhooksTest(APITestCase):
    def _create_contribution(self, ref_id=None, **kwargs):
        org = OrganizationFactory(stripe_account_id="test")
        return Contribution.objects.create(
            provider_payment_id=ref_id, amount=1000, status=ContributionStatus.PROCESSING, **kwargs, organization=org
        )

    @patch("apps.contributions.webhooks.StripeWebhookProcessor.process_subscription")
    def test_process_subscription_handles_event(self, mock_process_subscription):
        processor = StripeWebhookProcessor(MockSubscriptionEvent(event_type="customer.subscription.updated"))
        processor.process()
        mock_process_subscription.assert_called_once()

    @patch("apps.contributions.webhooks.StripeWebhookProcessor.handle_subscription_updated")
    def test_handle_subscription_updated_handles_event(self, mock_handle_subscription_updated):
        processor = StripeWebhookProcessor(MockSubscriptionEvent(event_type="customer.subscription.updated"))
        processor.process()
        mock_handle_subscription_updated.assert_called_once()

    @patch("apps.contributions.webhooks.StripeWebhookProcessor.handle_subscription_canceled")
    def test_handle_subscription_canceled_handles_event(self, mock_handle_subscription_canceled):
        processor = StripeWebhookProcessor(MockSubscriptionEvent(event_type="customer.subscription.deleted"))
        processor.process()
        mock_handle_subscription_canceled.assert_called_once()

    @patch("stripe.PaymentMethod.retrieve", side_effect="{}")
    def test_updated_subscription_gets_updated(self, mock_fetch_pm):
        ref_id = "1234"
        previous_payment_method_id = "testing-previous-pm-id"
        new_payment_method = "testing-new-pm-id"
        contribution = self._create_contribution(ref_id=ref_id, provider_payment_method_id=previous_payment_method_id)
        processor = StripeWebhookProcessor(
            MockSubscriptionEvent(
                event_type="customer.subscription.updated",
                intent_id=ref_id,
                new_payment_method=new_payment_method,
                previous_attributes={"default_payment_method": previous_payment_method_id},
            )
        )
        processor.process()
        mock_fetch_pm.assert_called()
        contribution.refresh_from_db()
        self.assertEqual(contribution.provider_payment_method_id, new_payment_method)

    @patch("stripe.PaymentMethod.retrieve", side_effect="{}")
    def test_canceled_subscription_gets_updated(self, mock_fetch_pm):
        ref_id = "1234"
        contribution = self._create_contribution(ref_id=ref_id)
        self.assertNotEqual(contribution.status, ContributionStatus.CANCELED)
        processor = StripeWebhookProcessor(
            MockSubscriptionEvent(event_type="customer.subscription.deleted", intent_id=ref_id)
        )
        processor.process()
        mock_fetch_pm.assert_not_called()
        contribution.refresh_from_db()
        self.assertEqual(contribution.status, ContributionStatus.CANCELED)
