"""test_webhooks.py.

Tests for the Stripe webhook processor.

In general, we try to test at API layer (in conjunction with synchronous task execution), but there are a few methods on the
processor class that are worth unit testing in isolation.
"""

import pytest

from apps.contributions.models import Contribution
from apps.contributions.tests.factories import ContributionFactory
from apps.contributions.types import StripeEventData
from apps.contributions.webhooks import StripeWebhookProcessor


@pytest.mark.django_db()
@pytest.mark.usefixtures("_suppress_stripe_webhook_sig_verification")
class TestStripeWebhookProcessor:
    @pytest.fixture()
    def payment_intent_test_case(self, payment_intent_succeeded_one_time_event):
        contribution = ContributionFactory(
            provider_payment_id=payment_intent_succeeded_one_time_event["data"]["object"]["id"]
        )
        return payment_intent_succeeded_one_time_event, contribution

    @pytest.fixture()
    def invoice_test_case(self, invoice_upcoming_event):
        contribution = ContributionFactory(
            provider_subscription_id=invoice_upcoming_event["data"]["object"]["subscription"]
        )
        return invoice_upcoming_event, contribution

    @pytest.fixture()
    def charge_test_case(self, charge_refunded_recurring_charge_event):
        contribution = ContributionFactory(
            provider_payment_id=charge_refunded_recurring_charge_event["data"]["object"]["payment_intent"]
        )
        return charge_refunded_recurring_charge_event, contribution

    @pytest.fixture()
    def subscription_test_case(self, customer_subscription_updated_event):
        contribution = ContributionFactory(
            provider_subscription_id=customer_subscription_updated_event["data"]["object"]["id"]
        )
        return customer_subscription_updated_event, contribution

    @pytest.fixture(
        params=[
            "payment_intent_test_case",
            "invoice_test_case",
            "charge_test_case",
            "subscription_test_case",
        ]
    )
    def contribution_test_case(self, request):
        event, contribution = request.getfixturevalue(request.param)
        return StripeEventData(**event), contribution

    @pytest.mark.parametrize("contribution_found", [True, False])
    def test_contribution_property(self, contribution_test_case, contribution_found):
        event, contribution = contribution_test_case
        if not contribution_found:
            Contribution.objects.all().delete()
        processor = StripeWebhookProcessor(event=event)
        if contribution_found:
            assert processor.contribution == contribution
        else:
            assert processor.contribution is None

    def test_contribution_property_when_unexpected_object_type(self, mocker, payment_intent_succeeded_one_time_event):
        mocker.patch("apps.contributions.webhooks.StripeWebhookProcessor.object_type", return_value="unexpected")
        processor = StripeWebhookProcessor(event=StripeEventData(**payment_intent_succeeded_one_time_event))
        assert processor.contribution is None

    @pytest.fixture()
    def unexpected_event(self, payment_intent_succeeded_one_time_event):
        return StripeEventData(**payment_intent_succeeded_one_time_event | {"type": "unexpected"})

    def test_contribution_when_unexpected_object_type(self, unexpected_event, mocker):
        processor = StripeWebhookProcessor(unexpected_event)
        assert processor.contribution is None

    @pytest.mark.parametrize(
        ("event_live_mode", "settings_live_mode", "expected"),
        [
            (True, True, True),
            (False, False, True),
            (True, False, False),
            (False, True, False),
        ],
    )
    def test_webhook_live_mode_agrees_with_environment(
        self, event_live_mode, payment_intent_succeeded_one_time_event, settings_live_mode, expected, settings
    ):
        settings.STRIPE_LIVE_MODE = settings_live_mode
        processor = StripeWebhookProcessor(
            event=StripeEventData(**payment_intent_succeeded_one_time_event | {"livemode": event_live_mode})
        )
        assert processor.webhook_live_mode_agrees_with_environment == expected

    @pytest.mark.parametrize("agrees", [True, False])
    @pytest.mark.parametrize("contribution_found", [True, False])
    def test_process(self, agrees, contribution_found, mocker, payment_intent_succeeded_one_time_event):
        mocker.patch.object(
            StripeWebhookProcessor,
            "webhook_live_mode_agrees_with_environment",
            return_value=agrees,
            new_callable=mocker.PropertyMock,
        )
        mock_route_request = mocker.patch.object(StripeWebhookProcessor, "route_request")
        logger_spy = mocker.patch("apps.contributions.webhooks.logger.warning")
        if contribution_found:
            mocker.patch("apps.contributions.webhooks.StripeWebhookProcessor.contribution")
        else:
            Contribution.objects.all().delete()

        if contribution_found:
            StripeWebhookProcessor(payment_intent_succeeded_one_time_event).process()
            if agrees:
                mock_route_request.assert_called_once()
                logger_spy.assert_not_called()
            else:
                logger_spy.assert_called_once()
                mock_route_request.assert_not_called()

        elif agrees:
            with pytest.raises(Contribution.DoesNotExist):
                StripeWebhookProcessor(payment_intent_succeeded_one_time_event).process()

    def test__handle_contribution_update_when_no_contribution(self, mocker, payment_intent_succeeded_one_time_event):
        mocker.patch(
            "apps.contributions.webhooks.StripeWebhookProcessor.contribution",
            return_value=None,
            new_callable=mocker.PropertyMock,
        )
        processor = StripeWebhookProcessor(event=StripeEventData(**payment_intent_succeeded_one_time_event))
        with pytest.raises(Contribution.DoesNotExist):
            processor._handle_contribution_update({}, "")

    @pytest.mark.parametrize("has_pm_id", [True, False])
    def test__add_pm_id_and_payment_method_details(self, mocker, has_pm_id, payment_intent_succeeded_one_time_event):
        processor = StripeWebhookProcessor(event=StripeEventData(**payment_intent_succeeded_one_time_event))
        mocker.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=mocker.Mock())
        mocker.patch.object(
            processor, "contribution", new_callable=mocker.PropertyMock, return_value=ContributionFactory()
        )
        processor._add_pm_id_and_payment_method_details(pm_id="pm_id" if has_pm_id else None, update_data={})

    def test__handle_pm_update_event_when_no_update(self, mocker, payment_intent_succeeded_one_time_event):
        processor = StripeWebhookProcessor(event=StripeEventData(**payment_intent_succeeded_one_time_event))
        mocker.patch.object(processor, "contribution", return_value=None, new_callable=mocker.PropertyMock)
        processor._add_pm_id_and_payment_method_details(pm_id="pm_id", update_data={})

    def test_handle_payment_method_attached_when_no_customer_id(self, mocker, payment_method_attached_event):
        payment_method_attached_event["data"]["object"]["customer"] = None
        processor = StripeWebhookProcessor(event=StripeEventData(**payment_method_attached_event))
        mocker.patch.object(processor, "contribution", return_value=None, new_callable=mocker.PropertyMock)
        mock_update_pm = mocker.patch.object(processor, "_handle_pm_update_event")
        processor.handle_payment_method_attached()
        mock_update_pm.assert_not_called()

    def test_handle_charge_succeeded_when_payment_intent_is_null(self, mocker, charge_succeeded_event):
        mock_logger = mocker.patch("apps.contributions.webhooks.logger.warning")
        charge_succeeded_event["data"]["object"]["payment_intent"] = None
        processor = StripeWebhookProcessor(event=StripeEventData(**charge_succeeded_event))
        mock_update_pm = mocker.patch.object(processor, "_handle_pm_update_event")
        mocker.patch.object(processor, "contribution", return_value=None, new_callable=mocker.PropertyMock)
        processor.handle_charge_succeeded()
        mock_logger.assert_called_once_with(
            "No payment intent ID found in charge succeeded event with id %s for account %s",
            charge_succeeded_event["id"],
            processor.event.account,
        )
        mock_update_pm.assert_not_called()
