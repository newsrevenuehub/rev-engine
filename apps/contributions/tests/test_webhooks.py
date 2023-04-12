import json
from datetime import datetime
from unittest.mock import Mock, patch

from django.urls import reverse
from django.utils.timezone import make_aware

import pytest
from rest_framework import status
from stripe.webhook import WebhookSignature

from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus
from apps.contributions.tests.factories import ContributionFactory


@pytest.fixture
def payment_intent_canceled():
    with open("apps/contributions/tests/fixtures/payment-intent-canceled-webhook.json") as fl:
        return json.load(fl)


@pytest.fixture
def payment_intent_succeeded():
    with open("apps/contributions/tests/fixtures/payment-intent-succeeded-webhook.json") as fl:
        return json.load(fl)


@pytest.fixture
def payment_intent_payment_failed():
    with open("apps/contributions/tests/fixtures/payment-intent-payment-failed-webhook.json") as fl:
        return json.load(fl)


@pytest.fixture
def payment_method_attached():
    with open("apps/contributions/tests/fixtures/payment-method-attached-webhook.json") as fl:
        return json.load(fl)


@pytest.fixture
def customer_subscription_updated():
    with open("apps/contributions/tests/fixtures/customer-subscription-updated-webhook.json") as fl:
        return json.load(fl)


@pytest.fixture
def customer_subscription_deleted():
    with open("apps/contributions/tests/fixtures/customer-subscription-deleted-webhook.json") as fl:
        return json.load(fl)


@pytest.fixture
def invoice_upcoming():
    with open("apps/contributions/tests/fixtures/stripe-invoice-upcoming.json") as fl:
        return json.load(fl)


@pytest.mark.django_db
class TestPaymentIntentSucceeded:
    def test_when_contribution_found(self, payment_intent_succeeded, monkeypatch, client, mocker):
        monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)

        mocker.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        contribution = ContributionFactory(
            one_time=True,
            status=ContributionStatus.PROCESSING,
            last_payment_date=None,
            payment_provider_data=None,
            provider_payment_id=payment_intent_succeeded["data"]["object"]["id"],
            provider_customer_id="something",
        )
        save_spy = mocker.spy(Contribution, "save")
        mock_send_receipt_email = mocker.patch("apps.contributions.models.Contribution.handle_thank_you_email")
        response = client.post(reverse("stripe-webhooks"), data=payment_intent_succeeded, **header)

        # the next two assertions are to ensure we're only allowing webhook to update a subset of fields
        # on the instance, in order to avoid race conditions
        save_spy.assert_called_once_with(
            contribution,
            update_fields=[
                "status",
                "last_payment_date",
                "provider_payment_id",
                "provider_payment_method_id",
                "payment_provider_data",
                "modified",
            ],
        )

        mock_send_receipt_email.assert_called_once()
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.payment_provider_data == payment_intent_succeeded
        assert contribution.provider_payment_id == payment_intent_succeeded["data"]["object"]["id"]
        assert contribution.last_payment_date is not None
        assert contribution.status == ContributionStatus.PAID

    def test_when_contribution_not_found(self, payment_intent_succeeded, monkeypatch, client):
        monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
        mock_log_exception = Mock()
        monkeypatch.setattr("apps.contributions.views.logger.exception", mock_log_exception)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        assert not Contribution.objects.filter(
            provider_payment_id=payment_intent_succeeded["data"]["object"]["id"]
        ).exists()
        response = client.post(reverse("stripe-webhooks"), data=payment_intent_succeeded, **header)
        assert response.status_code == status.HTTP_200_OK
        mock_log_exception.assert_called_once_with("Could not find contribution")


@pytest.mark.django_db
class TestPaymentIntentCanceled:
    @pytest.mark.parametrize("cancellation_reason", (None, "", "random-thing", "fraudulent"))
    def test_when_contribution_found(self, cancellation_reason, monkeypatch, client, payment_intent_canceled, mocker):
        monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(
                one_time=True,
                status=ContributionStatus.PROCESSING,
                provider_payment_id=payment_intent_canceled["data"]["object"]["id"],
            )
            payment_intent_canceled["data"]["object"]["cancellation_reason"] = cancellation_reason
            spy = mocker.spy(Contribution, "save")
            response = client.post(reverse("stripe-webhooks"), data=payment_intent_canceled, **header)

        # the next two assertions are to ensure we're only allowing webhook to update a subset of fields
        # on the instance, in order to avoid race conditions
        assert spy.call_args[0][0] == contribution
        assert spy.call_args[1] == {"update_fields": ["status", "payment_provider_data", "modified"]}
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.payment_provider_data == payment_intent_canceled
        assert (
            contribution.status == ContributionStatus.REJECTED
            if cancellation_reason == "fraudulent"
            else ContributionStatus.CANCELED
        )

    def test_when_contribution_not_found(self, monkeypatch, client, payment_intent_canceled):
        monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
        mock_log_exception = Mock()
        monkeypatch.setattr("apps.contributions.views.logger.exception", mock_log_exception)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        assert not Contribution.objects.filter(
            provider_payment_id=payment_intent_canceled["data"]["object"]["id"]
        ).exists()
        response = client.post(reverse("stripe-webhooks"), data=payment_intent_canceled, **header)
        assert response.status_code == status.HTTP_200_OK
        mock_log_exception.assert_called_once_with("Could not find contribution")


@pytest.mark.django_db
class TestPaymentIntentPaymentFailed:
    def test_when_contribution_found(self, monkeypatch, client, payment_intent_payment_failed, mocker):
        monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(
                one_time=True,
                status=ContributionStatus.PROCESSING,
                provider_payment_id=payment_intent_payment_failed["data"]["object"]["id"],
            )
            spy = mocker.spy(Contribution, "save")
            response = client.post(reverse("stripe-webhooks"), data=payment_intent_payment_failed, **header)

        # the next two assertions are to ensure we're only allowing webhook to update a subset of fields
        # on the instance, in order to avoid race conditions
        assert spy.call_args[0][0] == contribution
        assert spy.call_args[1] == {"update_fields": ["status", "payment_provider_data", "modified"]}

        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.payment_provider_data == payment_intent_payment_failed
        assert contribution.status == ContributionStatus.FAILED

    def test_when_contribution_not_found(self, monkeypatch, client, payment_intent_payment_failed):
        monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
        mock_log_exception = Mock()
        monkeypatch.setattr("apps.contributions.views.logger.exception", mock_log_exception)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        assert not Contribution.objects.filter(
            provider_payment_id=payment_intent_payment_failed["data"]["object"]["id"]
        ).exists()
        response = client.post(reverse("stripe-webhooks"), data=payment_intent_payment_failed, **header)
        assert response.status_code == status.HTTP_200_OK
        mock_log_exception.assert_called_once_with("Could not find contribution")


@pytest.mark.django_db
class TestCustomerSubscriptionUpdated:
    @pytest.mark.parametrize("payment_method_has_changed", (True, False))
    def test_when_contribution_found(
        self, monkeypatch, client, customer_subscription_updated, payment_method_has_changed, mocker
    ):
        monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(
                annual_subscription=True,
                provider_subscription_id=customer_subscription_updated["data"]["object"]["id"],
            )
            if payment_method_has_changed:
                customer_subscription_updated["data"]["previous_attributes"] = {"default_payment_method": "something"}
            spy = mocker.spy(Contribution, "save")
            response = client.post(reverse("stripe-webhooks"), data=customer_subscription_updated, **header)

        # the next two assertions are to ensure we're only allowing webhook to update a subset of fields
        # on the instance, in order to avoid race conditions
        assert spy.call_args[0][0] == contribution
        expected_update_fields = [
            "modified",
            "payment_provider_data",
            "provider_subscription_id",
        ]
        if payment_method_has_changed:
            expected_update_fields.append("provider_payment_method_id")
        assert spy.call_args[1] == {"update_fields": expected_update_fields}

        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.payment_provider_data == customer_subscription_updated
        assert contribution.provider_subscription_id == customer_subscription_updated["data"]["object"]["id"]
        if payment_method_has_changed:
            assert (
                contribution.provider_payment_method_id
                == customer_subscription_updated["data"]["object"]["default_payment_method"]
            )

    def test_when_contribution_not_found(self, monkeypatch, client, customer_subscription_updated):
        monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
        mock_log_exception = Mock()
        monkeypatch.setattr("apps.contributions.views.logger.exception", mock_log_exception)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        assert not Contribution.objects.filter(
            provider_subscription_id=customer_subscription_updated["data"]["object"]["id"]
        ).exists()
        response = client.post(reverse("stripe-webhooks"), data=customer_subscription_updated, **header)
        assert response.status_code == status.HTTP_200_OK
        mock_log_exception.assert_called_once_with("Could not find contribution")


@pytest.mark.django_db
class TestCustomerSubscriptionDeleted:
    def test_when_contribution_found(self, monkeypatch, client, customer_subscription_deleted, mocker):
        monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(
                annual_subscription=True,
                provider_subscription_id=customer_subscription_deleted["data"]["object"]["id"],
            )
            spy = mocker.spy(Contribution, "save")
            response = client.post(reverse("stripe-webhooks"), data=customer_subscription_deleted, **header)
        # the next two assertions are to ensure we're only allowing webhook to update a subset of fields
        # on the instance, in order to avoid race conditions
        assert spy.call_args[0][0] == contribution
        assert spy.call_args[1] == {"update_fields": ["status", "payment_provider_data", "modified"]}

        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.payment_provider_data == customer_subscription_deleted
        assert contribution.provider_subscription_id == customer_subscription_deleted["data"]["object"]["id"]
        assert contribution.status == ContributionStatus.CANCELED

    def test_when_contribution_not_found(self, monkeypatch, client, customer_subscription_updated):
        monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
        mock_log_exception = Mock()
        monkeypatch.setattr("apps.contributions.views.logger.exception", mock_log_exception)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        assert not Contribution.objects.filter(
            provider_subscription_id=customer_subscription_updated["data"]["object"]["id"]
        ).exists()
        response = client.post(reverse("stripe-webhooks"), data=customer_subscription_updated, **header)
        assert response.status_code == status.HTTP_200_OK
        mock_log_exception.assert_called_once_with("Could not find contribution")


@pytest.mark.django_db
def test_customer_subscription_untracked_event(client, customer_subscription_updated, monkeypatch):
    mock_log_warning = Mock()
    monkeypatch.setattr("apps.contributions.webhooks.logger.warning", mock_log_warning)
    monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
    header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        ContributionFactory(
            annual_subscription=True,
            provider_subscription_id=customer_subscription_updated["data"]["object"]["id"],
        )
        customer_subscription_updated["type"] = "untracked-event"
        response = client.post(reverse("stripe-webhooks"), data=customer_subscription_updated, **header)
    assert response.status_code == status.HTTP_200_OK
    mock_log_warning.assert_called_once_with(
        "`StripeWebhookProcessor.process_subscription` called with unexpected event type: %s",
        customer_subscription_updated["type"],
    )


@pytest.mark.django_db
def test_payment_method_attached(client, monkeypatch, payment_method_attached, mocker):
    monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
    header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        contribution = ContributionFactory(
            one_time=True,
            provider_customer_id=payment_method_attached["data"]["object"]["customer"],
        )
        spy = mocker.spy(Contribution, "save")
        response = client.post(reverse("stripe-webhooks"), data=payment_method_attached, **header)
    # the next two assertions are to ensure we're only allowing webhook to update a subset of fields
    # on the instance, in order to avoid race conditions
    assert spy.call_args[0][0] == contribution
    assert spy.call_args[1] == {"update_fields": ["provider_payment_method_id", "modified"]}
    assert response.status_code == status.HTTP_200_OK
    contribution.refresh_from_db()
    assert contribution.provider_payment_method_id == payment_method_attached["data"]["object"]["id"]


@pytest.mark.django_db
def test_stripe_webhooks_endpoint_when_invalid_signature(client):
    header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
    response = client.post(reverse("stripe-webhooks"), data={}, **header)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["error"] == "Invalid signature"


@pytest.mark.django_db()
@pytest.mark.parametrize(
    "interval,expect_reminder_email",
    (
        (ContributionInterval.MONTHLY, False),
        (ContributionInterval.YEARLY, True),
    ),
)
def test_invoice_updated_webhook(interval, expect_reminder_email, client, monkeypatch, invoice_upcoming):
    mock_send_reminder = Mock()
    monkeypatch.setattr(Contribution, "send_recurring_contribution_email_reminder", mock_send_reminder)
    monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
    # TODO: DEV-3026
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        ContributionFactory(
            interval=interval, provider_subscription_id=invoice_upcoming["data"]["object"]["subscription"]
        )
    header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
    response = client.post(reverse("stripe-webhooks"), data=invoice_upcoming, **header)
    assert response.status_code == status.HTTP_200_OK
    if expect_reminder_email:
        mock_send_reminder.assert_called_once_with(
            make_aware(datetime.fromtimestamp(invoice_upcoming["data"]["object"]["next_payment_attempt"])).date()
        )
    else:
        mock_send_reminder.assert_not_called()
