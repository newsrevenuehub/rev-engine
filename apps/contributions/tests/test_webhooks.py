"""test_webhooks.py

Tests for the Stripe webhook processor.

In general, we try to test at API layer (in conjunction with synchronous task execution), but there are a few methods on the
processor class that are worth unit testing in isolation.
"""
import pytest

from apps.contributions.models import Contribution
from apps.contributions.tests.factories import ContributionFactory
from apps.contributions.webhooks import StripeWebhookProcessor


@pytest.fixture
def subscription_event():
    return {
        "id": "evt_1J4X2n2eZvKYlo2C0QYQXZ0K",
        "data": {
            "object": {
                "object": "subscription",
                "id": "sub_1J4X2n2eZvKYlo2C0QYQXZ0K",
            }
        },
    }


@pytest.fixture
def payment_method_event():
    return {
        "id": "evt_1J4X2n2eZvKYlo2C0QYQXZ0K",
        "data": {
            "object": {
                "object": "payment_method",
                "id": "pm_1J4X2n2eZvKYlo2C0QYQXZ0K",
                "customer": "cus_1J4X2n2eZvKYlo2C0QYQXZ0K",
            }
        },
    }


@pytest.fixture()
def payment_intent_event():
    return {
        "id": "evt_1J4X2n2eZvKYlo2C0QYQXZ0K",
        "data": {
            "object": {
                "id": "pi_1J4X2n2eZvKYlo2C0QYQXZ0K",
                "object": "payment_intent",
                "customer": "cus_1J4X2n2eZvKYlo2C0QYQXZ0K",
            }
        },
    }


@pytest.fixture
def invoice_event():
    return {
        "id": "evt_1J4X2n2eZvKYlo2C0QYQXZ0K",
        "data": {
            "object": {
                "object": "invoice",
                "subscription": "sub_1J4X2n2eZvKYlo2C0QYQXZ0K",
            }
        },
    }


@pytest.mark.django_db
class TestStripeWebhookProcessor:
    @pytest.mark.parametrize("found", [True, False])
    def test_contribution_when_subscription(self, found, subscription_event):
        contribution = (
            ContributionFactory(provider_subscription_id=subscription_event["data"]["object"]["id"]) if found else None
        )
        processor = StripeWebhookProcessor(subscription_event)
        if found:
            assert processor.contribution == contribution
        else:
            with pytest.raises(Contribution.DoesNotExist):
                processor.contribution

    @pytest.mark.parametrize(
        "found_by_customer_id, found_by_provider_payment_id, expect_found",
        [
            (True, True, True),
            (True, False, True),
            (False, True, True),
            (False, False, False),
        ],
    )
    def test_contribution_when_payment_intent(
        self, found_by_customer_id, found_by_provider_payment_id, expect_found, payment_intent_event
    ):
        data = {}
        if found_by_customer_id:
            data["provider_customer_id"] = payment_intent_event["data"]["object"]["customer"]
        if found_by_provider_payment_id:
            data["provider_payment_id"] = payment_intent_event["data"]["object"]["id"]
        contribution = ContributionFactory(**data)
        processor = StripeWebhookProcessor(payment_intent_event)
        if expect_found:
            assert processor.contribution == contribution
        else:
            with pytest.raises(Contribution.DoesNotExist):
                processor.contribution

    @pytest.mark.parametrize("found", [True, False])
    def test_contribution_when_payment_method(self, found, payment_method_event):
        contribution = (
            ContributionFactory(provider_customer_id=payment_method_event["data"]["object"]["customer"])
            if found
            else None
        )
        processor = StripeWebhookProcessor(payment_method_event)
        if found:
            assert processor.contribution == contribution
        else:
            with pytest.raises(Contribution.DoesNotExist):
                processor.contribution

    @pytest.mark.parametrize("found", [True, False])
    def test_contribution_when_invoice(self, found, invoice_event):
        contribution = (
            ContributionFactory(provider_subscription_id=invoice_event["data"]["object"]["subscription"])
            if found
            else None
        )
        processor = StripeWebhookProcessor(invoice_event)
        if found:
            assert processor.contribution == contribution
        else:
            with pytest.raises(Contribution.DoesNotExist):
                processor.contribution

    @pytest.mark.parametrize(
        "event_live_mode,settings_live_mode,expected",
        (
            (True, True, True),
            (False, False, True),
            (True, False, False),
            (False, True, False),
        ),
    )
    def test_webhook_live_mode_agrees_with_environment(self, event_live_mode, settings_live_mode, expected, settings):
        settings.STRIPE_LIVE_MODE = settings_live_mode
        processor = StripeWebhookProcessor({"livemode": event_live_mode, "id": "test_id", "account": "test_account"})
        assert processor.webhook_live_mode_agrees_with_environment == expected

    @pytest.mark.parametrize("agrees", [True, False])
    def test_process(self, agrees, mocker):
        mocker.patch.object(
            StripeWebhookProcessor,
            "webhook_live_mode_agrees_with_environment",
            return_value=agrees,
            new_callable=mocker.PropertyMock,
        )
        mock_route_request = mocker.patch.object(StripeWebhookProcessor, "route_request")
        logger_spy = mocker.patch("apps.contributions.webhooks.logger.warning")
        StripeWebhookProcessor({}).process()
        if agrees:
            mock_route_request.assert_called_once()
            logger_spy.assert_not_called()
        else:
            mock_route_request.assert_not_called()
            logger_spy.assert_called_once()
