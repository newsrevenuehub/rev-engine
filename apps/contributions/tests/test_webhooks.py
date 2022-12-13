from datetime import datetime
from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse

from rest_framework.test import APIRequestFactory, APITestCase
from stripe.error import SignatureVerificationError
from stripe.stripe_object import StripeObject

from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.views import process_stripe_webhook_view
from apps.contributions.webhooks import StripeWebhookProcessor
from apps.organizations.tests.factories import (
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
from apps.pages.tests.factories import DonationPageFactory


valid_secret = "myvalidstripesecret"
invalid_secret = "notavalidsecret"


class MockPaymentIntentEvent(StripeObject):
    id = 1
    # Something, somewhere down the line, needs this to be set just so...
    _transient_values = []

    def __init__(
        self,
        event_type=None,
        intent_id=None,
        object_type="payment_intent",
        cancellation_reason=None,
        customer=None,
        livemode=False,
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
        self.livemode = livemode
        self.account = "acct_test_1234"


class MockSubscriptionEvent(StripeObject):
    id = 1
    # Something, somewhere down the line, needs this to be set just so...
    _transient_values = []

    def __init__(
        self,
        event_type=None,
        subscription_id=None,
        new_payment_method="",
        previous_attributes={},
        object_type="subscription",
        cancellation_reason=None,
        customer=None,
        livemode=False,
    ):
        self.type = event_type
        self.data = {
            "object": {
                "id": subscription_id,
                "object": object_type,
                "cancellation_reason": cancellation_reason,
                "customer": customer,
                "created": datetime.now().timestamp(),
                "default_payment_method": new_payment_method,
            },
            "previous_attributes": previous_attributes,
        }
        self.livemode = livemode
        self.account = "acct_1234"


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
    def _create_contribution(self, payment_intent_id=None):
        return Contribution.objects.create(
            provider_payment_id=payment_intent_id, amount=1000, status=ContributionStatus.PROCESSING
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
        self._create_contribution(payment_intent_id="abcd")
        self._run_webhook_view_with_request()
        self.assertEqual(
            "Could not find contribution matching provider_payment_id", mock_logger.exception.call_args[0][0]
        )

    def test_payment_intent_canceled_webhook(self):
        payment_intent_id = "1234"
        contribution = self._create_contribution(payment_intent_id=payment_intent_id)
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(event_type="payment_intent.canceled", intent_id=payment_intent_id)
        )
        processor.process()
        contribution.refresh_from_db()
        self.assertEqual(contribution.status, ContributionStatus.CANCELED)

    def test_payment_intent_fraudulent(self):
        payment_intent_id = "1234"
        contribution = self._create_contribution(payment_intent_id=payment_intent_id)
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(
                event_type="payment_intent.canceled", intent_id=payment_intent_id, cancellation_reason="fraudulent"
            )
        )
        processor.process()
        contribution.refresh_from_db()
        self.assertEqual(contribution.status, ContributionStatus.REJECTED)

    def test_payment_intent_payment_failed_webhook(self):
        payment_intent_id = "1234"
        contribution = self._create_contribution(payment_intent_id=payment_intent_id)
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(event_type="payment_intent.payment_failed", intent_id=payment_intent_id)
        )
        processor.process()
        contribution.refresh_from_db()
        self.assertEqual(contribution.status, ContributionStatus.FAILED)

    def test_webhook_with_invalid_contribution_payment_intent_id(self):
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(event_type="payment_intent.succeeded", intent_id="no-id-like-this-exists")
        )
        self.assertRaises(Contribution.DoesNotExist, processor.process)

    @patch("apps.contributions.webhooks.logger")
    def test_unknown_event_logs_helpful_message(self, mock_logger):
        payment_intent_id = "abcd"
        self._create_contribution(payment_intent_id=payment_intent_id)
        fake_event_object = "criminal_activiy"
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(object_type=fake_event_object, intent_id=payment_intent_id)
        )
        processor.process()
        self.assertIn("Received un-handled Stripe object of type", mock_logger.warning.call_args[0][0])
        self.assertEqual(mock_logger.warning.call_args[0][1], fake_event_object)

    @patch("apps.contributions.webhooks.settings.STRIPE_LIVE_MODE", True)
    @patch("apps.contributions.webhooks.logger")
    @patch("apps.contributions.webhooks.StripeWebhookProcessor.process_payment_intent")
    @patch("apps.contributions.webhooks.StripeWebhookProcessor.process_subscription")
    def test_will_not_process_test_event_in_live_mode(self, mock_process_pi, mock_process_sub, mock_logger):
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(object_type="unimportant", intent_id="ignore", livemode=False)
        )
        processor.process()
        assert "ignoring" in mock_logger.info.call_args[0][0]
        assert not mock_process_pi.called
        assert not mock_process_sub.called

    @patch("apps.contributions.webhooks.logger")
    @patch("apps.contributions.webhooks.StripeWebhookProcessor.process_payment_intent")
    @patch("apps.contributions.webhooks.StripeWebhookProcessor.process_subscription")
    def test_will_not_process_live_event_in_test_mode(self, mock_process_pi, mock_process_sub, mock_logger):
        processor = StripeWebhookProcessor(
            MockPaymentIntentEvent(object_type="payment_intent.succeeded", intent_id="ignore", livemode=True)
        )
        processor.process()
        assert "ignoring" in mock_logger.info.call_args[0][0]
        assert not mock_process_pi.called
        assert not mock_process_sub.called


class CustomerSubscriptionWebhooksTest(APITestCase):
    def _create_contribution(self, provider_subscription_id=None, **kwargs):
        org = OrganizationFactory()
        payment_provider = PaymentProviderFactory(stripe_account_id="test")
        revenue_program = RevenueProgramFactory(payment_provider=payment_provider, organization=org)
        return Contribution.objects.create(
            provider_subscription_id=provider_subscription_id,
            amount=1000,
            status=ContributionStatus.PROCESSING,
            donation_page=DonationPageFactory(revenue_program=revenue_program),
            **kwargs,
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
        provider_subscription_id = "1234"
        previous_payment_method_id = "testing-previous-pm-id"
        new_payment_method = "testing-new-pm-id"
        contribution = self._create_contribution(
            provider_subscription_id=provider_subscription_id, provider_payment_method_id=previous_payment_method_id
        )
        processor = StripeWebhookProcessor(
            MockSubscriptionEvent(
                event_type="customer.subscription.updated",
                subscription_id=provider_subscription_id,
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
        subscription_id = "1234"
        contribution = self._create_contribution(provider_subscription_id=subscription_id)
        self.assertNotEqual(contribution.status, ContributionStatus.CANCELED)
        processor = StripeWebhookProcessor(
            MockSubscriptionEvent(event_type="customer.subscription.deleted", subscription_id=subscription_id)
        )
        processor.process()
        mock_fetch_pm.assert_not_called()
        contribution.refresh_from_db()
        self.assertEqual(contribution.status, ContributionStatus.CANCELED)
