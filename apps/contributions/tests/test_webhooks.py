"""test_webhooks.py.

Tests for the Stripe webhook processor.

In general, we try to test at API layer (in conjunction with synchronous task execution), but there are a few methods on the
processor class that are worth unit testing in isolation.
"""

import json

import pytest
import pytest_mock
from stripe.api_resources.event import Event

from apps.contributions.models import Contribution
from apps.contributions.tests.factories import ContributionFactory, PaymentFactory
from apps.contributions.typings import (
    STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS,
    InvalidMetadataError,
    StripeEventData,
    cast_metadata_to_stripe_payment_metadata_schema,
)
from apps.contributions.webhooks import StripeWebhookProcessor


@pytest.mark.django_db
@pytest.mark.usefixtures("_suppress_stripe_webhook_sig_verification")
class TestStripeWebhookProcessor:
    @pytest.fixture
    def payment_intent_test_case(self, payment_intent_succeeded_one_time_event):
        contribution = ContributionFactory(
            provider_payment_id=payment_intent_succeeded_one_time_event["data"]["object"]["id"]
        )
        return payment_intent_succeeded_one_time_event, contribution

    @pytest.fixture
    def invoice_test_case(self, invoice_upcoming_event):
        contribution = ContributionFactory(
            provider_subscription_id=invoice_upcoming_event["data"]["object"]["subscription"]
        )
        return invoice_upcoming_event, contribution

    @pytest.fixture
    def charge_test_case(self, charge_refunded_recurring_charge_event):
        contribution = ContributionFactory(
            provider_payment_id=charge_refunded_recurring_charge_event["data"]["object"]["payment_intent"]
        )
        return charge_refunded_recurring_charge_event, contribution

    @pytest.fixture
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

    @pytest.fixture
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

    def test_process_when_metadata_schema_version_1_6(
        self, mocker: pytest_mock.MockerFixture, payment_intent_succeeded_one_time_event: Event, valid_metadata: dict
    ):
        ContributionFactory(
            provider_payment_id=payment_intent_succeeded_one_time_event["data"]["object"]["id"],
            contribution_metadata={**valid_metadata, "schema_version": "1.6"},
        )
        mock_route_request = mocker.patch("apps.contributions.webhooks.StripeWebhookProcessor.route_request")
        processor = StripeWebhookProcessor(event=StripeEventData(**payment_intent_succeeded_one_time_event))
        processor.process()
        mock_route_request.assert_not_called()

    @pytest.mark.parametrize(
        ("has_contribution", "has_metadata", "schema_version", "expect"),
        [
            (False, False, None, False),
            (True, False, None, False),
            (True, True, "1.4", False),
            (True, True, "1.6", True),
        ],
    )
    def test_ignore_for_metadata_schema_version_1_6(
        self, has_contribution: bool, has_metadata: bool, schema_version: str | None, expect: bool
    ):
        contribution = None
        if has_contribution:
            kwargs = {}
            if has_metadata:
                kwargs["contribution_metadata"] = {"schema_version": schema_version}
            contribution = ContributionFactory(**kwargs)
        assert StripeWebhookProcessor.ignore_for_metadata_schema_version_1_6(contribution) is expect

    def test__handle_contribution_update_when_no_contribution(self, mocker, payment_intent_succeeded_one_time_event):
        mocker.patch(
            "apps.contributions.webhooks.StripeWebhookProcessor.contribution",
            return_value=None,
            new_callable=mocker.PropertyMock,
        )
        processor = StripeWebhookProcessor(event=StripeEventData(**payment_intent_succeeded_one_time_event))
        with pytest.raises(Contribution.DoesNotExist):
            processor._handle_contribution_update({}, "")

    @pytest.mark.parametrize("stripe_has_metadata", [True, False])
    def test__handle_contribution_update_metadata_updates_metadata(
        self,
        stripe_has_metadata,
        mocker,
        payment_intent_succeeded_one_time_event,
    ):
        mock_get_metadata_update_value = mocker.patch(
            "apps.contributions.webhooks.StripeWebhookProcessor.get_metadata_update_value",
            return_value={"foo": "bar"},
        )
        if stripe_has_metadata:
            payment_intent_succeeded_one_time_event["data"]["object"]["metadata"] = {
                "something": "truthy",
            }
        else:
            payment_intent_succeeded_one_time_event["data"]["object"]["metadata"] = {}

        processor = StripeWebhookProcessor(event=StripeEventData(**payment_intent_succeeded_one_time_event))
        mocker.patch.object(
            processor, "contribution", new_callable=mocker.PropertyMock, return_value=ContributionFactory()
        )
        processor._handle_contribution_update(
            update_data={"amount": 10000},
            revision_comment="test",
        )
        if stripe_has_metadata:
            mock_get_metadata_update_value.assert_called_once()
        else:
            mock_get_metadata_update_value.assert_not_called()

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

    def test__handle_pm_update_event_when_v1_6_metadata(
        self, mocker, payment_intent_succeeded_one_time_event, valid_metadata: dict
    ):
        processor = StripeWebhookProcessor(event=StripeEventData(**payment_intent_succeeded_one_time_event))
        contribution = ContributionFactory(
            provider_payment_id=payment_intent_succeeded_one_time_event["data"]["object"]["id"],
            contribution_metadata={**valid_metadata, "schema_version": "1.6"},
        )
        mocker.patch.object(processor, "contribution", return_value=contribution, new_callable=mocker.PropertyMock)
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

    @pytest.fixture
    def contribution_metadata(self):
        """Meant to represent observed saved metadata in contribution generated through normal checkout.

        ...as distinct from metadata that gets stored on Stripe objects (which drops null valued entries)
        """
        return {
            "source": "rev-engine",
            "honoree": None,
            "referer": "https://foo.bar.org/donate/",
            "company_name": None,
            "in_memory_of": None,
            "swag_choices": None,
            "swag_opt_out": False,
            "contributor_id": "999",
            "schema_version": "1.4",
            "sf_campaign_id": None,
            "comp_subscription": None,
            "reason_for_giving": None,
            "agreed_to_pay_fees": False,
            "revenue_program_id": "3",
            "revenue_program_slug": "fooobar",
            "donor_selected_amount": 365.0,
        }

    @pytest.fixture
    def subscription_metadata(self):
        """Meant to represent observed Stripe subscription (or PI) metadata.

        ... as distinct from Contribution.contribution_metadata, which is used to create metadata on Stripe,
        but which does not drop null-valued entries.
        """
        return {
            "agreed_to_pay_fees": "False",
            "contributor_id": "999",
            "donor_selected_amount": "365.0",
            "referer": "https://foo.bar.org/donate/",
            "revenue_program_id": "3",
            "revenue_program_slug": "fooobar",
            "schema_version": "1.4",
            "source": "rev-engine",
            "swag_opt_out": "False",
        }

    @pytest.fixture
    def subscription_metadata_changed(self, subscription_metadata):
        return subscription_metadata | {
            "agreed_to_pay_fees": "False",
            "donor_selected_amount": "399.0",
            "swag_opt_out": "True",
            "reason_for_giving": "I love the cause",
        }

    @pytest.mark.parametrize(
        ("meta_con", "meta_stripe", "expected"),
        [
            (None, None, None),
            (None, "subscription_metadata", "subscription_metadata"),
            ("contribution_metadata", "subscription_metadata", None),
            ("contribution_metadata", "subscription_metadata_changed", "subscription_metadata_changed"),
            ("contribution_metadata", None, None),
        ],
    )
    def test_get_metadata_update_value(
        self, request, payment_intent_succeeded_one_time_event, meta_con, meta_stripe, expected
    ):
        contribution_metadata = request.getfixturevalue(meta_con) if meta_con else None
        stripe_metadata = request.getfixturevalue(meta_stripe) if meta_stripe else None
        expected = request.getfixturevalue(expected) if expected else None

        processor = StripeWebhookProcessor(event=payment_intent_succeeded_one_time_event)

        if expected:
            assert processor.get_metadata_update_value(
                contribution_metadata=contribution_metadata, stripe_metadata=stripe_metadata
            ) == (json.loads(cast_metadata_to_stripe_payment_metadata_schema(expected).model_dump_json()))
        else:
            assert (
                processor.get_metadata_update_value(
                    contribution_metadata=contribution_metadata, stripe_metadata=stripe_metadata
                )
                == {}
            )

    def test_get_metadata_update_value_when_invalid_metadata_error_contribution(
        self, payment_intent_succeeded_one_time_event, mocker, contribution_metadata
    ):
        mock_get_metadata = mocker.patch(
            "apps.contributions.webhooks.cast_metadata_to_stripe_payment_metadata_schema",
            side_effect=InvalidMetadataError("Uh oh!"),
        )
        processor = StripeWebhookProcessor(event=payment_intent_succeeded_one_time_event)
        assert (
            processor.get_metadata_update_value(contribution_metadata=contribution_metadata, stripe_metadata=None) == {}
        )
        mock_get_metadata.assert_called_once_with(contribution_metadata)

    def test_get_metadata_update_value_when_invalid_metadata_error_stripe(
        self, payment_intent_succeeded_one_time_event, mocker, contribution_metadata, subscription_metadata_changed
    ):
        mock_get_metadata = mocker.patch(
            "apps.contributions.webhooks.cast_metadata_to_stripe_payment_metadata_schema",
            side_effect=[True, InvalidMetadataError],
        )
        processor = StripeWebhookProcessor(event=payment_intent_succeeded_one_time_event)
        assert (
            processor.get_metadata_update_value(
                contribution_metadata=contribution_metadata, stripe_metadata=subscription_metadata_changed
            )
            == {}
        )

        assert mock_get_metadata.call_count == 2
        assert mock_get_metadata.call_args_list[0] == mocker.call(contribution_metadata)

    @pytest.mark.parametrize(
        ("schema_version", "expect_send"),
        [
            ("1.4", True),
            *[(k, False) for k in STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS if k != "1.4"],
        ],
    )
    def test_handle_invoice_payment_succeeded_receipt_email_per_schema(
        self, schema_version, expect_send, invoice_payment_succeeded_for_recurring_payment_event, mocker
    ):
        contribution = ContributionFactory(
            provider_subscription_id=invoice_payment_succeeded_for_recurring_payment_event["data"]["object"][
                "subscription"
            ],
        )
        contribution.contribution_metadata["schema_version"] = schema_version
        contribution.save()
        mock_send_receipt = mocker.patch("apps.emails.models.TransactionalEmailRecord.handle_receipt_email")
        payment = PaymentFactory(contribution=contribution)
        mocker.patch(
            "apps.contributions.models.Payment.from_stripe_invoice_payment_succeeded_event",
            return_value=payment,
        )
        mocker.patch("stripe.PaymentIntent.retrieve")
        mocker.patch("apps.contributions.webhooks.StripeWebhookProcessor._add_pm_id_and_payment_method_details")
        mocker.patch("apps.contributions.webhooks.StripeWebhookProcessor._handle_contribution_update")
        mocker.patch(
            "apps.contributions.webhooks.StripeWebhookProcessor.contribution",
            return_value=contribution,
            new_callable=mocker.PropertyMock,
        )
        processor = StripeWebhookProcessor(
            event=StripeEventData(**invoice_payment_succeeded_for_recurring_payment_event)
        )
        processor.handle_invoice_payment_succeeded()
        if expect_send:
            mock_send_receipt.assert_called_once_with(contribution=contribution, show_billing_history=False)
        else:
            mock_send_receipt.assert_not_called()

    @pytest.mark.parametrize(
        ("schema_version", "expect_send"),
        [
            ("1.4", True),
            *[(k, False) for k in STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS if k != "1.4"],
        ],
    )
    def test_handle_payment_intent_succeeded_receipt_email_per_schema(
        self, schema_version, expect_send, mocker, payment_intent_succeeded_one_time_event
    ):
        contribution = ContributionFactory(
            provider_payment_id=payment_intent_succeeded_one_time_event["data"]["object"]["id"]
        )
        contribution.contribution_metadata["schema_version"] = schema_version
        contribution.save()
        mock_send_receipt = mocker.patch("apps.emails.models.TransactionalEmailRecord.handle_receipt_email")
        payment = PaymentFactory(contribution=contribution)
        mocker.patch(
            "apps.contributions.models.Payment.from_stripe_payment_intent_succeeded_event", return_value=payment
        )
        mocker.patch(
            "apps.contributions.webhooks.StripeWebhookProcessor.contribution",
            return_value=contribution,
            new_callable=mocker.PropertyMock,
        )
        mocker.patch("apps.contributions.webhooks.StripeWebhookProcessor._add_pm_id_and_payment_method_details")
        mocker.patch("apps.contributions.webhooks.StripeWebhookProcessor._handle_contribution_update")
        processor = StripeWebhookProcessor(event=StripeEventData(**payment_intent_succeeded_one_time_event))
        processor.handle_payment_intent_succeeded()
        if expect_send:
            mock_send_receipt.assert_called_once_with(contribution=contribution, show_billing_history=False)
        else:
            mock_send_receipt.assert_not_called()
