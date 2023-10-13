# """test_webhooks_integration.py"""
#
# This file contains tests that are meant to be integration tests for our Stripe webhook processing views.
# More specifically, we test both the API view layer, and the async task layer together to ensure that under normal
# circumstances expected request states lead to expected side effects.
#
# Note that this is not a perfect integration test. Here, unlike in prod, we execute our async tasks synchronously.
import json
from datetime import datetime

from django.urls import reverse
from django.utils.timezone import make_aware

import pytest
from addict import Dict as AttrDict
from rest_framework import status
from stripe.webhook import WebhookSignature

from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus
from apps.contributions.tests.factories import ContributionFactory


@pytest.fixture(autouse=True)
def synchronous_celery(settings):
    """Make all celery tasks run synchronously

    This enables us to make requests to webhook views and confirm that expected side effects occur
    """
    settings.CELERY_ALWAYS_EAGER = True


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
    def test_when_contribution_found(self, payment_intent_succeeded, client, mocker):
        mocker.patch.object(WebhookSignature, "verify_header", return_value=True)
        mocker.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None)
        mocker.patch("stripe.Customer.retrieve", return_value=AttrDict({"name": "some customer name"}))
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        contribution = ContributionFactory(
            one_time=True,
            status=ContributionStatus.PROCESSING,
            last_payment_date=None,
            payment_provider_data=None,
            provider_payment_id=payment_intent_succeeded["data"]["object"]["id"],
        )
        save_spy = mocker.spy(Contribution, "save")
        send_receipt_email_spy = mocker.spy(Contribution, "handle_thank_you_email")
        response = client.post(reverse("stripe-webhooks-contributions"), data=payment_intent_succeeded, **header)
        assert response.status_code == status.HTTP_200_OK
        # the next two assertions are to ensure we're only allowing webhook to update a subset of fields
        # on the instance, in order to avoid race conditions
        save_spy.assert_called_once_with(
            contribution,
            update_fields={
                "status",
                "last_payment_date",
                "provider_payment_id",
                "provider_payment_method_id",
                "provider_payment_method_details",
                "payment_provider_data",
                "modified",
            },
        )
        send_receipt_email_spy.assert_called_once_with(contribution)
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.payment_provider_data == payment_intent_succeeded
        assert contribution.provider_payment_id == payment_intent_succeeded["data"]["object"]["id"]
        assert contribution.last_payment_date is not None
        assert contribution.status == ContributionStatus.PAID

    def test_when_contribution_not_found(self, payment_intent_succeeded, mocker, client):
        mocker.patch.object(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
        logger_spy = mocker.patch("apps.contributions.tasks.logger.info")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        assert not Contribution.objects.filter(
            provider_payment_id=payment_intent_succeeded["data"]["object"]["id"]
        ).exists()
        response = client.post(reverse("stripe-webhooks-contributions"), data=payment_intent_succeeded, **header)
        assert response.status_code == status.HTTP_200_OK
        logger_spy.assert_called_once_with("Could not find contribution", exc_info=True)


@pytest.mark.django_db
class TestPaymentIntentCanceled:
    @pytest.mark.parametrize("cancellation_reason", (None, "", "random-thing", "fraudulent"))
    def test_when_contribution_found(self, cancellation_reason, client, payment_intent_canceled, mocker):
        mocker.patch.object(WebhookSignature, "verify_header", return_value=True)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        contribution = ContributionFactory(
            one_time=True,
            status=ContributionStatus.PROCESSING,
            provider_payment_id=payment_intent_canceled["data"]["object"]["id"],
        )
        payment_intent_canceled["data"]["object"]["cancellation_reason"] = cancellation_reason
        spy = mocker.spy(Contribution, "save")

        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.__enter__.return_value = None
        mock_set_revision_comment = mocker.patch("reversion.set_comment")

        response = client.post(reverse("stripe-webhooks-contributions"), data=payment_intent_canceled, **header)

        # the next two assertions are to ensure we're only allowing webhook to update a subset of fields
        # on the instance, in order to avoid race conditions
        spy.assert_called_once_with(contribution, update_fields={"status", "payment_provider_data", "modified"})
        mock_create_revision.assert_called_once()
        mock_set_revision_comment.assert_called_once_with(
            f"`StripeWebhookProcessor.handle_payment_intent_canceled` webhook handler ran for contribution with ID {contribution.id}"
        )

        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.payment_provider_data == payment_intent_canceled
        assert (
            contribution.status == ContributionStatus.REJECTED
            if cancellation_reason == "fraudulent"
            else ContributionStatus.CANCELED
        )

    def test_when_contribution_not_found(self, mocker, client, payment_intent_canceled):
        mocker.patch.object(WebhookSignature, "verify_header", return_value=True)
        logger_spy = mocker.patch("apps.contributions.tasks.logger.info")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        assert not Contribution.objects.filter(
            provider_payment_id=payment_intent_canceled["data"]["object"]["id"]
        ).exists()
        response = client.post(reverse("stripe-webhooks-contributions"), data=payment_intent_canceled, **header)
        assert response.status_code == status.HTTP_200_OK
        logger_spy.assert_called_once_with("Could not find contribution", exc_info=True)


@pytest.mark.django_db
class TestPaymentIntentPaymentFailed:
    def test_when_contribution_found(self, monkeypatch, client, payment_intent_payment_failed, mocker):
        monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        contribution = ContributionFactory(
            one_time=True,
            status=ContributionStatus.PROCESSING,
            provider_payment_id=payment_intent_payment_failed["data"]["object"]["id"],
        )
        spy = mocker.spy(Contribution, "save")
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.__enter__.return_value = None
        mock_set_revision_comment = mocker.patch("reversion.set_comment")
        response = client.post(reverse("stripe-webhooks-contributions"), data=payment_intent_payment_failed, **header)
        spy.assert_called_once_with(contribution, update_fields={"status", "payment_provider_data", "modified"})
        mock_create_revision.assert_called_once()
        mock_set_revision_comment.assert_called_once_with(
            f"StripeWebhookProcessor.handle_payment_intent_failed webhook handler updated payment provider data for contribution with ID {contribution.id}."
        )

        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.payment_provider_data == payment_intent_payment_failed
        assert contribution.status == ContributionStatus.FAILED

    def test_when_contribution_not_found(self, mocker, client, payment_intent_payment_failed):
        mocker.patch.object(WebhookSignature, "verify_header", return_value=True)
        logger_spy = mocker.patch("apps.contributions.tasks.logger.info")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        assert not Contribution.objects.filter(
            provider_payment_id=payment_intent_payment_failed["data"]["object"]["id"]
        ).exists()
        response = client.post(reverse("stripe-webhooks-contributions"), data=payment_intent_payment_failed, **header)
        assert response.status_code == status.HTTP_200_OK
        logger_spy.assert_called_once_with("Could not find contribution", exc_info=True)


@pytest.mark.django_db
class TestCustomerSubscriptionUpdated:
    @pytest.mark.parametrize("payment_method_has_changed", (True, False))
    def test_when_contribution_found(self, client, customer_subscription_updated, payment_method_has_changed, mocker):
        mocker.patch.object(WebhookSignature, "verify_header", return_value=True)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        contribution = ContributionFactory(
            annual_subscription=True,
            provider_subscription_id=customer_subscription_updated["data"]["object"]["id"],
        )
        if payment_method_has_changed:
            customer_subscription_updated["data"]["previous_attributes"] = {"default_payment_method": "something"}
            customer_subscription_updated["data"]["object"]["default_payment_method"] = "something else"
        spy = mocker.spy(Contribution, "save")
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.__enter__.return_value = None
        mock_set_revision_comment = mocker.patch("reversion.set_comment")

        response = client.post(reverse("stripe-webhooks-contributions"), data=customer_subscription_updated, **header)

        expected_update_fields = {
            "modified",
            "payment_provider_data",
            "provider_subscription_id",
        }
        if payment_method_has_changed:
            expected_update_fields.add("provider_payment_method_id")
        spy.assert_called_once_with(contribution, update_fields=expected_update_fields)
        mock_set_revision_comment.assert_called_once_with(
            f"`StripeWebhookProcessor.handle_subscription_updated` webhook handler ran for contribution with ID {contribution.id}"
        )
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.payment_provider_data == customer_subscription_updated
        assert contribution.provider_subscription_id == customer_subscription_updated["data"]["object"]["id"]
        if payment_method_has_changed:
            assert (
                contribution.provider_payment_method_id
                == customer_subscription_updated["data"]["object"]["default_payment_method"]
            )

    def test_when_contribution_not_found(self, mocker, client, customer_subscription_updated):
        mocker.patch.object(WebhookSignature, "verify_header", return_value=True)
        logger_spy = mocker.patch("apps.contributions.tasks.logger.info")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        assert not Contribution.objects.filter(
            provider_subscription_id=customer_subscription_updated["data"]["object"]["id"]
        ).exists()
        response = client.post(reverse("stripe-webhooks-contributions"), data=customer_subscription_updated, **header)
        assert response.status_code == status.HTTP_200_OK
        logger_spy.assert_called_once_with("Could not find contribution", exc_info=True)


@pytest.mark.django_db
class TestCustomerSubscriptionDeleted:
    def test_when_contribution_found(self, client, customer_subscription_deleted, mocker):
        mocker.patch.object(WebhookSignature, "verify_header", return_value=True)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        contribution = ContributionFactory(
            annual_subscription=True,
            provider_subscription_id=customer_subscription_deleted["data"]["object"]["id"],
        )
        spy = mocker.spy(Contribution, "save")
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.__enter__.return_value = None
        mock_set_revision_comment = mocker.patch("reversion.set_comment")

        response = client.post(reverse("stripe-webhooks-contributions"), data=customer_subscription_deleted, **header)
        spy.assert_called_once_with(contribution, update_fields={"status", "payment_provider_data", "modified"})
        mock_create_revision.assert_called_once()
        mock_set_revision_comment.assert_called_once_with(
            f"`StripeWebhookProcessor.handle_subscription_canceled` webhook handler updated contribution with ID {contribution.id}"
        )
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.payment_provider_data == customer_subscription_deleted
        assert contribution.provider_subscription_id == customer_subscription_deleted["data"]["object"]["id"]
        assert contribution.status == ContributionStatus.CANCELED

    def test_when_contribution_not_found(self, mocker, client, customer_subscription_updated):
        mocker.patch.object(WebhookSignature, "verify_header", return_value=True)
        logger_spy = mocker.patch("apps.contributions.tasks.logger.info")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        assert not Contribution.objects.filter(
            provider_subscription_id=customer_subscription_updated["data"]["object"]["id"]
        ).exists()
        response = client.post(reverse("stripe-webhooks-contributions"), data=customer_subscription_updated, **header)
        assert response.status_code == status.HTTP_200_OK
        logger_spy.assert_called_once_with("Could not find contribution", exc_info=True)


@pytest.mark.django_db
def test_customer_subscription_untracked_event(client, customer_subscription_updated, monkeypatch, mocker):
    mock_log_warning = mocker.Mock()
    monkeypatch.setattr("apps.contributions.webhooks.logger.warning", mock_log_warning)
    monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
    header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
    ContributionFactory(
        annual_subscription=True,
        provider_subscription_id=customer_subscription_updated["data"]["object"]["id"],
    )
    customer_subscription_updated["type"] = "untracked-event"
    response = client.post(reverse("stripe-webhooks-contributions"), data=customer_subscription_updated, **header)
    assert response.status_code == status.HTTP_200_OK
    mock_log_warning.assert_called_once_with(
        "`StripeWebhookProcessor.process_subscription` called with unexpected event type: %s",
        customer_subscription_updated["type"],
    )


@pytest.mark.django_db
def test_payment_method_attached(client, monkeypatch, payment_method_attached, mocker):
    monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
    header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
    contribution = ContributionFactory(
        one_time=True,
        provider_customer_id=payment_method_attached["data"]["object"]["customer"],
    )
    spy = mocker.spy(Contribution, "save")
    response = client.post(reverse("stripe-webhooks-contributions"), data=payment_method_attached, **header)

    spy.assert_called_once_with(contribution, update_fields={"provider_payment_method_id", "modified"})
    assert response.status_code == status.HTTP_200_OK
    contribution.refresh_from_db()
    assert contribution.provider_payment_method_id == payment_method_attached["data"]["object"]["id"]


@pytest.mark.django_db()
@pytest.mark.parametrize(
    "interval,expect_reminder_email",
    (
        (ContributionInterval.MONTHLY, False),
        (ContributionInterval.YEARLY, True),
    ),
)
def test_invoice_updated_webhook(interval, expect_reminder_email, client, monkeypatch, invoice_upcoming, mocker):
    mock_send_reminder = mocker.Mock()
    monkeypatch.setattr(Contribution, "send_recurring_contribution_email_reminder", mock_send_reminder)
    monkeypatch.setattr(WebhookSignature, "verify_header", lambda *args, **kwargs: True)
    contribution = ContributionFactory(
        interval=interval, provider_subscription_id=invoice_upcoming["data"]["object"]["subscription"]
    )
    save_spy = mocker.spy(Contribution, "save")
    header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
    response = client.post(reverse("stripe-webhooks-contributions"), data=invoice_upcoming, **header)
    assert response.status_code == status.HTTP_200_OK
    if expect_reminder_email:
        mock_send_reminder.assert_called_once_with(
            make_aware(datetime.fromtimestamp(invoice_upcoming["data"]["object"]["next_payment_attempt"])).date()
        )
    else:
        mock_send_reminder.assert_not_called()
    contribution.refresh_from_db()
    save_spy.assert_not_called()
