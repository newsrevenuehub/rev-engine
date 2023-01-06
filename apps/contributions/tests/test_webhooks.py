# import json
# from datetime import datetime
# from unittest.mock import Mock, patch

# from django.urls import reverse
# from django.utils.timezone import make_aware

# import pytest
# from rest_framework import status
# from stripe.webhook import WebhookSignature

# from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus
# from apps.contributions.tests.factories import ContributionFactory
# from apps.contributions.webhooks import StripeWebhookProcessor


# @pytest.fixture
# def payment_intent_canceled():
#     with open("apps/contributions/tests/fixtures/payment-intent-canceled-webhook.json") as fl:
#         return json.load(fl)


# @pytest.fixture
# def payment_intent_succeeded():
#     with open("apps/contributions/tests/fixtures/payment-intent-succeeded-webhook.json") as fl:
#         return json.load(fl)


# @pytest.fixture
# def payment_intent_payment_failed():
#     with open("apps/contributions/tests/fixtures/payment-intent-payment-failed-webhook.json") as fl:
#         return json.load(fl)


# @pytest.fixture
# def payment_method_attached():
#     with open("apps/contributions/tests/fixtures/payment-method-attached-webhook.json") as fl:
#         return json.load(fl)


# @pytest.fixture
# def customer_subscription_updated():
#     with open("apps/contributions/tests/fixtures/customer-subscription-updated-webhook.json") as fl:
#         return json.load(fl)


# @pytest.fixture
# def customer_subscription_deleted():
#     with open("apps/contributions/tests/fixtures/customer-subscription-deleted-webhook.json") as fl:
#         return json.load(fl)


# @pytest.fixture
# def invoice_upcoming():
#     with open("apps/contributions/tests/fixtures/stripe-invoice-upcoming.json") as fl:
#         return json.load(fl)


# <<<<<<< HEAD
# @override_settings(STRIPE_WEBHOOK_SECRET=valid_secret)
# class PaymentIntentWebhooksTest(APITestCase):
#     def _create_contribution(self, payment_intent_id=None):
#         with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
#             return ContributionFactory(
#                 provider_payment_id=payment_intent_id, amount=1000, status=ContributionStatus.PROCESSING
#             )
# =======
# @pytest.mark.django_db
# class TestPaymentIntentSucceeded:
#     def test_when_contribution_found(self, payment_intent_succeeded, monkeypatch, client):
#         monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#         header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#         with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
#             contribution = ContributionFactory(
#                 one_time=True,
#                 status=ContributionStatus.PROCESSING,
#                 last_payment_date=None,
#                 payment_provider_data=None,
#                 provider_payment_id=payment_intent_succeeded["data"]["object"]["id"],
#             )
#             response = client.post(reverse("stripe-webhooks"), data=payment_intent_succeeded, **header)
#         assert response.status_code == status.HTTP_200_OK
#         contribution.refresh_from_db()
#         assert contribution.payment_provider_data == payment_intent_succeeded
#         assert contribution.provider_payment_id == payment_intent_succeeded["data"]["object"]["id"]
#         assert contribution.last_payment_date is not None
#         assert contribution.status == ContributionStatus.PAID

#     def test_when_contribution_not_found(self, payment_intent_succeeded, monkeypatch, client):
#         monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#         mock_log_exception = Mock()
#         monkeypatch.setattr("apps.contributions.views.logger.exception", mock_log_exception)
#         header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#         assert not Contribution.objects.filter(
#             provider_payment_id=payment_intent_succeeded["data"]["object"]["id"]
#         ).exists()
#         response = client.post(reverse("stripe-webhooks"), data=payment_intent_succeeded, **header)
#         assert response.status_code == status.HTTP_200_OK
#         mock_log_exception.assert_called_once_with("Could not find contribution matching provider_payment_id")


# @pytest.mark.django_db
# class TestPaymentIntentCanceled:
#     @pytest.mark.parametrize("cancellation_reason", (None, "", "random-thing", "fraudulent"))
#     def test_when_contribution_found(self, cancellation_reason, monkeypatch, client, payment_intent_canceled):
#         monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#         header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#         with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
#             contribution = ContributionFactory(
#                 one_time=True,
#                 status=ContributionStatus.PROCESSING,
#                 provider_payment_id=payment_intent_canceled["data"]["object"]["id"],
#             )
#             payment_intent_canceled["data"]["object"]["cancellation_reason"] = cancellation_reason
#             response = client.post(reverse("stripe-webhooks"), data=payment_intent_canceled, **header)
#         assert response.status_code == status.HTTP_200_OK
#         contribution.refresh_from_db()
#         assert contribution.payment_provider_data == payment_intent_canceled
#         assert (
#             contribution.status == ContributionStatus.REJECTED
#             if cancellation_reason == "fraudulent"
#             else ContributionStatus.CANCELED
#         )
# >>>>>>> DEV-2342-split-bad-actors-into-3-buckets-not-just-2-for-nre

#     def test_when_contribution_not_found(self, monkeypatch, client, payment_intent_canceled):
#         monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#         mock_log_exception = Mock()
#         monkeypatch.setattr("apps.contributions.views.logger.exception", mock_log_exception)
#         header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#         assert not Contribution.objects.filter(
#             provider_payment_id=payment_intent_canceled["data"]["object"]["id"]
#         ).exists()
#         response = client.post(reverse("stripe-webhooks"), data=payment_intent_canceled, **header)
#         assert response.status_code == status.HTTP_200_OK
#         mock_log_exception.assert_called_once_with("Could not find contribution matching provider_payment_id")


# @pytest.mark.django_db
# class TestPaymentIntentPaymentFailed:
#     def test_when_contribution_found(self, monkeypatch, client, payment_intent_payment_failed):
#         monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#         header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#         with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
#             contribution = ContributionFactory(
#                 one_time=True,
#                 status=ContributionStatus.PROCESSING,
#                 provider_payment_id=payment_intent_payment_failed["data"]["object"]["id"],
#             )
#             response = client.post(reverse("stripe-webhooks"), data=payment_intent_payment_failed, **header)
#         assert response.status_code == status.HTTP_200_OK
#         contribution.refresh_from_db()
#         assert contribution.payment_provider_data == payment_intent_payment_failed
#         assert contribution.status == ContributionStatus.FAILED

#     def test_when_contribution_not_found(self, monkeypatch, client, payment_intent_payment_failed):
#         monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#         mock_log_exception = Mock()
#         monkeypatch.setattr("apps.contributions.views.logger.exception", mock_log_exception)
#         header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#         assert not Contribution.objects.filter(
#             provider_payment_id=payment_intent_payment_failed["data"]["object"]["id"]
#         ).exists()
#         response = client.post(reverse("stripe-webhooks"), data=payment_intent_payment_failed, **header)
#         assert response.status_code == status.HTTP_200_OK
#         mock_log_exception.assert_called_once_with("Could not find contribution matching provider_payment_id")


# @pytest.mark.django_db
# class TestCustomerSubscriptionUpdated:
#     @pytest.mark.parametrize("payment_method_has_changed", (True, False))
#     def test_when_contribution_found(
#         self, monkeypatch, client, customer_subscription_updated, payment_method_has_changed
#     ):
#         monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#         header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#         with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
#             contribution = ContributionFactory(
#                 annual_subscription=True,
#                 provider_subscription_id=customer_subscription_updated["data"]["object"]["id"],
#             )
#             if payment_method_has_changed:
#                 customer_subscription_updated["data"]["previous_attributes"] = {"default_payment_method": "something"}
#             response = client.post(reverse("stripe-webhooks"), data=customer_subscription_updated, **header)
#         assert response.status_code == status.HTTP_200_OK
#         contribution.refresh_from_db()
#         assert contribution.payment_provider_data == customer_subscription_updated
#         assert contribution.provider_subscription_id == customer_subscription_updated["data"]["object"]["id"]
#         if payment_method_has_changed:
#             assert (
#                 contribution.provider_payment_method_id
#                 == customer_subscription_updated["data"]["object"]["default_payment_method"]
#             )

#     def test_when_contribution_not_found(self, monkeypatch, client, customer_subscription_updated):
#         monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#         mock_log_exception = Mock()
#         monkeypatch.setattr("apps.contributions.views.logger.exception", mock_log_exception)
#         header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#         assert not Contribution.objects.filter(
#             provider_subscription_id=customer_subscription_updated["data"]["object"]["id"]
#         ).exists()
#         response = client.post(reverse("stripe-webhooks"), data=customer_subscription_updated, **header)
#         assert response.status_code == status.HTTP_200_OK
#         mock_log_exception.assert_called_once_with("Could not find contribution matching provider_payment_id")


# @pytest.mark.django_db
# class TestCustomerSubscriptionDeleted:
#     @pytest.mark.parametrize("payment_method_has_changed", (True, False))
#     def test_when_contribution_found(
#         self, monkeypatch, client, customer_subscription_updated, payment_method_has_changed
#     ):
#         monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#         header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#         with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
#             contribution = ContributionFactory(
#                 annual_subscription=True,
#                 provider_subscription_id=customer_subscription_updated["data"]["object"]["id"],
#             )
#             if payment_method_has_changed:
#                 customer_subscription_updated["data"]["previous_attributes"] = {"default_payment_method": "something"}
#             response = client.post(reverse("stripe-webhooks"), data=customer_subscription_updated, **header)
#         assert response.status_code == status.HTTP_200_OK
#         contribution.refresh_from_db()
#         assert contribution.payment_provider_data == customer_subscription_updated
#         assert contribution.provider_subscription_id == customer_subscription_updated["data"]["object"]["id"]
#         if payment_method_has_changed:
#             assert (
#                 contribution.provider_payment_method_id
#                 == customer_subscription_updated["data"]["object"]["default_payment_method"]
#             )

#     def test_when_contribution_not_found(self, monkeypatch, client, customer_subscription_updated):
#         monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#         mock_log_exception = Mock()
#         monkeypatch.setattr("apps.contributions.views.logger.exception", mock_log_exception)
#         header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#         assert not Contribution.objects.filter(
#             provider_subscription_id=customer_subscription_updated["data"]["object"]["id"]
#         ).exists()
#         response = client.post(reverse("stripe-webhooks"), data=customer_subscription_updated, **header)
#         assert response.status_code == status.HTTP_200_OK
#         mock_log_exception.assert_called_once_with("Could not find contribution matching provider_payment_id")


# @pytest.mark.django_db
# def test_customer_subscription_untracked_event(client, customer_subscription_updated, monkeypatch):
#     mock_log_warning = Mock()
#     monkeypatch.setattr("apps.contributions.webhooks.logger.warning", mock_log_warning)
#     monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#     header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#     with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
#         ContributionFactory(
#             annual_subscription=True,
#             provider_subscription_id=customer_subscription_updated["data"]["object"]["id"],
#         )
#         customer_subscription_updated["type"] = "untracked-event"
#         response = client.post(reverse("stripe-webhooks"), data=customer_subscription_updated, **header)
#     assert response.status_code == status.HTTP_200_OK
#     mock_log_warning.assert_called_once_with(
#         "`StripeWebhookProcessor.process_subscription` called with unexpected event type: %s",
#         customer_subscription_updated["type"],
#     )
# <<<<<<< HEAD
#     @patch("apps.contributions.views.logger")
#     def test_webhook_view_invalid_contribution(self, mock_logger, *args):
#         self._create_contribution(payment_intent_id="abcd")
#         self._run_webhook_view_with_request()
#         self.assertEqual("Could not find contribution", mock_logger.exception.call_args[0][0])

#     def test_payment_intent_canceled_webhook(self):
#         payment_intent_id = "1234"
#         contribution = self._create_contribution(payment_intent_id=payment_intent_id)
#         processor = StripeWebhookProcessor(
#             MockPaymentIntentEvent(event_type="payment_intent.canceled", intent_id=payment_intent_id)
#         )
#         processor.process()
#         contribution.refresh_from_db()
#         self.assertEqual(contribution.status, ContributionStatus.CANCELED)

#     def test_payment_intent_fraudulent(self):
#         payment_intent_id = "1234"
#         contribution = self._create_contribution(payment_intent_id=payment_intent_id)
#         processor = StripeWebhookProcessor(
#             MockPaymentIntentEvent(
#                 event_type="payment_intent.canceled", intent_id=payment_intent_id, cancellation_reason="fraudulent"
#             )
#         )
#         processor.process()
#         contribution.refresh_from_db()
#         self.assertEqual(contribution.status, ContributionStatus.REJECTED)

#     def test_payment_intent_payment_failed_webhook(self):
#         payment_intent_id = "1234"
#         contribution = self._create_contribution(payment_intent_id=payment_intent_id)
#         processor = StripeWebhookProcessor(
#             MockPaymentIntentEvent(event_type="payment_intent.payment_failed", intent_id=payment_intent_id)
#         )
#         processor.process()
#         contribution.refresh_from_db()
#         self.assertEqual(contribution.status, ContributionStatus.FAILED)

#     def test_payment_intent_succeeded_webhook(self):
#         payment_intent_id = "1234"
#         contribution = self._create_contribution(payment_intent_id=payment_intent_id)
#         processor = StripeWebhookProcessor(
#             MockPaymentIntentEvent(event_type="payment_intent.succeeded", intent_id=payment_intent_id)
#         )
#         # we run it once with save patched so we can observe that gets called with right args. I tried
#         # wrapping the original save function and it allowed me to spy, somehow the values weren't getting saved back
#         # to the db.
#         with patch.object(Contribution, "save") as mock_save:
#             processor.process()
#             mock_save.assert_called_once_with(
#                 update_fields=["status", "last_payment_date", "payment_provider_data", "modified"]
#             )
#         processor.process()
#         contribution.refresh_from_db()
#         self.assertEqual(contribution.status, ContributionStatus.PAID)

#     def test_webhook_with_invalid_contribution_payment_intent_id(self):
#         processor = StripeWebhookProcessor(
#             MockPaymentIntentEvent(event_type="payment_intent.succeeded", intent_id="no-id-like-this-exists")
#         )
#         self.assertRaises(Contribution.DoesNotExist, processor.process)

#     @patch("apps.contributions.webhooks.logger")
#     def test_unknown_event_logs_helpful_message(self, mock_logger):
#         payment_intent_id = "abcd"
#         self._create_contribution(payment_intent_id=payment_intent_id)
#         fake_event_object = "criminal_activiy"
#         processor = StripeWebhookProcessor(
#             MockPaymentIntentEvent(object_type=fake_event_object, intent_id=payment_intent_id)
#         )
#         processor.process()
#         self.assertIn("Received un-handled Stripe object of type", mock_logger.warning.call_args[0][0])
#         self.assertEqual(mock_logger.warning.call_args[0][1], fake_event_object)

#     @patch("apps.contributions.webhooks.settings.STRIPE_LIVE_MODE", True)
#     @patch("apps.contributions.webhooks.logger")
#     @patch("apps.contributions.webhooks.StripeWebhookProcessor.process_payment_intent")
#     @patch("apps.contributions.webhooks.StripeWebhookProcessor.process_subscription")
#     def test_will_not_process_test_event_in_live_mode(self, mock_process_pi, mock_process_sub, mock_logger):
#         processor = StripeWebhookProcessor(
#             MockPaymentIntentEvent(object_type="unimportant", intent_id="ignore", livemode=False)
#         )
#         processor.process()
#         assert "ignoring" in mock_logger.info.call_args[0][0]
#         assert not mock_process_pi.called
#         assert not mock_process_sub.called

#     @patch("apps.contributions.webhooks.logger")
#     @patch("apps.contributions.webhooks.StripeWebhookProcessor.process_payment_intent")
#     @patch("apps.contributions.webhooks.StripeWebhookProcessor.process_subscription")
#     def test_will_not_process_live_event_in_test_mode(self, mock_process_pi, mock_process_sub, mock_logger):
#         processor = StripeWebhookProcessor(
#             MockPaymentIntentEvent(object_type="payment_intent.succeeded", intent_id="ignore", livemode=True)
#         )
#         processor.process()
#         assert "ignoring" in mock_logger.info.call_args[0][0]
#         assert not mock_process_pi.called
#         assert not mock_process_sub.called


# class CustomerSubscriptionWebhooksTest(APITestCase):
#     def setUp(self):
#         with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
#             self.contribution = ContributionFactory(annual_subscription=True, provider_payment_method_id="something")

#     def test_process_subscription_handles_event(self):
#         new_method = "new_payment_method"
#         processor = StripeWebhookProcessor(
#             MockSubscriptionEvent(
#                 event_type="customer.subscription.updated",
#                 previous_attributes={"default_payment_method": "something"},
#                 subscription_id=self.contribution.provider_subscription_id,
#                 new_payment_method=new_method,
#             ),
#         )
#         # we run it once with save patched so we can observe that gets called with right args. I tried
#         # wrapping the original save function and it allowed me to spy, somehow the values weren't getting saved back
#         # to the db.
#         with patch.object(Contribution, "save", wraps=self.contribution.save) as mock_save:
#             processor.process()
#             mock_save.assert_called_once_with(update_fields=["provider_payment_method_id"])
#         with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
#             processor.process()
#         self.contribution.refresh_from_db()
#         assert self.contribution.provider_payment_method_id == new_method

#     @patch("apps.contributions.webhooks.StripeWebhookProcessor.handle_subscription_updated")
#     def test_handle_subscription_updated_handles_event(self, mock_handle_subscription_updated):
#         processor = StripeWebhookProcessor(MockSubscriptionEvent(event_type="customer.subscription.updated"))
#         processor.process()
#         mock_handle_subscription_updated.assert_called_once()

#     def test_handle_subscription_canceled_handles_event(self):
#         processor = StripeWebhookProcessor(
#             MockSubscriptionEvent(
#                 event_type="customer.subscription.deleted", subscription_id=self.contribution.provider_subscription_id
#             )
#         )
#         # we run it once with save patched so we can observe that gets called with right args. I tried
#         # wrapping the original save function and it allowed me to spy, somehow the values weren't getting saved back
#         # to the db.
#         with patch.object(Contribution, "save", wraps=self.contribution.save) as mock_save:
#             processor.process()
#             mock_save.assert_called_once_with(update_fields=["status", "payment_provider_data"])
#         with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
#             processor.process()
#         self.contribution.refresh_from_db()
#         assert self.contribution.status == ContributionStatus.CANCELED

#     @patch("stripe.PaymentMethod.retrieve", side_effect="{}")
#     def test_updated_subscription_gets_updated(self, mock_fetch_pm):
#         new_payment_method = "testing-new-pm-id"
#         processor = StripeWebhookProcessor(
#             MockSubscriptionEvent(
#                 event_type="customer.subscription.updated",
#                 subscription_id=self.contribution.provider_subscription_id,
#                 new_payment_method=new_payment_method,
#                 previous_attributes={"default_payment_method": self.contribution.provider_payment_method_id},
#             )
#         )
#         processor.process()
#         mock_fetch_pm.assert_called()
#         self.contribution.refresh_from_db()
#         self.assertEqual(self.contribution.provider_payment_method_id, new_payment_method)

#     @patch("stripe.PaymentMethod.retrieve", side_effect="{}")
#     def test_canceled_subscription_gets_updated(self, mock_fetch_pm):
#         self.assertNotEqual(self.contribution.status, ContributionStatus.CANCELED)
#         processor = StripeWebhookProcessor(
#             MockSubscriptionEvent(
#                 event_type="customer.subscription.deleted", subscription_id=self.contribution.provider_subscription_id
#             )
#         )
#         processor.process()
#         mock_fetch_pm.assert_not_called()
#         self.contribution.refresh_from_db()
#         self.assertEqual(self.contribution.status, ContributionStatus.CANCELED)
# =======


# @pytest.mark.django_db
# def test_payment_method_attached(client, monkeypatch, payment_method_attached):
#     monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#     header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#     with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
#         contribution = ContributionFactory(
#             one_time=True,
#             provider_customer_id=payment_method_attached["data"]["object"]["customer"],
#         )
#         response = client.post(reverse("stripe-webhooks"), data=payment_method_attached, **header)
#     assert response.status_code == status.HTTP_200_OK
#     contribution.refresh_from_db()
#     assert contribution.provider_payment_method_id == payment_method_attached["data"]["object"]["id"]


# @pytest.mark.django_db
# def test_stripe_webhooks_endpoint_when_invalid_signature(client):
#     header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#     response = client.post(reverse("stripe-webhooks"), data={}, **header)
#     assert response.status_code == status.HTTP_400_BAD_REQUEST
#     assert response.data["error"] == "Invalid signature"
# >>>>>>> DEV-2342-split-bad-actors-into-3-buckets-not-just-2-for-nre


# @pytest.mark.django_db()
# @pytest.mark.parametrize(
#     "interval,expect_reminder_email",
#     (
#         (ContributionInterval.MONTHLY, False),
#         (ContributionInterval.YEARLY, True),
#     ),
# )
# def test_invoice_updated_webhook(interval, expect_reminder_email, client, monkeypatch, invoice_upcoming):
#     mock_send_reminder = Mock()
#     monkeypatch.setattr(Contribution, "send_recurring_contribution_email_reminder", mock_send_reminder)
#     monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
#     # TODO: DEV-3026
#     with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
#         ContributionFactory(
#             interval=interval, provider_subscription_id=invoice_upcoming["data"]["object"]["subscription"]
#         )
#     header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
#     response = client.post(reverse("stripe-webhooks"), data=invoice_upcoming, **header)
#     assert response.status_code == status.HTTP_200_OK
#     if expect_reminder_email:
#         mock_send_reminder.assert_called_once_with(
#             make_aware(datetime.fromtimestamp(invoice_upcoming["data"]["object"]["next_payment_attempt"])).date()
#         )
#     else:
#         mock_send_reminder.assert_not_called()
