"""test_webhooks_integration.py.

This file contains tests that are meant to be integration tests for our Stripe webhook processing views.
More specifically, we test both the API view layer, and the async task layer together to ensure that under normal
circumstances expected request states lead to expected side effects.

Note that this is not a perfect integration test. Here, unlike in prod, we execute our async tasks synchronously.

Tests are grouped by the type of webhook they are testing. For example, all tests for the `payment_intent_succeeded` webhooks
are grouped together in the `TestPaymentIntentSucceeded` class.
"""

import datetime
import json
from pathlib import Path

from django.urls import reverse
from django.utils.timezone import make_aware

import pytest
import stripe
from addict import Dict as AttrDict
from rest_framework import status
from stripe.webhook import WebhookSignature

from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Payment,
)
from apps.contributions.tests.factories import ContributionFactory, PaymentFactory
from apps.contributions.typings import StripeEventData


@pytest.fixture(autouse=True)
def _synchronous_celery(settings):
    """Make all celery tasks run synchronously.

    This enables us to make requests to webhook views and confirm that expected side effects occur
    """
    settings.CELERY_ALWAYS_EAGER = True


@pytest.fixture
def payment_intent_canceled():
    with Path("apps/contributions/tests/fixtures/payment-intent-canceled-webhook.json").open() as f:
        return json.load(f)


@pytest.fixture
def payment_intent_payment_failed():
    with Path("apps/contributions/tests/fixtures/payment-intent-payment-failed-webhook.json").open() as f:
        return json.load(f)


@pytest.fixture
def customer_subscription_deleted():
    with Path("apps/contributions/tests/fixtures/customer-subscription-deleted-webhook.json").open() as f:
        return json.load(f)


@pytest.fixture
def invoice_upcoming():
    with Path("apps/contributions/tests/fixtures/stripe-invoice-upcoming.json").open() as f:
        return json.load(f)


@pytest.fixture
def charge_refunded():
    # also set up the corresponding contribution in revengine
    with Path("apps/contributions/tests/fixtures/charge-refunded-recurring-first-charge-event.json").open() as f:
        return json.load(f)


@pytest.mark.django_db
@pytest.mark.usefixtures("_suppress_stripe_webhook_sig_verification")
def test_payment_method_attached(client, mocker, payment_method_attached_event):
    contribution = ContributionFactory(
        one_time=True,
        flagged=True,
        provider_customer_id=payment_method_attached_event["data"]["object"]["customer"],
        provider_payment_method_id=None,
        provider_payment_method_details=None,
    )
    mocker.patch(
        "stripe.PaymentMethod.retrieve",
        return_value=(pm := {"card": {"brand": "Visa", "last4": "4242"}}),
    )
    header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
    response = client.post(reverse("stripe-webhooks-contributions"), data=payment_method_attached_event, **header)
    assert response.status_code == status.HTTP_200_OK
    contribution.refresh_from_db()
    assert contribution.provider_payment_method_id == payment_method_attached_event["data"]["object"]["id"]
    assert contribution.provider_payment_method_details == pm


@pytest.mark.django_db
@pytest.mark.usefixtures("_suppress_stripe_webhook_sig_verification")
def test_charge_succeeded(client, mocker, charge_succeeded_event):
    contribution = ContributionFactory(
        one_time=True,
        status=ContributionStatus.PROCESSING,
        provider_payment_id=charge_succeeded_event["data"]["object"]["payment_intent"],
        provider_payment_method_id=None,
    )
    assert contribution.provider_payment_method_id is None
    mocker.patch(
        "stripe.PaymentMethod.retrieve",
        return_value=(pm := {"card": {"brand": "Visa", "last4": "4242"}}),
    )
    header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
    response = client.post(reverse("stripe-webhooks-contributions"), data=charge_succeeded_event, **header)
    assert response.status_code == status.HTTP_200_OK
    by_pm = Contribution.objects.filter(
        provider_payment_method_id=charge_succeeded_event["data"]["object"]["payment_method"],
        provider_payment_method_details=pm,
    )
    assert by_pm.count() == 1
    assert by_pm.first().id == contribution.id


@pytest.mark.django_db
@pytest.mark.usefixtures("_suppress_stripe_webhook_sig_verification")
class TestPaymentIntentSucceeded:
    def test_when_when_one_time_and_contribution_found(
        self,
        payment_intent_succeeded_one_time_event,
        payment_intent_for_one_time_contribution,
        balance_transaction_for_one_time_charge,
        payment_method,
        client,
        mocker,
    ):
        payment_intent_succeeded_one_time_event["data"]["object"]["payment_method"] = payment_method.id
        mocker.patch("stripe.Customer.retrieve", return_value=AttrDict({"name": "some customer name"}))
        mocker.patch("stripe.PaymentIntent.retrieve", return_value=payment_intent_for_one_time_contribution)
        mocker.patch("stripe.BalanceTransaction.retrieve", return_value=balance_transaction_for_one_time_charge)
        mocker.patch("stripe.PaymentMethod.retrieve", return_value=payment_method)
        contribution = ContributionFactory(
            one_time=True,
            status=ContributionStatus.PROCESSING,
            last_payment_date=None,
            provider_payment_id=payment_intent_for_one_time_contribution.id,
        )
        PaymentFactory(contribution=contribution, stripe_balance_transaction_id="bt_fake_01")
        mock_send_receipt = mocker.patch("apps.emails.models.TransactionalEmailRecord.handle_receipt_email")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        response = client.post(
            reverse("stripe-webhooks-contributions"), data=payment_intent_succeeded_one_time_event, **header
        )
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.last_payment_date == contribution.payment_set.order_by("-created").first().created
        assert contribution.status == ContributionStatus.PAID
        assert (
            contribution.provider_payment_method_id
            == payment_intent_succeeded_one_time_event["data"]["object"]["payment_method"]
        )
        assert Payment.objects.filter(
            contribution=contribution, stripe_balance_transaction_id=balance_transaction_for_one_time_charge.id
        ).exists()
        mock_send_receipt.assert_called_once_with(contribution=contribution, show_billing_history=False)

    def test_when_one_time_contribution_not_found(self, payment_intent_succeeded_one_time_event, mocker, client):
        logger_spy = mocker.patch("apps.contributions.tasks.logger.info")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        Contribution.objects.all().delete()
        response = client.post(
            reverse("stripe-webhooks-contributions"), data=payment_intent_succeeded_one_time_event, **header
        )
        assert response.status_code == status.HTTP_200_OK
        assert logger_spy.call_args == mocker.call(
            "Could not find contribution. Here's the event data: %s", mocker.ANY, exc_info=True
        )

    @pytest.fixture(
        params=[
            "payment_intent_succeeded_subscription_creation_event",
        ]
    )
    def when_not_one_time_payment_event(self, request):
        return request.getfixturevalue(request.param)

    def test_when_not_one_time_payment(self, when_not_one_time_payment_event, mocker, client):
        ContributionFactory(provider_payment_id=when_not_one_time_payment_event["data"]["object"]["id"])
        logger_spy = mocker.patch("apps.contributions.webhooks.logger.info")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        response = client.post(reverse("stripe-webhooks-contributions"), data=when_not_one_time_payment_event, **header)
        assert response.status_code == status.HTTP_200_OK
        logger_spy.assert_has_calls(
            [
                mocker.call(
                    "Payment intent %s in event %s appears to be for a subscription, which are handled in different webhook receiver",
                    when_not_one_time_payment_event["data"]["object"]["id"],
                    when_not_one_time_payment_event["id"],
                )
            ]
        )


@pytest.mark.django_db
class TestPaymentIntentCanceled:
    @pytest.mark.parametrize("cancellation_reason", [None, "", "random-thing", "fraudulent"])
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
        mock_set_revision_comment = mocker.patch("reversion.set_comment")
        response = client.post(reverse("stripe-webhooks-contributions"), data=payment_intent_canceled, **header)
        spy.assert_called_once_with(contribution, update_fields={"status", "modified"})
        mock_set_revision_comment.assert_called_once_with(
            "`StripeWebhookProcessor.handle_payment_intent_canceled` updated contribution"
        )

        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
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
        assert logger_spy.call_args == mocker.call(
            "Could not find contribution. Here's the event data: %s", mocker.ANY, exc_info=True
        )


@pytest.mark.django_db
class TestPaymentIntentPaymentFailed:
    def test_when_contribution_found(self, client, payment_intent_payment_failed, mocker):
        mocker.patch.object(WebhookSignature, "verify_header", return_value=True)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        contribution = ContributionFactory(
            one_time=True,
            status=ContributionStatus.PROCESSING,
            provider_payment_id=payment_intent_payment_failed["data"]["object"]["id"],
        )
        spy = mocker.spy(Contribution, "save")
        mock_set_revision_comment = mocker.patch("reversion.set_comment")
        response = client.post(reverse("stripe-webhooks-contributions"), data=payment_intent_payment_failed, **header)
        spy.assert_called_once_with(contribution, update_fields={"status", "modified"})
        mock_set_revision_comment.assert_called_once_with(
            "`StripeWebhookProcessor.handle_payment_intent_failed` updated contribution"
        )
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
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
        assert logger_spy.call_args == mocker.call(
            "Could not find contribution. Here's the event data: %s", mocker.ANY, exc_info=True
        )


@pytest.mark.usefixtures("_suppress_stripe_webhook_sig_verification")
@pytest.mark.django_db
class TestCustomerSubscriptionUpdated:
    @pytest.mark.parametrize("payment_method_has_changed", [True, False])
    def test_when_contribution_found(
        self, payment_method_has_changed, client, customer_subscription_updated_event, mocker
    ):
        mocker.patch("apps.contributions.webhooks.StripeWebhookProcessor.get_metadata_update_value", return_value=None)
        mocker.patch.object(WebhookSignature, "verify_header", return_value=True)

        mocker.patch("stripe.PaymentMethod.retrieve", return_value=stripe.PaymentMethod.construct_from({}, key="test"))

        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        contribution = ContributionFactory(
            annual_subscription=True,
            provider_subscription_id=customer_subscription_updated_event["data"]["object"]["id"],
        )
        if payment_method_has_changed:
            customer_subscription_updated_event["data"]["previous_attributes"] = {"default_payment_method": "something"}
            customer_subscription_updated_event["data"]["object"]["default_payment_method"] = "something else"
        save_spy = mocker.spy(Contribution, "save")
        email_spy = mocker.patch.object(Contribution, "send_recurring_contribution_payment_updated_email")
        mock_set_revision_comment = mocker.patch("reversion.set_comment")
        response = client.post(
            reverse("stripe-webhooks-contributions"), data=customer_subscription_updated_event, **header
        )
        expected_update_fields = {
            "modified",
            "provider_subscription_id",
            "provider_payment_method_id",
            "provider_payment_method_details",
        }
        if payment_method_has_changed:
            expected_update_fields.add("provider_payment_method_id")
        save_spy.assert_called_once_with(contribution, update_fields=expected_update_fields)
        mock_set_revision_comment.assert_called_once_with(
            "`StripeWebhookProcessor.handle_subscription_updated` updated contribution"
        )
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.provider_subscription_id == customer_subscription_updated_event["data"]["object"]["id"]
        if payment_method_has_changed:
            assert (
                contribution.provider_payment_method_id
                == customer_subscription_updated_event["data"]["object"]["default_payment_method"]
            )
            email_spy.assert_called_once()
        else:
            email_spy.assert_not_called()

    def test_when_contribution_not_found(self, mocker, client, customer_subscription_updated_event):
        logger_spy = mocker.patch("apps.contributions.tasks.logger.info")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        assert not Contribution.objects.filter(
            provider_subscription_id=customer_subscription_updated_event["data"]["object"]["id"]
        ).exists()
        response = client.post(
            reverse("stripe-webhooks-contributions"), data=customer_subscription_updated_event, **header
        )
        assert response.status_code == status.HTTP_200_OK
        assert logger_spy.call_args == mocker.call(
            "Could not find contribution. Here's the event data: %s", mocker.ANY, exc_info=True
        )


@pytest.mark.django_db
class TestCustomerSubscriptionDeleted:
    def test_when_contribution_found(self, client, customer_subscription_deleted, mocker):
        mocker.patch.object(WebhookSignature, "verify_header", return_value=True)
        mocker.patch("apps.contributions.webhooks.StripeWebhookProcessor.get_metadata_update_value", return_value=None)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        contribution = ContributionFactory(
            annual_subscription=True,
            provider_subscription_id=customer_subscription_deleted["data"]["object"]["id"],
        )
        save_spy = mocker.spy(Contribution, "save")
        email_spy = mocker.patch.object(Contribution, "send_recurring_contribution_canceled_email")
        mock_set_revision_comment = mocker.patch("reversion.set_comment")
        response = client.post(reverse("stripe-webhooks-contributions"), data=customer_subscription_deleted, **header)
        save_spy.assert_called_once_with(contribution, update_fields={"status", "modified"})
        mock_set_revision_comment.assert_called_once_with(
            "`StripeWebhookProcessor.handle_subscription_canceled` updated contribution"
        )
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.provider_subscription_id == customer_subscription_deleted["data"]["object"]["id"]
        assert contribution.status == ContributionStatus.CANCELED
        email_spy.assert_called_once()

    def test_when_contribution_not_found(self, mocker, client, customer_subscription_updated_event):
        mocker.patch.object(WebhookSignature, "verify_header", return_value=True)
        logger_spy = mocker.patch("apps.contributions.tasks.logger.info")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        assert not Contribution.objects.filter(
            provider_subscription_id=customer_subscription_updated_event["data"]["object"]["id"]
        ).exists()
        response = client.post(
            reverse("stripe-webhooks-contributions"), data=customer_subscription_updated_event, **header
        )
        assert response.status_code == status.HTTP_200_OK
        assert logger_spy.call_args == mocker.call(
            "Could not find contribution. Here's the event data: %s", mocker.ANY, exc_info=True
        )


@pytest.mark.django_db
def test_customer_subscription_untracked_event(client, customer_subscription_updated_event, mocker):
    mock_log_warning = mocker.patch("apps.contributions.webhooks.logger.warning")
    mocker.patch.object(WebhookSignature, "verify_header", return_value=True)
    header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
    ContributionFactory(
        annual_subscription=True,
        provider_subscription_id=customer_subscription_updated_event["data"]["object"]["id"],
    )
    customer_subscription_updated_event["type"] = "untracked-event"
    response = client.post(reverse("stripe-webhooks-contributions"), data=customer_subscription_updated_event, **header)
    assert response.status_code == status.HTTP_200_OK
    mock_log_warning.assert_called_once_with(
        "StripeWebhookProcessor.route_request received unexpected event type %s",
        customer_subscription_updated_event["type"],
    )


@pytest.mark.django_db
@pytest.mark.usefixtures("_suppress_stripe_webhook_sig_verification")
@pytest.mark.parametrize(
    ("interval", "expect_reminder_email"),
    [
        (ContributionInterval.MONTHLY, False),
        (ContributionInterval.YEARLY, True),
    ],
)
@pytest.mark.parametrize("contribution_found", [True, False])
def test_invoice_upcoming(interval, expect_reminder_email, contribution_found, client, invoice_upcoming_event, mocker):
    mock_send_reminder = mocker.patch.object(Contribution, "send_recurring_contribution_email_reminder")
    contribution = (
        ContributionFactory(
            interval=interval, provider_subscription_id=invoice_upcoming_event["data"]["object"]["subscription"]
        )
        if contribution_found
        else None
    )
    header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
    response = client.post(reverse("stripe-webhooks-contributions"), data=invoice_upcoming_event, **header)
    assert response.status_code == status.HTTP_200_OK
    if not contribution_found:
        return
    if expect_reminder_email:
        mock_send_reminder.assert_called_once_with(
            make_aware(
                datetime.datetime.fromtimestamp(  # noqa: DTZ006  handled by make_aware
                    invoice_upcoming_event["data"]["object"]["next_payment_attempt"]
                )
            ).date()
        )
    else:
        mock_send_reminder.assert_not_called()

    if expect_reminder_email and contribution_found:
        mock_send_reminder.assert_called_once_with(
            make_aware(
                datetime.datetime.fromtimestamp(  # noqa: DTZ006  handled by make_aware
                    invoice_upcoming_event["data"]["object"]["next_payment_attempt"]
                )
            ).date()
        )
    else:
        mock_send_reminder.assert_not_called()
    contribution.refresh_from_db()


def test_process_stripe_webhook_when_value_error_raised(mocker, client):
    mocker.patch("stripe.Webhook.construct_event", side_effect=ValueError("ruh roh"))
    logger_spy = mocker.patch("apps.contributions.views.webhooks.logger.warning")
    header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
    response = client.post(reverse("stripe-webhooks-contributions"), data={}, **header)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"error": "Invalid payload"}
    assert logger_spy.call_args == mocker.call("Invalid payload from Stripe webhook request")


@pytest.mark.django_db
@pytest.mark.usefixtures("_suppress_stripe_webhook_sig_verification")
class TestChargeRefunded:
    def test_happy_path(
        self,
        mocker,
        charge_refunded,
        balance_transaction_for_one_time_charge,
        payment_intent_for_one_time_contribution,
        client,
    ):
        count = Payment.objects.count()
        balance_transaction_for_one_time_charge["source"]["payment_intent"] = (
            pi_id := payment_intent_for_one_time_contribution.id
        )
        ContributionFactory(
            interval=ContributionInterval.ONE_TIME,
            status=ContributionStatus.PAID,
            provider_payment_id=pi_id,
        )
        mocker.spy(Payment, "from_stripe_charge_refunded_event")
        mocker.patch("stripe.PaymentIntent.retrieve", return_value=payment_intent_for_one_time_contribution)
        mocker.patch("stripe.BalanceTransaction.retrieve", return_value=balance_transaction_for_one_time_charge)
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        response = client.post(reverse("stripe-webhooks-contributions"), data=charge_refunded, **header)
        assert response.status_code == status.HTTP_200_OK
        Payment.from_stripe_charge_refunded_event.assert_called_once_with(event=StripeEventData(**charge_refunded))
        assert Payment.objects.count() == count + 1


@pytest.mark.django_db
@pytest.mark.usefixtures("_suppress_stripe_webhook_sig_verification")
class TestInvoicePaymentSucceeded:
    @pytest.fixture
    def invoice_payment_succeeded_for_first_payment_event(self):
        with Path("apps/contributions/tests/fixtures/invoice-payment-succeeded-event.json").open() as f:
            return json.load(f)

    @pytest.fixture
    def payment_intent_for_recurring_charge_expanded(self):
        with Path(
            "apps/contributions/tests/fixtures/payment-intent-for-first-charge-on-subscription-invoice-expanded.json"
        ).open() as f:
            return stripe.PaymentIntent.construct_from(json.load(f), key="test")

    @pytest.fixture
    def payment_intent_for_subscription_creation_charge_expanded(self):
        with Path(
            "apps/contributions/tests/fixtures/payment-intent-for-first-charge-on-subscription-invoice-expanded.json"
        ).open() as f:
            return stripe.PaymentIntent.construct_from(json.load(f), key="test")

    @pytest.fixture(
        params=[
            (
                "invoice_payment_succeeded_for_first_payment_event",
                "payment_intent_for_subscription_creation_charge_expanded",
                "balance_transaction_for_subscription_creation_charge",
                True,
            ),
            (
                "invoice_payment_succeeded_for_recurring_payment_event",
                "payment_intent_for_recurring_charge_expanded",
                "balance_transaction_for_recurring_charge",
                False,
            ),
        ]
    )
    def happy_path_test_case(self, payment_method, request, mocker):
        event = request.getfixturevalue(request.param[0])
        pi = request.getfixturevalue(request.param[1])
        pi.payment_method = payment_method.id
        balance_transaction = request.getfixturevalue(request.param[2])
        is_first_payment = request.param[3]
        event["data"]["object"]["payment_intent"] = pi.id
        event["data"]["object"]["payment_method"] = payment_method.id
        event["data"]["object"]["subscription"] = pi.invoice.subscription
        contribution = ContributionFactory(
            interval=ContributionInterval.YEARLY,
            status=ContributionStatus.PROCESSING if is_first_payment else ContributionStatus.PAID,
            provider_subscription_id=pi.invoice.subscription,
            last_payment_date=(
                None
                if is_first_payment
                else datetime.datetime.fromtimestamp(balance_transaction.created, tz=datetime.timezone.utc)
                - datetime.timedelta(days=365)
            ),
            provider_payment_id=pi.id if is_first_payment else "some-other-id",
            provider_payment_method_id=None,
        )
        if not is_first_payment:
            PaymentFactory(
                contribution=contribution,
                stripe_balance_transaction_id="bt_fake_01",
                net_amount_paid=contribution.amount,
                gross_amount_paid=contribution.amount,
                amount_refunded=0,
            )
        mocker.patch("stripe.PaymentIntent.retrieve", return_value=pi)
        mocker.patch("stripe.BalanceTransaction.retrieve", return_value=balance_transaction)
        return event, contribution, is_first_payment, payment_method

    def test_happy_path(self, happy_path_test_case, mocker, client):
        event, contribution, is_first_payment, payment_method = happy_path_test_case
        count = Payment.objects.count()
        mocker.spy(Payment, "from_stripe_invoice_payment_succeeded_event")
        mock_send_receipt = mocker.patch("apps.emails.models.TransactionalEmailRecord.handle_receipt_email")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        response = client.post(reverse("stripe-webhooks-contributions"), data=event, **header)
        assert response.status_code == status.HTTP_200_OK
        Payment.from_stripe_invoice_payment_succeeded_event.assert_called_once_with(event=StripeEventData(**event))
        assert Payment.objects.count() == count + 1
        contribution.refresh_from_db()
        assert contribution.status == ContributionStatus.PAID
        assert contribution.last_payment_date == contribution.payment_set.order_by("-created").first().created
        assert contribution.provider_payment_method_id == payment_method.id
        if is_first_payment:
            mock_send_receipt.assert_called_once()
        else:
            mock_send_receipt.assert_not_called()
