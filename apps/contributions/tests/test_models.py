import datetime
import json
import re
from datetime import timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core import mail
from django.db import IntegrityError
from django.template.loader import render_to_string

import pytest
import pytest_mock
import reversion
import stripe
from addict import Dict as AttrDict
from bs4 import BeautifulSoup
from pytest_mock import MockerFixture

from apps.activity_log.models import ActivityLog
from apps.common.utils import CREATED, LEFT_UNCHANGED
from apps.contributions.exceptions import InvalidMetadataError
from apps.contributions.models import (
    BillingHistoryItem,
    Contribution,
    ContributionInterval,
    ContributionIntervalError,
    ContributionQuerySet,
    ContributionStatus,
    ContributionStatusError,
    Contributor,
    Payment,
    ensure_stripe_event,
    logger,
)
from apps.contributions.serializers import STRIPE_MAX_AMOUNT
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
    PaymentFactory,
)
from apps.contributions.typings import StripeEventData, cast_metadata_to_stripe_payment_metadata_schema
from apps.emails.helpers import convert_to_timezone_formatted
from apps.emails.tasks import generate_email_data, send_templated_email
from apps.organizations.models import FreePlan
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory, StyleFactory
from apps.users.choices import Roles


class MockSubscription:
    def __init__(self, status):
        self.status = status


@pytest.mark.django_db
class TestContributorModel:
    @pytest.fixture
    def customer_id(self, faker):
        return faker.pystr_format(string_format="cus_??????")

    @pytest.fixture
    def one_time_contribution_with_payment(self, contributor_user, faker, customer_id):
        contribution = ContributionFactory(
            one_time=True,
            provider_customer_id=customer_id,
            contributor=contributor_user,
        )
        PaymentFactory(
            contribution=contribution,
            amount_refunded=0,
            gross_amount_paid=contribution.amount,
            net_amount_paid=contribution.amount - 100,
        )
        return contribution

    @pytest.fixture
    def one_time_contribution_with_refund(self, contributor_user, faker, customer_id):
        contribution = ContributionFactory(
            one_time=True,
            provider_customer_id=customer_id,
            contributor=contributor_user,
        )
        PaymentFactory(
            contribution=contribution,
            amount_refunded=0,
            gross_amount_paid=contribution.amount,
            net_amount_paid=contribution.amount - 100,
        )
        PaymentFactory(
            contribution=contribution,
            amount_refunded=contribution.amount - 100,
            gross_amount_paid=contribution.amount,
            net_amount_paid=0,
        )
        return contribution

    @pytest.fixture
    def monthly_contribution_multiple_payments(
        self,
        contributor_user,
        customer_id,
    ):
        then = datetime.datetime.now(datetime.timezone.utc) - timedelta(days=30)
        contribution = ContributionFactory(
            monthly_subscription=True,
            status=ContributionStatus.CANCELED,
            created=then,
            contributor=contributor_user,
            provider_customer_id=customer_id,
        )
        for x in (then, then + timedelta(days=30)):
            PaymentFactory(
                created=x,
                contribution=contribution,
                amount_refunded=0,
                gross_amount_paid=contribution.amount,
                net_amount_paid=contribution.amount - 100,
            )
        return contribution

    @pytest.fixture
    def portal_contributor_with_multiple_contributions_from_different_rps(
        self,
        monthly_contribution_multiple_payments,
        one_time_contribution_with_payment,
        one_time_contribution_with_refund,
    ):
        return monthly_contribution_multiple_payments.contributor

    @pytest.fixture(
        params=[
            "one_time_contribution_with_payment",
            "one_time_contribution_with_refund",
            "monthly_contribution_multiple_payments",
        ]
    )
    def contribution(self, request):
        return request.getfixturevalue(request.param)

    def test__str__(self, contributor_user):
        assert str(contributor_user) == contributor_user.email

    def test_is_authenticated(self, contributor_user):
        assert contributor_user.is_authenticated is True

    def test_is_superuser(self, contributor_user):
        assert contributor_user.is_superuser is False

    def test_get_impact(self, contribution, contributor_user):
        total_paid = 0
        total_refunded = 0
        for payment in contribution.payment_set.all():
            total_paid += payment.net_amount_paid
            total_refunded += payment.amount_refunded

        assert contributor_user.get_impact() == {
            "total": total_paid - total_refunded,
            "total_paid": total_paid,
            "total_refunded": total_refunded,
        }

    def test_get_impact_with_no_contributions(self, contributor_user):
        assert contributor_user.contribution_set.count() == 0
        assert contributor_user.get_impact() == {"total": 0, "total_paid": 0, "total_refunded": 0}

    def test_get_impact_with_no_payments(self, contributor_user):
        contribution = ContributionFactory(
            one_time=True,
            contributor=contributor_user,
        )
        assert contribution.payment_set.count() == 0
        assert contributor_user.get_impact() == {"total": 0, "total_paid": 0, "total_refunded": 0}

    def test_get_impact_no_rp_filter(self, portal_contributor_with_multiple_contributions_from_different_rps):
        total_paid = 0
        total_refunded = 0
        for contribution in portal_contributor_with_multiple_contributions_from_different_rps.contribution_set.all():
            for payment in contribution.payment_set.all():
                total_paid += payment.net_amount_paid
                total_refunded += payment.amount_refunded

        assert portal_contributor_with_multiple_contributions_from_different_rps.get_impact() == {
            "total": total_paid - total_refunded,
            "total_paid": total_paid,
            "total_refunded": total_refunded,
        }

    def test_get_impact_filter_by_rp_id(
        self, contribution, portal_contributor_with_multiple_contributions_from_different_rps
    ):
        rp_id = contribution.donation_page.revenue_program.id
        total_paid = 0
        total_refunded = 0
        for payment in contribution.payment_set.all():
            total_paid += payment.net_amount_paid
            total_refunded += payment.amount_refunded

        assert portal_contributor_with_multiple_contributions_from_different_rps.get_impact([rp_id]) == {
            "total": total_paid - total_refunded,
            "total_paid": total_paid,
            "total_refunded": total_refunded,
        }

    @pytest.mark.parametrize("pre_exists", [True, False])
    def test_get_or_create_contributor_by_email_case_insensitivity(self, pre_exists):
        email = "test_get_or_create@fundjournalism.org"
        if pre_exists:
            pre_existing = ContributorFactory(email=email.upper())
        contributor, action = Contributor.get_or_create_contributor_by_email(email)
        if pre_exists:
            assert contributor == pre_existing
            assert action == LEFT_UNCHANGED
            assert contributor.email_future is None
        else:
            assert action == CREATED
            assert contributor.email_future == email
        assert isinstance(contributor, Contributor)
        assert contributor.email.lower() == email.lower()
        assert Contributor.objects.filter(email__iexact=email).count() == 1

    @pytest.mark.parametrize("email_future_pre_exists", [True, False])
    def test_get_or_create_contributor_by_email_with_future_email(self, email_future_pre_exists):
        email_future = "email_future@fundjournalism.org"
        if email_future_pre_exists:
            # Given current implementation, we shouldn't ever be able to end up in this state,
            # but as defensive measure, proving that email_future set to None if pre-existing contributor has it set.
            ContributorFactory(
                email="different-email@fundjournalism.org",
                email_future=email_future,
            )
        contributor, _ = Contributor.get_or_create_contributor_by_email(email_future)
        assert contributor.email == email_future
        assert contributor.email_future == (None if email_future_pre_exists else email_future)

    def test_get_contributor_contributions_queryset(self, mocker):
        canonical_contributor = ContributorFactory(email="canonical@fundjournalism.org")
        related_contributor = ContributorFactory(email=canonical_contributor.email.upper())
        for contributor in [canonical_contributor, related_contributor]:
            ContributionFactory(contributor=contributor, status=ContributionStatus.FAILED, one_time=True)
        assert set(contributions := canonical_contributor.get_contributor_contributions_queryset()) == set(
            related_contributor.get_contributor_contributions_queryset()
        )
        assert contributions.count() == 2


test_key = "test_key"


@pytest.fixture
def contribution_with_no_provider_payment_method_id(one_time_contribution):
    one_time_contribution.provider_payment_method_id = None
    one_time_contribution.save()
    return one_time_contribution


@pytest.fixture
def contribution_with_provider_payment_method_id(one_time_contribution):
    one_time_contribution.provider_payment_method_id = "something"
    one_time_contribution.save()
    return one_time_contribution


SHORT_LIVED_ACCESS_TOKEN = "short-lived"


class MockForContributorReturn:
    def __init__(self, *args, **kwargs):
        self.short_lived_access_token = SHORT_LIVED_ACCESS_TOKEN


@pytest.mark.django_db
class TestContributionModel:
    @pytest.fixture(params=["one_time_contribution", "monthly_contribution", "annual_contribution"])
    def contribution(self, request):
        return request.getfixturevalue(request.param)

    @pytest.fixture(
        params=[
            "one_time_contribution_with_payment",
            "monthly_contribution_multiple_payments",
            "monthly_contribution_with_refund",
        ]
    )
    def contribution_billing_history(self, request):
        return request.getfixturevalue(request.param)

    def test_get_billing_history(self, contribution_billing_history: Contribution):
        billing_history = contribution_billing_history.get_billing_history()

        expected_value = [
            BillingHistoryItem(
                payment_date=convert_to_timezone_formatted(payment.transaction_time, "America/New_York"),
                payment_amount=(
                    contribution_billing_history.format_amount(payment.amount_refunded)
                    if payment.amount_refunded
                    else contribution_billing_history.format_amount(payment.gross_amount_paid)
                ),
                payment_status=("Paid" if payment.amount_refunded == 0 else "Refunded"),
            )
            for payment in contribution_billing_history.payment_set.all()
        ]

        assert billing_history == expected_value

    def test_create_stripe_customer(self, contribution, mocker, monkeypatch):
        """Show Contribution.create_stripe_customer calls Stripe with right params and returns the customer object."""
        customer_create_return_val = {"id": "cus_fakefakefake"}
        monkeypatch.setattr("stripe.Customer.create", lambda *args, **kwargs: customer_create_return_val)
        spy = mocker.spy(stripe.Customer, "create")
        call_args = {
            "first_name": "Jane",
            "last_name": "doe",
            "phone": "555-555-5555",
            "mailing_street": "123 Street Lane",
            "mailing_complement": "Ap 1",
            "mailing_city": "Small Town",
            "mailing_state": "OK",
            "mailing_postal_code": "12345",
            "mailing_country": "US",
        }
        customer = contribution.create_stripe_customer(**call_args)
        spy.assert_called_once_with(
            name=(name := f"{call_args['first_name']} {call_args['last_name']}"),
            email=contribution.contributor.email,
            address=(
                address := {
                    "line1": call_args["mailing_street"],
                    "line2": call_args["mailing_complement"] or "",
                    "city": call_args["mailing_city"],
                    "state": call_args["mailing_state"],
                    "postal_code": call_args["mailing_postal_code"],
                    "country": call_args["mailing_country"],
                }
            ),
            shipping={"address": address, "name": name},
            phone=call_args["phone"],
            stripe_account=contribution.revenue_program.payment_provider.stripe_account_id,
        )
        assert customer == customer_create_return_val

    def test_formatted_amount_property(self, one_time_contribution):
        one_time_contribution.amount = 1000
        one_time_contribution.save()
        assert one_time_contribution.formatted_amount == "$10.00 USD"

    @pytest.mark.parametrize("has_donation_page", [True, False])
    def test_revenue_program_property(self, contribution, has_donation_page):
        if has_donation_page:
            assert contribution._revenue_program is None
            assert contribution.revenue_program is not None
        else:
            contribution._revenue_program = contribution.revenue_program
            contribution.donation_page = None
            contribution.save()

    @pytest.mark.parametrize(
        (
            "has_revenue_program_via_donation_page",
            "has_revenue_program_via__revenue_program",
            "has_payment_provider",
            "expect_result",
        ),
        [
            (True, False, False, False),
            (False, True, False, False),
            (True, False, True, True),
            (False, True, True, True),
        ],
    )
    def test_stripe_account_id_property(
        self,
        contribution,
        has_revenue_program_via_donation_page,
        has_revenue_program_via__revenue_program,
        has_payment_provider,
        expect_result,
    ):
        if has_revenue_program_via_donation_page:
            assert contribution.donation_page.revenue_program
            assert contribution._revenue_program is None
        if has_revenue_program_via__revenue_program:
            contribution._revenue_program = contribution.revenue_program
            contribution.donation_page = None
            contribution.save()
        if has_payment_provider:
            assert contribution.revenue_program.payment_provider
        else:
            contribution.revenue_program.payment_provider = None
            contribution.save()
        if expect_result:
            assert contribution.stripe_account_id == contribution.revenue_program.payment_provider.stripe_account_id
        else:
            assert contribution.stripe_account_id is None

    def test_str(self, one_time_contribution):
        assert (
            str(one_time_contribution)
            == f"Contribution #{one_time_contribution.id} {one_time_contribution.formatted_amount},"
            f" {one_time_contribution.created.strftime('%Y-%m-%d %H:%M:%S')}"
        )

    def test_fetch_stripe_payment_method_when_no_provider_payment_method_id(self, mocker):
        contribution = ContributionFactory(provider_payment_method_id=None)
        assert contribution.fetch_stripe_payment_method() is None

    def test_fetch_stripe_payment_method_happy_path(self, one_time_contribution, mocker):
        return_value = AttrDict({"key": "val"})
        mock_retrieve_pm = mocker.patch("stripe.PaymentMethod.retrieve", return_value=return_value)
        assert (
            one_time_contribution.fetch_stripe_payment_method(one_time_contribution.provider_payment_method_id)
            == return_value
        )
        mock_retrieve_pm.assert_called_once_with(
            one_time_contribution.provider_payment_method_id,
            stripe_account=one_time_contribution.revenue_program.payment_provider.stripe_account_id,
        )

    def test_fetch_stripe_payment_method_when_stripe_error(self, one_time_contribution, mocker):
        mock_retrieve_pm = mocker.patch("stripe.PaymentMethod.retrieve", side_effect=stripe.error.StripeError("error"))
        assert (
            one_time_contribution.fetch_stripe_payment_method(one_time_contribution.provider_payment_method_id) is None
        )
        mock_retrieve_pm.assert_called_once_with(
            one_time_contribution.provider_payment_method_id,
            stripe_account=one_time_contribution.revenue_program.payment_provider.stripe_account_id,
        )

    def test_create_stripe_one_time_payment_intent(self, one_time_contribution, monkeypatch, mocker):
        """Show Contribution.create_stripe_one_time_payment_intent calls Stripe with right params...

        ...that it returns the created payment intent, and that it saves the payment intent ID and
        client secret back to the contribution
        """
        create_pi_return_val = AttrDict(
            {
                "id": "fake_id",
                "client_secret": "fake_client_secret",
                "customer": "fake_stripe_customer_id",
            }
        )
        monkeypatch.setattr("stripe.PaymentIntent.create", lambda *args, **kwargs: create_pi_return_val)
        spy = mocker.spy(stripe.PaymentIntent, "create")
        metadata = {}
        assert one_time_contribution.create_stripe_one_time_payment_intent(metadata=metadata) == create_pi_return_val
        spy.assert_called_once_with(
            amount=one_time_contribution.amount,
            currency=one_time_contribution.currency,
            customer=one_time_contribution.provider_customer_id,
            metadata=metadata,
            statement_descriptor_suffix=(
                (rp := one_time_contribution.revenue_program).stripe_statement_descriptor_suffix
            ),
            stripe_account=rp.stripe_account_id,
            capture_method="automatic",
            idempotency_key=f"{one_time_contribution.uuid}-payment-intent",
        )

    def test_create_stripe_subscription(self, contribution, monkeypatch, mocker):
        """Show Contribution.create_stripe_subscription calls Stripe with right params...

        ...that it returns the created subscription
        """
        contribution.provider_subscription_id = None
        return_value = {
            "id": "fake_id",
            "latest_invoice": {"payment_intent": {"client_secret": "fake_client_secret", "id": "pi_fakefakefake"}},
            "customer": "fake_stripe_customer_id",
        }
        monkeypatch.setattr("stripe.Subscription.create", lambda *args, **kwargs: return_value)
        stripe_spy = mocker.spy(stripe.Subscription, "create")
        metadata = {"foo": "bar"}
        subscription = contribution.create_stripe_subscription(metadata)
        stripe_spy.assert_called_once_with(
            customer=contribution.provider_customer_id,
            items=[
                {
                    "price_data": {
                        "unit_amount": contribution.amount,
                        "currency": contribution.currency,
                        "product": contribution.revenue_program.payment_provider.stripe_product_id,
                        "recurring": {"interval": contribution.interval},
                    }
                }
            ],
            stripe_account=contribution.revenue_program.stripe_account_id,
            metadata=metadata,
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription", "payment_method_types": ["card"]},
            expand=["latest_invoice.payment_intent"],
            off_session=False,
            default_payment_method=None,
            idempotency_key=f"{contribution.uuid}-subscription",
        )
        assert subscription == return_value

    def test_create_stripe_setup_intent(self, contribution, monkeypatch, mocker):
        """Show Contribution.create_stripe_setup_intent calls Stripe with right params...

        ...that it returns the created setup intent, and that it saves the right data
        back to the contribution
        """
        return_value = AttrDict(
            {
                "id": "fake_id",
                "client_secret": "fake_client_secret",
            }
        )
        monkeypatch.setattr("stripe.SetupIntent.create", lambda *args, **kwargs: return_value)
        spy = mocker.spy(stripe.SetupIntent, "create")
        metadata = {"meta": "data"}
        setup_intent = contribution.create_stripe_setup_intent(metadata)
        spy.assert_called_once_with(
            customer=contribution.provider_customer_id,
            stripe_account=contribution.revenue_program.stripe_account_id,
            metadata=metadata,
            idempotency_key=f"{contribution.uuid}-setup-intent",
        )
        assert setup_intent == return_value

    def test_cancel_pending_calls_save_with_right_update_fields(self, one_time_contribution, mocker):
        # there are other paths through that call save where different stripe return values would need to
        # be provided. We're only testing processing case, and assume that it also means that save calls right update
        # fields for all non-error paths through cancel function.
        one_time_contribution.status = ContributionStatus.PROCESSING
        one_time_contribution.save()
        mock_cancel = mocker.Mock()
        mocker.patch("stripe.PaymentIntent.cancel", mock_cancel)
        save_spy = mocker.spy(Contribution, "save")
        one_time_contribution.cancel_pending()
        save_spy.assert_called_once_with(one_time_contribution, update_fields={"status", "modified"})

    def test_cancel_pending_creates_a_revision(self, one_time_contribution, mocker, monkeypatch):
        """Show that cancel creates a revision with the right comment."""
        one_time_contribution.status = ContributionStatus.PROCESSING
        one_time_contribution.save()
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.__enter__.return_value = None
        mock_cancel = mocker.Mock()
        monkeypatch.setattr("stripe.PaymentIntent.cancel", mock_cancel)
        mock_set_revision_comment = mocker.patch("reversion.set_comment")
        one_time_contribution.cancel_pending()
        mock_create_revision.assert_called_once()
        mock_set_revision_comment.assert_called_once_with(
            f"`Contribution.cancel` saved changes to contribution with ID {one_time_contribution.id}"
        )

    @pytest.mark.parametrize(
        "status",
        [
            ContributionStatus.FAILED,
            ContributionStatus.PROCESSING,
            ContributionStatus.FLAGGED,
        ],
    )
    def test_cancel_pending_when_one_time(self, status, monkeypatch, mocker):
        contribution = ContributionFactory(one_time=True, status=status)
        mock_cancel = mocker.Mock()
        monkeypatch.setattr("stripe.PaymentIntent.cancel", mock_cancel)
        contribution.cancel_pending()
        contribution.refresh_from_db()
        assert contribution.status == ContributionStatus.CANCELED
        mock_cancel.assert_called_once_with(
            contribution.provider_payment_id,
            stripe_account=contribution.revenue_program.stripe_account_id,
        )

    @pytest.mark.parametrize(
        ("status", "contribution_type", "has_payment_method_id"),
        [
            (ContributionStatus.PROCESSING, "monthly_subscription", True),
            (ContributionStatus.PROCESSING, "annual_subscription", True),
            (ContributionStatus.FLAGGED, "monthly_subscription", True),
            (ContributionStatus.FLAGGED, "annual_subscription", True),
            (ContributionStatus.PROCESSING, "monthly_subscription", False),
            (ContributionStatus.PROCESSING, "annual_subscription", False),
            (ContributionStatus.FLAGGED, "monthly_subscription", False),
            (ContributionStatus.FLAGGED, "annual_subscription", False),
            (ContributionStatus.FAILED, "monthly_subscription", False),
            (ContributionStatus.FAILED, "annual_subscription", False),
        ],
    )
    def test_cancel_pending_when_recurring(self, status, contribution_type, has_payment_method_id, monkeypatch, mocker):
        contribution = ContributionFactory(
            **{
                contribution_type: True,
                "status": status,
                "provider_payment_method_id": "some-id" if has_payment_method_id else None,
            }
        )
        mock_delete_sub = mocker.Mock()
        monkeypatch.setattr("stripe.Subscription.delete", mock_delete_sub)
        mock_pm_detach = mocker.Mock()

        class MockPaymentMethod:
            def __init__(self, *args, **kwargs):
                self.detach = mock_pm_detach

        mock_retrieve_pm = mocker.Mock(return_value=MockPaymentMethod())
        monkeypatch.setattr("stripe.PaymentMethod.retrieve", mock_retrieve_pm)

        contribution.cancel_pending()
        contribution.refresh_from_db()
        assert contribution.status == ContributionStatus.CANCELED

        if status == ContributionStatus.PROCESSING:
            mock_delete_sub.assert_called_once_with(
                contribution.provider_subscription_id,
                stripe_account=contribution.revenue_program.stripe_account_id,
            )
        elif has_payment_method_id:
            mock_retrieve_pm.assert_called_once_with(
                contribution.provider_payment_method_id,
                stripe_account=contribution.revenue_program.stripe_account_id,
            )
            mock_pm_detach.assert_called_once()
        else:
            mock_pm_detach.assert_not_called()

    def test_cancel_pending_when_unpermitted_interval(self, monkeypatch, mocker):
        contribution = ContributionFactory(
            annual_subscription=True, status=ContributionStatus.PROCESSING, interval="foobar"
        )
        last_modified = contribution.modified
        mock_stripe_method = mocker.Mock()
        monkeypatch.setattr("stripe.PaymentIntent.cancel", mock_stripe_method)
        monkeypatch.setattr("stripe.Subscription.delete", mock_stripe_method)
        monkeypatch.setattr("stripe.PaymentMethod.retrieve", mock_stripe_method)
        monkeypatch.setattr("stripe.PaymentMethod.detach", mock_stripe_method)
        with pytest.raises(ContributionIntervalError):
            contribution.cancel_pending()
        assert contribution.modified == last_modified
        mock_stripe_method.assert_not_called()

    def test_cancel_existing_raises_when_no_subscription(self):
        contribution = ContributionFactory(interval=ContributionInterval.ONE_TIME, provider_subscription_id=None)
        with pytest.raises(ContributionStatusError):
            contribution.cancel_existing(actor=ContributorFactory())

    @pytest.mark.parametrize(
        ("status"),
        ["canceled", "incomplete", "incomplete_expired", "paused", "unpaid"],
    )
    def test_cancel_existing_raises_with_bad_subscription_status(self, status, mocker: pytest_mock.MockerFixture):
        mocker.patch("stripe.Subscription.retrieve", return_value=mocker.MagicMock(status=status))
        contribution = ContributionFactory(interval=ContributionInterval.YEARLY, provider_subscription_id="mock_delete")
        with pytest.raises(ContributionStatusError):
            contribution.cancel_existing(actor=ContributorFactory())

    def test_cancel_existing_cancels_stripe_sub(self, mocker: pytest_mock.MockerFixture):
        mocker.patch("stripe.Subscription.retrieve", return_value=mocker.MagicMock(status="active"))
        mock_delete = mocker.patch("stripe.Subscription.delete")
        contribution = ContributionFactory(interval=ContributionInterval.YEARLY, provider_subscription_id="mock-sub-id")
        contribution.cancel_existing(actor=ContributorFactory())
        mock_delete.assert_called_once_with(
            contribution.provider_subscription_id,
            stripe_account=contribution.revenue_program.payment_provider.stripe_account_id,
        )

    def test_cancel_existing_creates_activity_log(self, mocker: pytest_mock.MockerFixture):
        mocker.patch("stripe.Subscription.retrieve", return_value=mocker.MagicMock(status="active"))
        mocker.patch("stripe.Subscription.delete")
        contribution = ContributionFactory(interval=ContributionInterval.YEARLY, provider_subscription_id="mock-sub-id")
        contribution.cancel_existing(actor=contribution.contributor)
        logs = ActivityLog.objects.filter(actor__email=contribution.contributor.email)
        assert len(logs) == 1
        assert logs[0].action == ActivityLog.CANCEL
        assert logs[0].activity_object_content_object == contribution

    @pytest.mark.django_db
    @pytest.mark.parametrize("trait", ["one_time", "annual_subscription", "monthly_subscription"])
    def test_contribution_billing_details(self, trait):
        contribution = ContributionFactory(**{trait: True})
        assert contribution.billing_details
        assert contribution.billing_details == contribution.provider_payment_method_details["billing_details"]

    @pytest.mark.parametrize(
        "status",
        [
            ContributionStatus.CANCELED,
            ContributionStatus.PAID,
            ContributionStatus.REFUNDED,
            ContributionStatus.REJECTED,
            "unexpected",
        ],
    )
    def test_cancel_pending_when_unpermitted_status(self, status, monkeypatch, mocker):
        contribution = ContributionFactory(annual_subscription=True, status=status)
        last_modified = contribution.modified
        mock_stripe_method = mocker.Mock()
        monkeypatch.setattr("stripe.PaymentIntent.cancel", mock_stripe_method)
        monkeypatch.setattr("stripe.Subscription.delete", mock_stripe_method)
        monkeypatch.setattr("stripe.PaymentMethod.retrieve", mock_stripe_method)
        monkeypatch.setattr("stripe.PaymentMethod.detach", mock_stripe_method)

        with pytest.raises(ContributionStatusError):
            contribution.cancel_pending()
        assert contribution.modified == last_modified
        mock_stripe_method.assert_not_called()

    @pytest.mark.parametrize(
        ("setup_intent_id", "stripe_account_id", "expect_retrieve"),
        [
            (None, None, False),
            (None, "something", False),
            ("something", None, False),
            ("something", "else", True),
        ],
    )
    def test_stripe_setup_intent_property(
        self, contribution, setup_intent_id, stripe_account_id, expect_retrieve, monkeypatch, mocker
    ):
        contribution.provider_setup_intent_id = setup_intent_id
        contribution.save()
        (provider := contribution.revenue_program.payment_provider).stripe_account_id = stripe_account_id
        provider.save()
        return_val = {"foo": "bar"}
        monkeypatch.setattr("stripe.SetupIntent.retrieve", lambda *args, **kwargs: return_val)
        spy = mocker.spy(stripe.SetupIntent, "retrieve")
        si = contribution.stripe_setup_intent
        if expect_retrieve:
            spy.assert_called_once_with(setup_intent_id, stripe_account=stripe_account_id)
        else:
            spy.assert_not_called()
        assert si == (return_val if expect_retrieve else None)

    def test_stripe_setup_intent_property_when_stripe_error(self, monkeypatch, mocker):
        contribution = ContributionFactory(monthly_subscription=True, flagged=True)

        def mock_retrieve(*args, **kwargs):
            raise stripe.error.StripeError()

        monkeypatch.setattr("stripe.SetupIntent.retrieve", mock_retrieve)
        spy = mocker.spy(logger, "exception")
        assert contribution.stripe_setup_intent is None
        spy.assert_called_once_with(
            "`Contribution.stripe_setup_intent` encountered a Stripe error trying to retrieve stripe setup intent"
            " with ID %s and stripe account ID %s for contribution with ID %s",
            contribution.provider_setup_intent_id,
            contribution.revenue_program.payment_provider.stripe_account_id,
            contribution.id,
        )

    @pytest.mark.parametrize(
        ("payment_intent_id", "stripe_account_id", "expect_retrieve"),
        [
            (None, None, False),
            (None, "something", False),
            ("something", None, False),
            ("something", "else", True),
        ],
    )
    def test_stripe_payment_intent_property(
        self, contribution, payment_intent_id, stripe_account_id, expect_retrieve, monkeypatch, mocker
    ):
        contribution.provider_payment_id = payment_intent_id
        contribution.save()
        (provider := contribution.revenue_program.payment_provider).stripe_account_id = stripe_account_id
        provider.save()
        return_val = {"foo": "bar"}
        monkeypatch.setattr("stripe.PaymentIntent.retrieve", lambda *args, **kwargs: return_val)
        spy = mocker.spy(stripe.PaymentIntent, "retrieve")
        pi = contribution.stripe_payment_intent
        if expect_retrieve:
            spy.assert_called_once_with(
                payment_intent_id,
                stripe_account=stripe_account_id,
            )
        else:
            spy.assert_not_called()
        assert pi == (return_val if expect_retrieve else None)

    def test_stripe_payment_intent_property_when_stripe_error(self, monkeypatch, mocker):
        contribution = ContributionFactory(one_time=True)

        def mock_retrieve(*args, **kwargs):
            raise stripe.error.StripeError()

        monkeypatch.setattr("stripe.PaymentIntent.retrieve", mock_retrieve)
        spy = mocker.spy(logger, "exception")
        assert contribution.stripe_payment_intent is None
        spy.assert_called_once_with(
            "`Contribution.stripe_payment_intent` encountered a Stripe error trying to retrieve stripe payment intent"
            " with ID %s and stripe account ID %s for contribution with ID %s",
            contribution.provider_payment_id,
            contribution.revenue_program.payment_provider.stripe_account_id,
            contribution.id,
        )

    @pytest.mark.parametrize(
        ("subscription_id", "stripe_account_id", "expect_retrieve"),
        [
            (None, None, False),
            (None, "something", False),
            ("something", None, False),
            ("something", "else", True),
        ],
    )
    def test_stripe_subscription_property(
        self, contribution, subscription_id, stripe_account_id, expect_retrieve, monkeypatch, mocker
    ):
        contribution.provider_subscription_id = subscription_id
        contribution.save()
        (provider := contribution.revenue_program.payment_provider).stripe_account_id = stripe_account_id
        provider.save()
        return_val = {"foo": "bar"}
        monkeypatch.setattr("stripe.Subscription.retrieve", lambda *args, **kwargs: return_val)
        spy = mocker.spy(stripe.Subscription, "retrieve")
        sub = contribution.stripe_subscription
        if expect_retrieve:
            spy.assert_called_once_with(subscription_id, stripe_account=stripe_account_id)
        else:
            spy.assert_not_called()
        assert sub == (return_val if expect_retrieve else None)

    def test_stripe_subscription_property_when_stripe_error(self, monkeypatch, mocker):
        contribution = ContributionFactory(monthly_subscription=True)

        def mock_retrieve(*args, **kwargs):
            raise stripe.error.StripeError()

        monkeypatch.setattr("stripe.Subscription.retrieve", mock_retrieve)
        spy = mocker.spy(logger, "exception")
        assert contribution.stripe_subscription is None
        spy.assert_called_once_with(
            "`Contribution.stripe_subscription` encountered a Stripe error trying to retrieve stripe subscription"
            " with ID %s and stripe account ID %s for contribution with ID %s",
            contribution.provider_subscription_id,
            contribution.revenue_program.payment_provider.stripe_account_id,
            contribution.id,
        )

    @pytest.mark.parametrize("trait", ["one_time", "annual_subscription", "monthly_subscription"])
    def test_billing_details(self, trait):
        details = {"foo": "bar", "billing_details": "details"}
        contribution = ContributionFactory(**{trait: True, "provider_payment_method_details": details})
        assert contribution.billing_details
        assert contribution.billing_details == contribution.provider_payment_method_details["billing_details"]

    @pytest.mark.parametrize("trait", ["one_time", "annual_subscription", "monthly_subscription"])
    @pytest.mark.parametrize("name_val", ["something", None, False, ""])
    def test_billing_name(self, trait, name_val):
        data = {"billing_details": {"name": name_val}}
        # need `provider_payment_method_id` to be `None` to be none so we don't try to retrieve the payment method
        # on save.
        contribution = ContributionFactory(
            **{trait: True, "provider_payment_method_details": data, "provider_payment_method_id": None}
        )
        assert contribution.billing_name == (name_val or "")

    @pytest.mark.parametrize("trait", ["one_time", "annual_subscription", "monthly_subscription"])
    @pytest.mark.parametrize(
        ("make_contribution_fn", "expected_val"),
        [
            (
                lambda trait: ContributionFactory(contributor=ContributorFactory(email=""), **{trait: True}),
                "",
            ),
            (
                lambda trait: ContributionFactory(contributor=ContributorFactory(email="something"), **{trait: True}),
                "something",
            ),
        ],
    )
    def test_billing_email(
        self,
        trait,
        make_contribution_fn,
        expected_val,
    ):
        contribution = make_contribution_fn(trait)
        assert contribution.billing_email == expected_val

    @pytest.mark.parametrize("trait", ["one_time", "annual_subscription", "monthly_subscription"])
    @pytest.mark.parametrize("phone_val", ["something", None, False, ""])
    def test_billing_phone(self, trait, phone_val):
        data = {"billing_details": {"phone": phone_val}}
        contribution = ContributionFactory(**{trait: True, "provider_payment_method_details": data})
        assert contribution.billing_phone == (phone_val or "")

    @pytest.mark.parametrize("trait", ["one_time", "annual_subscription", "monthly_subscription"])
    def test_billing_address(self, trait):
        data = {
            "billing_details": {
                "address": {
                    "line1": "123 Main St",
                    "line2": "Special",
                    "city": "Metropolis",
                    "state": "MN",
                    "postal_code": "12345",
                    "country": "US",
                }
            }
        }
        contribution = ContributionFactory(**{trait: True, "provider_payment_method_details": data})
        order = ("line1", "line2", "city", "state", "postal_code", "country")
        assert contribution.billing_address == ",".join([data["billing_details"]["address"][x] for x in order])

    @pytest.mark.parametrize("amount", [1, 437, 10_000_00])
    @pytest.mark.parametrize(
        "trait",
        [
            "one_time",
            "annual_subscription",
            "monthly_subscription",
        ],
    )
    def test_donor_selected_amount_happy_path(self, amount, trait):
        kwargs = {"amount": amount, trait: True}
        contribution = ContributionFactory(**kwargs)
        assert contribution.donor_selected_amount
        assert contribution.donor_selected_amount == float(contribution.contribution_metadata["donor_selected_amount"])

    @pytest.mark.parametrize(
        "metadata",
        [{"donor_selected_amount": "cats"}, {"donor_selected_amount": ""}, {"donor_selected_amount": None}, {}, None],
    )
    def test_donor_selected_amount_when_bad_contribution_metadata(self, metadata, mocker):
        logger_spy = mocker.spy(logger, "warning")
        contribution = ContributionFactory(contribution_metadata=metadata)
        contribution.save()
        assert contribution.donor_selected_amount is None
        logger_spy.assert_called_once()

    @pytest.mark.parametrize(("name", "symbol"), settings.CURRENCIES.items())
    def test_get_currency_dict(self, name, symbol):
        contribution = ContributionFactory(currency=name, provider_payment_method_id=None)
        assert contribution.get_currency_dict() == {"code": name, "symbol": symbol}

    def test_get_currency_dict_bad_value(self, mocker):
        logger_spy = mocker.spy(logger, "exception")
        contribution = ContributionFactory(currency="???", provider_payment_method_id=None)
        assert contribution.get_currency_dict() == {"code": "", "symbol": ""}
        logger_spy.assert_called_once_with(
            'Currency settings for stripe account "%s" misconfigured. Tried to access "%s", but valid options are: %s',
            contribution.stripe_account_id,
            "???",
            settings.CURRENCIES,
        )

    @pytest.fixture
    def _synchronous_email_send_task(self, settings):
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        settings.CELERY_ALWAYS_EAGER = True

    @pytest.fixture
    def _mock_contributor_refresh_token(self, mocker):
        mocker.patch(
            "apps.api.tokens.ContributorRefreshToken.for_contributor",
            side_effect=lambda *args, **kwargs: MockForContributorReturn(),
        )

    @pytest.fixture
    def _mock_stripe_customer(self, mocker):
        mocker.patch("stripe.Customer.retrieve", return_value=AttrDict({"name": "Fake Customer Name"}))

    @pytest.fixture(
        params=["fiscally_sponsored_revenue_program", "nonprofit_revenue_program", "for_profit_revenue_program"]
    )
    def revenue_program(self, request):
        return request.getfixturevalue(request.param)

    @pytest.mark.usefixtures("_mock_contributor_refresh_token", "_synchronous_email_send_task", "_mock_stripe_customer")
    @pytest.mark.parametrize("tax_id", [None, "123456789"])
    @pytest.mark.parametrize(
        "email_method_name",
        [
            "send_recurring_contribution_email_reminder",
            "send_recurring_contribution_canceled_email",
            "send_recurring_contribution_payment_updated_email",
        ],
    )
    def test_send_recurring_contribution_emails_rendered_text(
        self,
        revenue_program,
        tax_id,
        email_method_name,
        annual_contribution,
        mocker,
    ):
        revenue_program.tax_id = tax_id
        revenue_program.save()
        annual_contribution.donation_page.revenue_program = revenue_program
        annual_contribution.donation_page.save()
        mocker.spy(send_templated_email, "delay")
        now = datetime.datetime.now(datetime.timezone.utc)

        email_expectations = [
            f"Email: {annual_contribution.contributor.email}",
            f"Amount Contributed: {annual_contribution.formatted_amount}/{annual_contribution.interval}",
        ]

        if email_method_name == "send_recurring_contribution_email_reminder":
            email_expectations.append(
                f"Scheduled: {now.strftime('%m/%d/%Y')}",
            )
        if email_method_name == "send_recurring_contribution_canceled_email":
            email_expectations.append(
                f"Date Canceled: {now.strftime('%m/%d/%Y')}",
            )

        getattr(annual_contribution, email_method_name)()

        assert len(mail.outbox) == 1
        soup_text = BeautifulSoup(mail.outbox[0].alternatives[0][0], "html.parser").get_text(separator=" ", strip=True)
        text_email = mail.outbox[0].body
        for x in email_expectations:
            assert x in text_email
            assert x in soup_text

    @pytest.mark.usefixtures("_mock_contributor_refresh_token", "_synchronous_email_send_task", "_mock_stripe_customer")
    def test_send_recurring_contribution_email_reminder_timestamp_override(self, annual_contribution):
        annual_contribution.send_recurring_contribution_email_reminder("test-timestamp")
        assert "Scheduled: test-timestamp" in mail.outbox[0].body

    @pytest.mark.usefixtures("_mock_contributor_refresh_token", "_synchronous_email_send_task", "_mock_stripe_customer")
    @pytest.mark.parametrize("disable_reminder_emails", [True, False])
    def test_send_recurring_contribution_email_reminder_org_disabled(
        self, disable_reminder_emails: bool, mocker: MockerFixture
    ):
        mock_send_recurring_contribution_change_email = mocker.patch(
            "apps.contributions.models.Contribution.send_recurring_contribution_change_email"
        )
        page = DonationPageFactory(
            published=True,
            revenue_program=RevenueProgramFactory(
                onboarded=True,
                organization=OrganizationFactory(free_plan=True, disable_reminder_emails=disable_reminder_emails),
            ),
        )
        c = ContributionFactory(donation_page=page, annual_subscription=True)
        c.send_recurring_contribution_email_reminder()
        if disable_reminder_emails:
            assert not mock_send_recurring_contribution_change_email.called
        else:
            assert mock_send_recurring_contribution_change_email.called

    @pytest.mark.usefixtures(
        "_synchronous_email_send_task",
        "_mock_contributor_refresh_token",
        "_mock_stripe_customer",
    )
    @pytest.mark.parametrize(
        "has_default_donation_page",
        [False, True],
    )
    @pytest.mark.parametrize(
        "email_method_name",
        [
            "send_recurring_contribution_email_reminder",
            "send_recurring_contribution_payment_updated_email",
        ],
    )
    def test_send_recurring_contribution_emails_rendered_styles(
        self,
        has_default_donation_page,
        revenue_program,
        email_method_name,
        annual_contribution,
        settings,
    ):
        if has_default_donation_page:
            style = StyleFactory()
            style.styles = style.styles | {
                "colors": {
                    "cstm_mainHeader": "#mock-header-background",
                    "cstm_CTAs": "#mock-button-color",
                },
                "font": {"heading": "mock-header-font", "body": "mock-body-font"},
            }
            annual_contribution.donation_page.styles = style
            annual_contribution.donation_page.header_logo = "mock-logo"
            annual_contribution.donation_page.header_logo_alt_text = "Mock-Alt-Text"
            annual_contribution.donation_page.revenue_program = revenue_program
            annual_contribution.donation_page.save()
            annual_contribution.revenue_program.default_donation_page = annual_contribution.donation_page
            annual_contribution.revenue_program.save()

        getattr(annual_contribution, email_method_name)()

        assert len(mail.outbox) == 1

        default_logo = f"{settings.SITE_URL}/static/nre-logo-yellow.png"
        default_alt_text = "News Revenue Hub"
        custom_logo = 'src="/media/mock-logo"'
        custom_alt_text = 'alt="Mock-Alt-Text"'
        custom_header_background = "background: #mock-header-background !important"
        custom_button_background = "background: #mock-button-color !important"

        if annual_contribution.revenue_program.organization.plan.name == FreePlan.name or not has_default_donation_page:
            expect_present = (default_logo, default_alt_text)
            expect_missing = (custom_logo, custom_alt_text, custom_button_background, custom_header_background)

        else:
            expect_present = (custom_logo, custom_alt_text, custom_header_background)
            # Email template doesn't have a button to apply the custom button color to
            expect_missing = (custom_button_background, default_logo, default_alt_text)

        for x in expect_present:
            assert x in mail.outbox[0].alternatives[0][0]
        for x in expect_missing:
            assert x not in mail.outbox[0].alternatives[0][0]

    @pytest.mark.parametrize(
        "email_method_name",
        [
            "send_recurring_contribution_email_reminder",
            "send_recurring_contribution_payment_updated_email",
            "send_recurring_contribution_canceled_email",
        ],
    )
    def test_send_recurring_contribution_emails_skip_onetime(self, email_method_name, one_time_contribution, mocker):
        logger_spy = mocker.spy(logger, "error")
        send_email_spy = mocker.spy(send_templated_email, "delay")

        getattr(one_time_contribution, email_method_name)()

        logger_spy.assert_called_once_with(
            "Called on an instance (ID: %s) whose interval is one-time",
            one_time_contribution.id,
        )
        send_email_spy.assert_not_called()

    @pytest.mark.parametrize(
        "email_method_name",
        [
            "send_recurring_contribution_email_reminder",
            "send_recurring_contribution_payment_updated_email",
            "send_recurring_contribution_canceled_email",
        ],
    )
    def test_send_recurring_contribution_emails_skip_when_no_provider_customer_id(
        self, email_method_name, annual_contribution, mocker
    ):
        annual_contribution.provider_customer_id = None
        annual_contribution.save()
        logger_spy = mocker.spy(logger, "error")
        send_email_spy = mocker.spy(send_templated_email, "delay")
        mock_stripe = mocker.patch("stripe.Customer.retrieve", side_effect=stripe.error.StripeError())
        getattr(annual_contribution, email_method_name)()
        logger_spy.assert_called_once_with(
            "Encountered an error trying to generate email data",
            exc_info=True,
        )
        mock_stripe.assert_not_called()
        send_email_spy.assert_not_called()

    @pytest.mark.parametrize(
        "email_method_name",
        [
            "send_recurring_contribution_email_reminder",
            "send_recurring_contribution_payment_updated_email",
            "send_recurring_contribution_canceled_email",
        ],
    )
    def test_send_recurring_contribution_emails_when_error_retrieving_stripe_customer(
        self, email_method_name, annual_contribution, mocker
    ):
        mocker.patch("stripe.Customer.retrieve", side_effect=stripe.error.StripeError())
        logger_spy = mocker.spy(logger, "exception")
        send_email_spy = mocker.spy(send_templated_email, "delay")

        getattr(annual_contribution, email_method_name)()
        logger_spy.assert_called_once_with("Encountered an error trying to generate email data")
        send_email_spy.assert_not_called()

    @pytest.fixture(params=["hub_admin_user", "org_user_free_plan", "rp_user", "user_with_unexpected_role"])
    def user(self, request):
        return request.getfixturevalue(request.param)

    def test_filtered_by_role_assignment(self, user, contribution):
        org1 = (rp1 := contribution.revenue_program).organization
        rp2 = RevenueProgramFactory(name="rev-program-2", organization=org1)
        contribution2 = ContributionFactory(
            status=ContributionStatus.PAID, donation_page=DonationPageFactory(revenue_program=rp2)
        )
        contribution3 = ContributionFactory(
            status=ContributionStatus.PAID,
            donation_page=DonationPageFactory(
                revenue_program=RevenueProgramFactory(organization=OrganizationFactory(name="new org"))
            ),
        )
        assert contribution.revenue_program != contribution2.revenue_program
        assert contribution.revenue_program.organization == contribution2.revenue_program.organization
        assert contribution3.revenue_program.organization != contribution.revenue_program.organization

        match user.roleassignment.role_type:
            case Roles.HUB_ADMIN:
                expected = Contribution.objects.having_org_viewable_status()
                assert expected.count() == 3
            case Roles.ORG_ADMIN:
                user.roleassignment.organization = (org := contribution.revenue_program.organization)
                user.roleassignment.revenue_programs.set(org.revenueprogram_set.all())
                user.roleassignment.save()
                expected = Contribution.objects.filter(donation_page__revenue_program__organization=org1).exclude(
                    status__in=(ContributionStatus.REJECTED, ContributionStatus.FLAGGED)
                )
                assert expected.count() == 2
            case Roles.RP_ADMIN:
                user.roleassignment.organization = (org := contribution.revenue_program.organization)
                user.roleassignment.revenue_programs.set((rp1,))
                user.roleassignment.save()
                expected = Contribution.objects.filter(donation_page__revenue_program=rp1).exclude(
                    status__in=(ContributionStatus.REJECTED, ContributionStatus.FLAGGED)
                )
                assert expected.count() == 1
            case _:
                expected = Contribution.objects.none()
                assert expected.count() == 0

        result = Contribution.objects.filtered_by_role_assignment(user.roleassignment)
        assert result.count() == expected.count()
        assert set(result) == set(expected)

    @pytest.mark.parametrize(
        (
            "contribution_fn",
            "stripe_pi_return_value",
            "stripe_subscription_return_value",
            "expect_update_fields",
            "expect_payment_method_update",
        ),
        [
            (
                lambda: ContributionFactory(
                    provider_payment_id="something",
                    one_time=True,
                    status=ContributionStatus.PROCESSING,
                    provider_payment_method_id="something",
                ),
                {"status": "succeeded", "created": 1675925546, "payment_method": "pm_123"},
                None,
                {"status", "modified", "last_payment_date"},
                False,
            ),
            (
                lambda: ContributionFactory(
                    provider_payment_id="something",
                    one_time=True,
                    status=ContributionStatus.PROCESSING,
                    provider_payment_method_id=None,
                ),
                {"status": "succeeded", "created": 1675925546, "payment_method": "pm_123"},
                None,
                {
                    "status",
                    "modified",
                    "last_payment_date",
                    "provider_payment_method_id",
                    "provider_payment_method_details",
                },
                True,
            ),
            (
                lambda: ContributionFactory(
                    provider_payment_id="something",
                    monthly_subscription=True,
                    status=ContributionStatus.PROCESSING,
                    provider_payment_method_id="something",
                ),
                {"created": 1675925546, "status": "succeeded"},
                {"status": "active"},
                {"status", "modified", "last_payment_date"},
                False,
            ),
        ],
    )
    @pytest.mark.parametrize("dry_run", [True, False])
    def test_fix_contributions_stuck_in_processing(
        self,
        contribution_fn,
        stripe_pi_return_value,
        stripe_subscription_return_value,
        expect_update_fields,
        expect_payment_method_update,
        dry_run,
        mocker,
    ):
        contribution = contribution_fn()
        started_with_pm_id = bool(contribution.provider_payment_method_id)
        save_spy = mocker.spy(Contribution, "save")
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_set_revision_comment = mocker.patch("reversion.set_comment")
        mock_get_stripe_pi = mocker.patch(
            "stripe.PaymentIntent.retrieve", return_value=AttrDict(stripe_pi_return_value)
        )
        mock_get_stripe_sub = mocker.patch(
            "stripe.Subscription.retrieve", return_value=AttrDict(stripe_subscription_return_value)
        )
        mock_get_stripe_payment_method = mocker.patch(
            "stripe.PaymentMethod.retrieve", return_value=AttrDict({"card": {"last4": "1234"}})
        )
        Contribution.fix_contributions_stuck_in_processing(dry_run=dry_run)
        contribution.refresh_from_db()

        mock_get_stripe_pi.assert_called_once()

        if contribution.interval != ContributionInterval.ONE_TIME:
            mock_get_stripe_sub.assert_called_once()

        if not started_with_pm_id and expect_payment_method_update:
            mock_get_stripe_payment_method.assert_called_once()
        else:
            mock_get_stripe_payment_method.assert_not_called()

        if expect_update_fields and not dry_run:
            save_spy.assert_called_once_with(contribution, update_fields=expect_update_fields)
            mock_create_revision.assert_called_once()
            mock_set_revision_comment.assert_called_once()

        else:
            save_spy.assert_not_called()
            mock_create_revision.assert_not_called()
            mock_set_revision_comment.assert_not_called()

    @pytest.mark.parametrize(
        (
            "make_contribution_fn",
            "stripe_pi_return_val",
            "stripe_sub_return_val",
            "stripe_si_return_val",
            "expect_update_fields",
        ),
        [
            (
                lambda: ContributionFactory(one_time=True, provider_payment_method_id=None),
                {"payment_method": "pm_123"},
                None,
                None,
                {"provider_payment_method_id", "provider_payment_method_details", "modified"},
            ),
        ],
    )
    @pytest.mark.parametrize("dry_run", [True, False])
    def test_fix_contributions_missing_provider_payment_method_id(
        self,
        make_contribution_fn,
        stripe_pi_return_val,
        stripe_sub_return_val,
        stripe_si_return_val,
        expect_update_fields,
        dry_run,
        mocker,
    ):
        contribution = make_contribution_fn()
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_set_revision_comment = mocker.patch("reversion.set_comment")
        mock_get_stripe_pi = mocker.patch("stripe.PaymentIntent.retrieve", return_value=AttrDict(stripe_pi_return_val))
        mock_get_stripe_sub = mocker.patch("stripe.Subscription.retrieve", return_value=AttrDict(stripe_sub_return_val))
        mock_get_stripe_si = mocker.patch("stripe.SetupIntent.retrieve", return_value=AttrDict(stripe_si_return_val))
        mock_get_stripe_payment_method = mocker.patch(
            "stripe.PaymentMethod.retrieve", return_value={"card": {"last4": "1234"}}
        )
        save_spy = mocker.spy(Contribution, "save")
        Contribution.fix_missing_provider_payment_method_id(dry_run=dry_run)
        contribution.refresh_from_db()

        if contribution.interval == ContributionInterval.ONE_TIME:
            mock_get_stripe_pi.assert_called_once()
        else:
            assert mock_get_stripe_sub.call_count or mock_get_stripe_si.call_count

        if "provider_payment_method_details" in expect_update_fields:
            mock_get_stripe_payment_method.assert_called_once()
        else:
            mock_get_stripe_payment_method.assert_not_called()

        if expect_update_fields and not dry_run:
            save_spy.assert_called_once_with(contribution, update_fields=expect_update_fields)
            mock_create_revision.assert_called_once()
            mock_set_revision_comment.assert_called_once()

        else:
            save_spy.assert_not_called()
            mock_create_revision.assert_not_called()
            mock_set_revision_comment.assert_not_called()

    @pytest.mark.parametrize(
        ("make_contribution_fn", "stripe_return_val", "expect_update"),
        [
            (
                lambda: ContributionFactory(
                    one_time=True,
                    provider_payment_method_id="something",
                    provider_payment_method_details=None,
                ),
                {"foo": "bar"},
                True,
            ),
            (
                lambda: ContributionFactory(
                    monthly_subscription=True,
                    provider_payment_method_id="something",
                    provider_payment_method_details=None,
                ),
                {"foo": "bar"},
                True,
            ),
            (
                lambda: ContributionFactory(
                    one_time=True,
                    provider_payment_method_id=None,
                    provider_payment_method_details=None,
                ),
                {"foo": "bar"},
                False,
            ),
            (
                lambda: ContributionFactory(
                    monthly_subscription=True,
                    provider_payment_method_id=None,
                    provider_payment_method_details=None,
                ),
                {"foo": "bar"},
                False,
            ),
            (
                lambda: ContributionFactory(
                    one_time=True,
                    provider_payment_method_id="something",
                    provider_payment_method_details={"foo": "bar"},
                ),
                {"bizz": "bang"},
                False,
            ),
            (
                lambda: ContributionFactory(
                    monthly_subscription=True,
                    provider_payment_method_id="something",
                    provider_payment_method_details={"foo": "bar"},
                ),
                {"bizz": "bang"},
                False,
            ),
        ],
    )
    @pytest.mark.parametrize(
        "contribution_status",
        [ContributionStatus.PAID, ContributionStatus.FLAGGED, ContributionStatus.REJECTED, ContributionStatus.CANCELED],
    )
    @pytest.mark.parametrize("dry_run", [True, False])
    def test_fix_missing_payment_method_details(
        self, make_contribution_fn, stripe_return_val, expect_update, contribution_status, dry_run, monkeypatch, mocker
    ):
        contribution = make_contribution_fn()
        contribution.status = contribution_status
        contribution.save()

        old_data = contribution.provider_payment_method_details
        monkeypatch.setattr(
            "apps.contributions.models.Contribution.fetch_stripe_payment_method",
            lambda *args, **kwargs: stripe_return_val,
        )
        save_spy = mocker.spy(Contribution, "save")
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.return_value.__enter__.return_value = mocker.Mock()
        mock_set_revision_comment = mocker.patch("reversion.set_comment")

        Contribution.fix_missing_payment_method_details_data(dry_run=dry_run)
        contribution.refresh_from_db()
        assert contribution.provider_payment_method_details == (
            stripe_return_val if (expect_update and not dry_run) else old_data
        )
        if expect_update and not dry_run:
            save_spy.assert_called_once_with(
                contribution, update_fields={"provider_payment_method_details", "modified"}
            )
            mock_create_revision.assert_called_once()
            mock_set_revision_comment.assert_called_once()
        else:
            save_spy.assert_not_called()
            mock_create_revision.assert_not_called()
            mock_set_revision_comment.assert_not_called()

    @pytest.fixture
    def empty_metadata_response(self):
        return {"metadata": {}}

    @pytest.fixture(
        params=[
            (
                lambda: ContributionFactory(one_time=True, contribution_metadata=None, provider_payment_id="something"),
                "stripe_payment_intent_retrieve_response",
                True,
            ),
            (
                lambda: ContributionFactory(
                    one_time=True, contribution_metadata={"some": "thing"}, provider_payment_id="something"
                ),
                "stripe_payment_intent_retrieve_response",
                False,
            ),
            (
                lambda: ContributionFactory(one_time=True, contribution_metadata=None, provider_payment_id="something"),
                "empty_metadata_response",
                False,
            ),
            (
                lambda: ContributionFactory(
                    monthly_subscription=True, contribution_metadata=None, provider_payment_id="something"
                ),
                "stripe_payment_intent_retrieve_response",
                True,
            ),
            (
                lambda: ContributionFactory(
                    monthly_subscription=True, contribution_metadata={"some": "thing"}, provider_payment_id="something"
                ),
                "stripe_payment_intent_retrieve_response",
                False,
            ),
            (
                lambda: ContributionFactory(
                    monthly_subscription=True, contribution_metadata=None, provider_payment_id="something"
                ),
                "empty_metadata_response",
                False,
            ),
            (
                lambda: ContributionFactory(
                    monthly_subscription=True, flagged=True, contribution_metadata=None, provider_payment_id="something"
                ),
                "stripe_payment_intent_retrieve_response",
                True,
            ),
            (
                lambda: ContributionFactory(
                    monthly_subscription=True,
                    flagged=True,
                    contribution_metadata={"some": "thing"},
                    provider_payment_id="something",
                ),
                "stripe_payment_intent_retrieve_response",
                False,
            ),
            (
                lambda: ContributionFactory(
                    monthly_subscription=True, flagged=True, contribution_metadata=None, provider_payment_id="something"
                ),
                "empty_metadata_response",
                False,
            ),
        ]
    )
    def fix_missing_contribution_metadata_case(self, request):
        make_contribution_fn, stripe_data, expect_update = request.param
        return make_contribution_fn, request.getfixturevalue(stripe_data), expect_update

    @pytest.mark.parametrize("dry_run", [True, False])
    def test_fix_missing_contribution_metadata(
        self, fix_missing_contribution_metadata_case, dry_run, monkeypatch, mocker
    ):
        """Basic happy path test showing behavior of Contribution.fix_missing_contribution_metadata.

        We show that if a contribution doesn't have contribution metadata and a Stripe entity is found with valid metadata,
        we update our contribution metadata field.

        If, however, a contribution already has metadata, it won't be touched.

        Additionally, we show the `dry_run` functionality.
        """
        make_contribution_fn, stripe_data, expect_update = fix_missing_contribution_metadata_case
        spy = mocker.spy(logger, "warning")
        contribution = make_contribution_fn()
        old_metadata = contribution.contribution_metadata
        target = (
            "stripe.PaymentIntent.retrieve"
            if contribution.interval == ContributionInterval.ONE_TIME
            else (
                "stripe.SetupIntent.retrieve"
                if contribution.provider_setup_intent_id
                else "stripe.Subscription.retrieve"
            )
        )
        # It's a bit tricky to get our JSON fixture which loads to dict to play nicely
        # with AttrDict in a way that works in our code. Utlimately, we're trying to emulate
        # the behavior of Stripe Python SDK paymentintent/setupintent/subscription here.
        # We need to the whole stripe object to have dot-notation, but the metadata field must
        # be savable as a JSON dict.
        metadata = stripe_data.get("metadata")
        stripe_object = AttrDict(stripe_data)
        stripe_object.metadata = metadata
        monkeypatch.setattr(target, lambda *args, **kwargs: stripe_object)

        save_spy = mocker.spy(Contribution, "save")
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.return_value.__enter__.return_value = mocker.Mock()
        mock_set_revision_comment = mocker.patch("reversion.set_comment")

        Contribution.fix_missing_contribution_metadata(dry_run)
        contribution.refresh_from_db()
        assert contribution.contribution_metadata == (metadata if not dry_run and expect_update else old_metadata)
        if not Contribution._stripe_metadata_is_valid_for_contribution_metadata_backfill(metadata):
            spy.assert_called_once_with(
                "`Contribution.fix_missing_contribution_metadata` could not find any valid backfill data for contribution_metadata"
                " for contribution with ID %s",
                contribution.id,
            )

        if expect_update and not dry_run:
            save_spy.assert_called_once_with(contribution, update_fields={"contribution_metadata", "modified"})
            mock_create_revision.assert_called_once()
            mock_set_revision_comment.assert_called_once()
        else:
            save_spy.assert_not_called()
            mock_create_revision.assert_not_called()
            mock_set_revision_comment.assert_not_called()

    def test_fix_missing_contribution_metadata_when_no_stripe_entity_found(
        self, monthly_contribution, monkeypatch, mocker
    ):
        monkeypatch.setattr("apps.contributions.models.Contribution.stripe_subscription", None)
        monthly_contribution.contribution_metadata = None
        monthly_contribution.save()
        spy = mocker.spy(logger, "warning")
        Contribution.fix_missing_contribution_metadata()
        monthly_contribution.refresh_from_db()
        assert monthly_contribution.contribution_metadata is None
        spy.assert_called_once_with(
            "`Contribution.fix_missing_contribution_metadata` could not find any data on Stripe to backfill contribution with ID %s",
            monthly_contribution.id,
        )

    @pytest.mark.parametrize(("score", "expected"), Contribution.BAD_ACTOR_SCORES)
    def test_expanded_bad_actor_score(self, score, expected):
        assert ContributionFactory(bad_actor_score=score).expanded_bad_actor_score == expected

    def test_next_payment_date_when_no_subscription(self):
        contribution = ContributionFactory(interval=ContributionInterval.MONTHLY)
        assert contribution.stripe_subscription is None
        assert contribution.next_payment_date is None

    def test_canceled_at_date_when_no_subscription(self):
        contribution = ContributionFactory(interval=ContributionInterval.MONTHLY, status=ContributionStatus.CANCELED)
        assert contribution.stripe_subscription is None
        assert contribution.canceled_at is None

    @pytest.mark.parametrize(
        "canceled_at",
        [None, datetime.datetime.now(datetime.timezone.utc).timestamp()],
    )
    def test_canceled_at_date_when_subscription(self, canceled_at, contribution, subscription_factory, mocker):
        contribution.interval = ContributionInterval.MONTHLY
        contribution.provider_subscription_id = "something"
        contribution.status = ContributionStatus.CANCELED
        contribution.save()
        (provider := contribution.revenue_program.payment_provider).stripe_account_id = "else"
        provider.save()
        mocker.patch(
            "stripe.Subscription.retrieve",
            return_value=(sub := subscription_factory.get(canceled_at=canceled_at)),
        )
        assert contribution.stripe_subscription == sub

        canceled_at_result = (
            datetime.datetime.fromtimestamp(sub.canceled_at, tz=ZoneInfo("UTC")) if canceled_at else None
        )
        assert contribution.canceled_at == canceled_at_result

    def test_canceled_at_when_one_time(self, one_time_contribution):
        assert one_time_contribution.canceled_at is None

    def test_card_owner_name_when_no_provider_payment_method_details(self, mocker):
        contribution = ContributionFactory(provider_payment_method_details=None)
        assert contribution.card_owner_name == ""

    def test_set_metadata_field_happy_path(self, contribution: Contribution):
        contribution.set_metadata_field(
            "donor_selected_amount", contribution.contribution_metadata["donor_selected_amount"] + 1
        )

    def test_set_metadata_field_bad_key(self, contribution: Contribution):
        with pytest.raises(InvalidMetadataError):
            contribution.set_metadata_field("nonexistent", True)

    def test_set_metadata_field_bad_value(self, contribution: Contribution):
        with pytest.raises(InvalidMetadataError):
            contribution.set_metadata_field("donor_selected_amount", "bad")

    def test_set_metadata_field_no_schema_version(self, contribution: Contribution):
        del contribution.contribution_metadata["schema_version"]
        with pytest.raises(InvalidMetadataError):
            contribution.set_metadata_field("agreed_to_pay_fees", True)

    def test_set_metadata_field_unknown_schema_version(self, contribution: Contribution):
        contribution.contribution_metadata["schema_version"] = "nonexistent"
        with pytest.raises(InvalidMetadataError):
            contribution.set_metadata_field("agreed_to_pay_fees", True)

    def test_set_metadata_field_cannot_change_schema_version(self, contribution: Contribution):
        with pytest.raises(InvalidMetadataError):
            contribution.set_metadata_field("schema_version", "1.0")

    def test_stripe_payment_method_when_no_pm_id(self, mocker):
        mock_retrieve = mocker.patch("stripe.PaymentMethod.retrieve")
        contribution = ContributionFactory(provider_payment_method_id=None)
        assert contribution.stripe_payment_method is None
        mock_retrieve.assert_not_called()

    def test_update_payment_method_for_subscription_when_one_time(self, one_time_contribution):
        with pytest.raises(ValueError, match="Cannot update payment method for one-time contribution"):
            one_time_contribution.update_payment_method_for_subscription("something")

    def test_update_payment_method_for_subscription_when_no_customer_id(self, monthly_contribution):
        monthly_contribution.provider_customer_id = None
        monthly_contribution.provider_subscription_id = "something"
        with pytest.raises(ValueError, match="Cannot update payment method for contribution without a customer ID"):
            monthly_contribution.update_payment_method_for_subscription("something")

    def test_update_payment_method_for_subscription_when_no_subscription_id(self, monthly_contribution):
        monthly_contribution.provider_customer_id = "something"
        monthly_contribution.provider_subscription_id = None
        with pytest.raises(ValueError, match="Cannot update payment method for contribution without a subscription ID"):
            monthly_contribution.update_payment_method_for_subscription("something")

    def test_update_payment_method_for_subscription_when_generic_stripe_error_on_pm_attach(
        self, monthly_contribution, mocker
    ):
        mock_pm_attach = mocker.patch("stripe.PaymentMethod.attach", side_effect=stripe.error.StripeError("something"))
        monthly_contribution.provider_customer_id = (cus_id := "cus_123")
        monthly_contribution.provider_subscription_id = "sub_123"
        with pytest.raises(stripe.error.StripeError):
            monthly_contribution.update_payment_method_for_subscription(pm_id := "pm_123")
        mock_pm_attach.assert_called_once_with(
            pm_id, customer=cus_id, stripe_account=monthly_contribution.stripe_account_id
        )

    def test_update_payment_method_for_subscription_when_card_error_on_pm_attach(self, monthly_contribution, mocker):
        mock_pm_attach = mocker.patch(
            "stripe.PaymentMethod.attach", side_effect=stripe.error.CardError("card error", "cvc", "some-code")
        )
        monthly_contribution.provider_customer_id = (cus_id := "cus_123")
        monthly_contribution.provider_subscription_id = "sub_123"
        with pytest.raises(stripe.error.CardError):
            monthly_contribution.update_payment_method_for_subscription(pm_id := "pm_123")
        mock_pm_attach.assert_called_once_with(
            pm_id, customer=cus_id, stripe_account=monthly_contribution.stripe_account_id
        )

    def test_update_payment_method_for_subscription_when_error_on_subscription_modify(
        self, monthly_contribution, mocker
    ):
        mocker.patch("stripe.PaymentMethod.attach")
        mock_sub_modify = mocker.patch("stripe.Subscription.modify", side_effect=stripe.error.StripeError("something"))
        monthly_contribution.provider_customer_id = "cus_123"
        monthly_contribution.provider_subscription_id = (sub_id := "sub_123")
        with pytest.raises(stripe.error.StripeError):
            monthly_contribution.update_payment_method_for_subscription(pm_id := "pm_123")
        mock_sub_modify.assert_called_once_with(
            sub_id, default_payment_method=pm_id, stripe_account=monthly_contribution.stripe_account_id
        )

    def test_update_subscription_amount_when_one_time(self, one_time_contribution: Contribution):
        one_time_contribution.stripe_subscription = MockSubscription("active")
        with pytest.raises(ValueError, match="Cannot update amount for one-time contribution"):
            one_time_contribution.update_subscription_amount(amount=100, donor_selected_amount=1)

    @pytest.mark.parametrize(
        "amount",
        [99, 0, -100],
    )
    def test_update_subscription_amount_when_invalid_amount(self, amount, monthly_contribution: Contribution):
        monthly_contribution.stripe_subscription = MockSubscription("active")
        with pytest.raises(ValueError, match=r"Amount value must be greater than \$0.99"):
            monthly_contribution.update_subscription_amount(amount=amount, donor_selected_amount=amount / 100)

    def test_update_subscription_amount_when_invalid_amount_above_max(self, monthly_contribution: Contribution):
        monthly_contribution.stripe_subscription = MockSubscription("active")
        with pytest.raises(ValueError, match=r"Amount value must be smaller than \$999,999.99"):
            monthly_contribution.update_subscription_amount(
                amount=STRIPE_MAX_AMOUNT + 1, donor_selected_amount=(STRIPE_MAX_AMOUNT + 1) / 100
            )

    @pytest.mark.parametrize(
        "status",
        [
            "paused",
            "incomplete_expired",
            "past_due",
            "canceled",
            "unpaid",
            "incomplete",
            "trialing",
        ],
    )
    def test_update_subscription_amount_when_inactive_subscription(self, status, monthly_contribution: Contribution):
        monthly_contribution.stripe_subscription = MockSubscription(status)
        with pytest.raises(ValueError, match="Cannot update amount for inactive subscription"):
            monthly_contribution.update_subscription_amount(amount=123, donor_selected_amount=1.23)

    def test_update_subscription_amount_when_no_subscription_id(self, monthly_contribution: Contribution):
        monthly_contribution.stripe_subscription = MockSubscription("active")
        monthly_contribution.provider_subscription_id = None
        with pytest.raises(ValueError, match="Cannot update amount for contribution without a subscription ID"):
            monthly_contribution.update_subscription_amount(amount=123, donor_selected_amount=1.23)

    def test_update_subscription_amount_when_error_on_sub_item_retrieval(
        self, monthly_contribution: Contribution, mocker
    ):
        mock_sub_item_list = mocker.patch(
            "stripe.SubscriptionItem.list", side_effect=stripe.error.StripeError("something")
        )
        monthly_contribution.stripe_subscription = MockSubscription("active")
        monthly_contribution.provider_subscription_id = (sub_id := "sub_123")
        with pytest.raises(stripe.error.StripeError):
            monthly_contribution.update_subscription_amount(amount=123, donor_selected_amount=1.23)
        mock_sub_item_list.assert_called_once_with(
            subscription=sub_id, stripe_account=monthly_contribution.stripe_account_id
        )

    def test_update_subscription_amount_when_return_multiple_sub_items(
        self, monthly_contribution: Contribution, mocker
    ):
        mocker.patch("stripe.SubscriptionItem.list", return_value={"data": [{"id": "si_123"}, {"id": "si_456"}]})
        monthly_contribution.stripe_subscription = MockSubscription("active")
        with pytest.raises(ValueError, match="Subscription should have only one item"):
            monthly_contribution.update_subscription_amount(amount=123, donor_selected_amount=1.23)

    def test_update_subscription_amount_when_error_on_subscription_modify(
        self, monthly_contribution: Contribution, mocker
    ):
        mocker.patch(
            "stripe.SubscriptionItem.list",
            return_value={
                "data": [
                    {
                        "id": (item_id := "si_123"),
                        "price": {
                            "currency": (curr := "usd"),
                            "product": (prod_id := "prod_123"),
                            "recurring": {
                                "interval": (interval := "month"),
                            },
                        },
                    }
                ]
            },
        )
        mock_sub_modify = mocker.patch("stripe.Subscription.modify", side_effect=stripe.error.StripeError("something"))
        monthly_contribution.stripe_subscription = MockSubscription("active")
        monthly_contribution.provider_subscription_id = (sub_id := "sub_123")
        with pytest.raises(stripe.error.StripeError):
            monthly_contribution.update_subscription_amount(amount := 123, donor_selected_amount=1.23)

        metadata = monthly_contribution.contribution_metadata
        metadata["amount"] = amount

        mock_sub_modify.assert_called_once_with(
            sub_id,
            stripe_account=monthly_contribution.stripe_account_id,
            metadata=metadata,
            proration_behavior="none",
            items=[
                {
                    "id": item_id,
                    "price_data": {
                        "unit_amount": amount,
                        "currency": curr,
                        "product": prod_id,
                        "recurring": {
                            "interval": interval,
                        },
                    },
                }
            ],
        )

    def test_update_subscription_amount_when_success_update_contribution(
        self, monthly_contribution: Contribution, mocker
    ):
        mocker.patch(
            "stripe.SubscriptionItem.list",
            return_value={
                "data": [
                    {
                        "id": "si_123",
                        "price": {
                            "currency": "usd",
                            "product": "prod_123",
                            "recurring": {
                                "interval": "month",
                            },
                        },
                    }
                ]
            },
        )
        mocker.patch("stripe.Subscription.modify")
        monthly_contribution.stripe_subscription = MockSubscription("active")
        new_amount = monthly_contribution.amount * 2
        monthly_contribution.update_subscription_amount(amount=new_amount, donor_selected_amount=new_amount / 100)
        metadata = monthly_contribution.contribution_metadata
        metadata["amount"] = new_amount
        assert monthly_contribution.contribution_metadata == metadata
        assert monthly_contribution.amount == new_amount

    @pytest.mark.parametrize(
        "contribution_metadata",
        [
            {
                "agreed_to_pay_fees": True,
                "recurring_donation_id": "",
                "revenue_program_id": "",
                "revenue_program_slug": "",
                "schema_version": "1.3",
                "source": "legacy-migration",
            },
            {
                "agreed_to_pay_fees": True,
                "donor_selected_amount": 123,
                "referer": "https://fundjournalism.org",
                "revenue_program_id": "",
                "revenue_program_slug": "",
                "schema_version": "1.4",
                "source": "rev-engine",
            },
        ],
    )
    def test_update_subscription_amount_updates_donor_selected_amount_metadata(
        self, contribution_metadata, monthly_contribution, mocker
    ):
        # Verify our fixture is valid.
        assert cast_metadata_to_stripe_payment_metadata_schema(contribution_metadata)
        mocker.patch(
            "stripe.SubscriptionItem.list",
            return_value={
                "data": [
                    {
                        "id": "si_123",
                        "price": {
                            "currency": "usd",
                            "product": "prod_123",
                            "recurring": {
                                "interval": "month",
                            },
                        },
                    }
                ]
            },
        )
        mocker.patch("stripe.Subscription.modify")
        monthly_contribution.stripe_subscription = MockSubscription("active")
        monthly_contribution.contribution_metadata = contribution_metadata
        monthly_contribution.update_subscription_amount(amount=456, donor_selected_amount=4.56)
        if "donor_selected_amount" in contribution_metadata:
            assert monthly_contribution.contribution_metadata["donor_selected_amount"] == 4.56
        else:
            assert "donor_selected_amount" not in monthly_contribution.contribution_metadata

    @pytest.mark.usefixtures("_mock_stripe_customer")
    def test_sends_updated_email_when_update_subscription_amount_success(
        self, monthly_contribution: Contribution, mocker
    ):
        mocker.patch(
            "stripe.SubscriptionItem.list",
            return_value={
                "data": [
                    {
                        "id": "si_123",
                        "price": {
                            "currency": "usd",
                            "product": "prod_123",
                            "recurring": {
                                "interval": "month",
                            },
                        },
                    }
                ]
            },
        )
        mocker.patch("stripe.Subscription.modify")
        monthly_contribution.stripe_subscription = MockSubscription("active")
        new_amount = monthly_contribution.amount * 2
        send_email_spy = mocker.patch("apps.emails.tasks.send_templated_email.delay")
        monthly_contribution.update_subscription_amount(amount=new_amount, donor_selected_amount=new_amount / 100)

        data = generate_email_data(
            monthly_contribution,
            custom_timestamp=(datetime.datetime.now(datetime.timezone.utc).strftime("%m/%d/%Y")),
        )

        currency = monthly_contribution.get_currency_dict()
        formatted_amount = monthly_contribution.format_amount(
            amount=new_amount, symbol=currency["symbol"], code=currency["code"]
        )
        assert send_email_spy.call_count == 1
        assert send_email_spy.call_args[0][1] == "New change to your contribution"
        assert send_email_spy.call_args[0][2] == render_to_string("recurring-contribution-amount-updated.txt", data)
        assert send_email_spy.call_args[0][3] == render_to_string("recurring-contribution-amount-updated.html", data)
        assert "New Amount:" in send_email_spy.call_args[0][2]
        assert f"{formatted_amount}/month" in send_email_spy.call_args[0][2]
        assert "New Amount:" in send_email_spy.call_args[0][3]
        assert f"{formatted_amount}/month" in send_email_spy.call_args[0][3]

    @pytest.mark.parametrize(
        ("payment_data", "expected"),
        [
            (None, ""),
            ({}, ""),
            ({"type": "card", "card": {"brand": (brand := "my-brand")}}, brand),
        ],
    )
    def test_card_brand(self, payment_data, expected):
        assert ContributionFactory(provider_payment_method_details=payment_data).card_brand == expected

    @pytest.mark.parametrize(
        ("payment_data", "expected"),
        [
            (None, ""),
            ({}, ""),
            ({"type": "card", "card": {"exp_month": 12, "exp_year": 2022}}, "12/2022"),
        ],
    )
    def test_card_expiration_date(self, payment_data, expected):
        assert ContributionFactory(provider_payment_method_details=payment_data).card_expiration_date == expected

    @pytest.mark.parametrize(
        ("payment_data", "expected"),
        [
            (None, ""),
            ({}, ""),
            ({"type": "card", "billing_details": {"name": (name := "Foo Bar")}}, name),
        ],
    )
    def test_card_owner_name(self, payment_data, expected):
        assert ContributionFactory(provider_payment_method_details=payment_data).card_owner_name == expected

    @pytest.mark.parametrize(
        ("payment_data", "expected"),
        [
            (None, ""),
            ({}, ""),
            ({"type": "card", "card": {"last4": (last_4 := "1234")}}, last_4),
        ],
    )
    def test_card_last_4(self, payment_data, expected):
        assert ContributionFactory(provider_payment_method_details=payment_data).card_last_4 == expected

    @pytest.mark.parametrize(
        ("has_page", "has_rp", "expect_error"),
        [
            (True, True, True),
            (False, False, True),
            (False, True, False),
            (True, False, False),
        ],
    )
    def test_exclusive_donation_page_or__rp_constraint(self, has_page, has_rp, expect_error):
        page = DonationPageFactory() if has_page else None
        rp = RevenueProgramFactory() if has_rp else None
        if expect_error:
            with pytest.raises(IntegrityError):
                ContributionFactory(donation_page=page, _revenue_program=rp)
        else:
            ContributionFactory(donation_page=page, _revenue_program=rp)

    def test_stripe_customer_when_no_customer_id(self):
        contribution = ContributionFactory(provider_customer_id=None)
        assert contribution.stripe_customer is None

    def test_stripe_customer_when_error_on_retrieve(self, mocker):
        contribution = ContributionFactory(provider_customer_id="something")
        mock_retrieve = mocker.patch("stripe.Customer.retrieve", side_effect=stripe.error.StripeError("uh oh"))
        assert contribution.stripe_customer is None
        mock_retrieve.assert_called_once_with(
            contribution.provider_customer_id, stripe_account=contribution.stripe_account_id
        )

    def test_stripe_customer_when_retrieve_success(self, mocker):
        contribution = ContributionFactory(provider_customer_id="something")
        mock_retrieve = mocker.patch("stripe.Customer.retrieve", return_value=(retrieved := "something"))
        assert contribution.stripe_customer == retrieved
        mock_retrieve.assert_called_once_with(
            contribution.provider_customer_id, stripe_account=contribution.stripe_account_id
        )

    def test_exclude_recurring_missing_provider_subscription_id(self, mocker):
        ContributionFactory(provider_subscription_id=None, monthly_subscription=True, status=ContributionStatus.PAID)
        expected = ContributionFactory(
            provider_subscription_id="something", monthly_subscription=True, status=ContributionStatus.PAID
        )
        assert (returned := Contribution.objects.exclude_recurring_missing_provider_subscription_id()).count() == 1
        assert returned.first() == expected

    @pytest.mark.parametrize("status", ContributionQuerySet.CONTRIBUTOR_HIDDEN_STATUSES)
    def test_exclude_hidden_statuses(self, status):
        ContributionFactory(status=status)
        assert Contribution.objects.exclude_hidden_statuses().count() == 0

    def test_exclude_paymentless_canceled(self):
        contribution = ContributionFactory(one_time=True, status=ContributionStatus.CANCELED)
        assert contribution.status == ContributionStatus.CANCELED
        assert contribution.payment_set.count() == 0
        assert Contribution.objects.exclude_paymentless_canceled().count() == 0

    def test_create_create_canceled_contribution_activity_log_happy_path(self, contribution: Contribution) -> None:
        activity_log = contribution.create_canceled_contribution_activity_log(actor=contribution.contributor)
        assert activity_log.actor_content_object == contribution.contributor
        assert activity_log.action == ActivityLog.CANCEL
        assert activity_log.activity_object_content_object == contribution
        assert activity_log.pk
        assert activity_log.created
        assert activity_log.modified

    def test_create_create_canceled_contribution_activity_log_unexpected_error(
        self, contribution: Contribution, mocker: pytest_mock.MockerFixture
    ) -> None:
        mocker.patch("apps.activity_log.models.ActivityLog.objects.create", side_effect=Exception("unexpected error"))
        assert contribution.create_canceled_contribution_activity_log(actor=contribution.contributor) is None


@pytest.mark.django_db
class TestContributionQuerySetMethods:
    """Basic unit tests for custom queryset methods that are on Contribution model."""

    def test_one_time(self, one_time_contribution, monthly_contribution, annual_contribution):
        """Show one-time contributions are returned by this method."""
        one_times = Contribution.objects.filter(interval=ContributionInterval.ONE_TIME)
        recurring = Contribution.objects.exclude(id__in=one_times.values_list("id", flat=True))
        assert one_times.count()
        assert recurring.count()
        returned_one_times = Contribution.objects.one_time()
        assert returned_one_times.count() == one_times.count()
        assert set(returned_one_times.values_list("id", flat=True)) == set(one_times.values_list("id", flat=True))

    def test_recurring(self, one_time_contribution, monthly_contribution, annual_contribution):
        """Show recurring contributions are returned by this method."""
        one_times = Contribution.objects.filter(interval=ContributionInterval.ONE_TIME)
        recurring = Contribution.objects.exclude(id__in=one_times.values_list("id", flat=True))
        assert one_times.count()
        assert recurring.count()
        returned_recurring = Contribution.objects.recurring()
        assert returned_recurring.count() == recurring.count()
        assert set(returned_recurring.values_list("id", flat=True)) == set(recurring.values_list("id", flat=True))

    @pytest.fixture
    def abandoned_contribution(self):
        return ContributionFactory(abandoned=True)

    def test_having_org_viewable_status(
        self,
        abandoned_contribution,
        flagged_contribution,
        rejected_contribution,
        canceled_contribution,
        refunded_contribution,
        successful_contribution,
        processing_contribution,
    ):
        """Show that this method excludes the expected statuses and includes the right ones."""
        assert (
            Contribution.objects.filter(
                id__in=[
                    abandoned_contribution.id,
                    flagged_contribution.id,
                    rejected_contribution.id,
                    processing_contribution.id,
                ]
            ).count()
            == 4
        )
        assert set(Contribution.objects.having_org_viewable_status().values_list("id", flat=True)) == {
            canceled_contribution.id,
            refunded_contribution.id,
            successful_contribution.id,
        }

    @pytest.mark.usefixtures("not_unmarked_abandoned_contributions")
    def test_unmarked_abandoned_carts(self, unmarked_abandoned_contributions):
        """Show that this method returns the expected results."""
        assert unmarked_abandoned_contributions
        assert set(Contribution.objects.unmarked_abandoned_carts().values_list("id", flat=True)) == {
            c.id for c in unmarked_abandoned_contributions
        }

    def test_with_first_payment_date_when_payments_exist(self, monthly_contribution_multiple_payments):
        contributions = Contribution.objects.with_first_payment_date()
        assert contributions.count() == 1
        assert (con := contributions.first()).first_payment_date == con.payment_set.exclude(
            transaction_time__isnull=True
        ).order_by("transaction_time").first().transaction_time

    def test_with_first_payment_date_when_no_payments(self, one_time_contribution):
        contributions = Contribution.objects.with_first_payment_date()
        assert contributions.count() == 1
        assert Payment.objects.filter(contribution_id=contributions.first().id).count() == 0
        assert contributions.first().first_payment_date is None

    def test_with_stripe_account(self):
        contribution_1 = ContributionFactory(one_time=True)
        contribution_2 = ContributionFactory(
            one_time=True, donation_page=None, _revenue_program=contribution_1.donation_page.revenue_program
        )
        assert contribution_1.stripe_account_id
        assert contribution_2.stripe_account_id
        assert set(Contribution.objects.with_stripe_account().values_list("stripe_account", flat=True)) == {
            contribution_1.stripe_account_id
        }

    def test_get_via_reversion_comment(self):
        expected_contribution = ContributionFactory()
        # this one won't have the message
        ContributionFactory()
        with reversion.create_revision():
            expected_contribution.save()
            reversion.set_comment(msg := "foo")
        assert set(Contribution.objects.get_via_reversion_comment(msg)) == {expected_contribution}

    def test_exclude_dummy_payment_method_id(self, settings):
        contribution = ContributionFactory(provider_payment_method_id="something")
        ContributionFactory(provider_payment_method_id=settings.DUMMY_PAYMENT_METHOD_ID)
        assert (query := Contribution.objects.exclude_dummy_payment_method_id()).count() == 1
        assert set(query.values_list("id", flat=True)) == {contribution.id}

    def test_exclude_disconnected_stripe_accounts_when_ineligible(self, mocker):
        contribution = ContributionFactory()
        assert contribution.revenue_program.payment_provider.stripe_account_id
        mocker.patch("stripe.Account.retrieve", side_effect=stripe.error.PermissionError("unpermitted"))
        assert Contribution.objects.exclude_disconnected_stripe_accounts().count() == 0

    def test_exclude_disconnected_stripe_accounts_when_eligible(self, mocker):
        contribution = ContributionFactory()
        assert contribution.revenue_program.payment_provider.stripe_account_id
        mocker.patch("stripe.Account.retrieve", return_value=AttrDict({"id": "acct_1"}))
        assert (qs := Contribution.objects.exclude_disconnected_stripe_accounts()).count() == 1
        assert qs.first() == contribution


@pytest.fixture
def charge_refunded_one_time_event():
    with Path("apps/contributions/tests/fixtures/charge-refunded-one-time-event.json").open() as f:
        return stripe.Webhook.construct_event(f.read(), None, stripe.api_key)


@pytest.fixture
def charge_refunded_recurring_first_charge_event():
    with Path("apps/contributions/tests/fixtures/charge-refunded-recurring-first-charge-event.json").open() as f:
        return stripe.Webhook.construct_event(f.read(), None, stripe.api_key)


@pytest.fixture
def non_event():
    return "foo"


@pytest.fixture(
    params=[
        (True, "payment_intent_succeeded_one_time_event", lambda x: None, []),
        (True, "payment_intent_succeeded_subscription_creation_event", lambda x: None, []),
        (True, "charge_refunded_one_time_event", lambda x: None, []),
        (True, "charge_refunded_recurring_charge_event", lambda x: None, []),
        (True, "charge_refunded_recurring_first_charge_event", lambda x: None, []),
        (True, "payment_intent_succeeded_one_time_event", lambda x: None, ["payment_intent.succeeded"]),
        (True, "payment_intent_succeeded_subscription_creation_event", lambda x: None, ["payment_intent.succeeded"]),
        (True, "charge_refunded_one_time_event", lambda x: None, ["charge.refunded"]),
        (True, "charge_refunded_recurring_charge_event", lambda x: None, ["charge.refunded"]),
        (True, "charge_refunded_recurring_first_charge_event", lambda x: None, ["charge.refunded"]),
        (
            True,
            "payment_intent_succeeded_one_time_event",
            lambda x: Payment.EVENT_IS_UNEXPECTED_TYPE_ERROR_MSG_TEMPLATE.format(event_types=x),
            ["foo.bar"],
        ),
        (
            True,
            "payment_intent_succeeded_subscription_creation_event",
            lambda x: Payment.EVENT_IS_UNEXPECTED_TYPE_ERROR_MSG_TEMPLATE.format(event_types=x),
            ["foo.bar"],
        ),
        (
            True,
            "charge_refunded_one_time_event",
            lambda x: Payment.EVENT_IS_UNEXPECTED_TYPE_ERROR_MSG_TEMPLATE.format(event_types=x),
            ["foo.bar"],
        ),
        (
            True,
            "charge_refunded_recurring_first_charge_event",
            lambda x: Payment.EVENT_IS_UNEXPECTED_TYPE_ERROR_MSG_TEMPLATE.format(event_types=x),
            ["foo.bar"],
        ),
        (False, None, lambda x: Payment.MISSING_EVENT_KW_ERROR_MSG, []),
    ]
)
def ensure_stripe_event_case(request):
    event = request.param[1]
    if event and isinstance(event, dict):
        event = StripeEventData(**event)
    return (
        # include event kwarg
        request.param[0],
        # event
        StripeEventData(**request.getfixturevalue(request.param[1])) if request.param[1] else None,
        # fn to generated expected error message
        request.param[2],
        # event types to pass to decorator
        request.param[3],
    )


@pytest.mark.usefixtures("_suppress_stripe_webhook_sig_verification")
def test_ensure_stripe_event(ensure_stripe_event_case):
    """Show that the decorator works as expected.

    We wrap an internal function with decorator from class
    """
    include_event_kwarg, event, expected_error_msg_fn, event_types = ensure_stripe_event_case
    expected_error_msg = expected_error_msg_fn(event_types)

    @ensure_stripe_event(event_types)
    def my_func(event):
        return event

    kwargs = {"event": event} if include_event_kwarg else {}
    if expected_error_msg:
        with pytest.raises(ValueError, match=re.escape(expected_error_msg)) as exc_info:
            my_func(**kwargs)
        assert str(exc_info.value) == expected_error_msg
    else:
        assert my_func(**kwargs) == kwargs["event"]


@pytest.mark.parametrize(
    "value",
    [
        "foo",
        True,
        False,
        "",
        {},
        {"foo": "bar"},
    ],
)  # ...etc., but let's not be pedantic
def test_ensure_stripe_event_when_wrong_type(value):
    @ensure_stripe_event()
    def my_func(value):
        return value

    with pytest.raises(ValueError, match=Payment.ARG_IS_NOT_EVENT_TYPE_ERROR_MSG):
        my_func(event=value)


@pytest.mark.django_db
@pytest.mark.usefixtures("_suppress_stripe_webhook_sig_verification", "_clear_cache")
class TestPayment:
    @pytest.fixture
    def payment(self):
        return PaymentFactory()

    def test___str__(self, payment):
        assert str(payment) == (
            f"Payment {payment.id} for contribution {payment.contribution.id} and balance transaction"
            f" {payment.stripe_balance_transaction_id}"
        )

    @pytest.fixture
    def invalid_metadata(self):
        return {"foo": "bar"}

    @pytest.fixture
    def valid_metadata(self, valid_metadata_factory):
        data = valid_metadata_factory.get() | {"schema_version": settings.METADATA_SCHEMA_VERSION_CURRENT}
        del data["t_shirt_size"]
        return data

    @pytest.fixture
    def no_metadata(self):
        return None

    @pytest.fixture
    def balance_transaction_for_refund_of_recurring_charge(self):
        with Path(
            "apps/contributions/tests/fixtures/balance-transaction-for-refund-of-recurring-charge.json"
        ).open() as f:
            return stripe.BalanceTransaction.construct_from(json.load(f), stripe.api_key)

    @pytest.fixture
    def balance_transaction_for_refund_of_subscription_creation_charge(self):
        with Path(
            "apps/contributions/tests/fixtures/balance-transaction-for-refund-of-subscription-creation-charge.json"
        ).open() as f:
            return stripe.BalanceTransaction.construct_from(json.load(f), stripe.api_key)

    @pytest.fixture(
        params=(
            (
                "payment_intent_succeeded_one_time_event",
                "payment_intent_for_one_time_contribution",
                "balance_transaction_for_one_time_charge",
                True,
                True,
            ),
            (
                "payment_intent_succeeded_subscription_creation_event",
                "payment_intent_for_subscription_creation_charge",
                "balance_transaction_for_subscription_creation_charge",
                False,
                True,
            ),
            (
                "payment_intent_succeeded_subscription_recurring_charge_event",
                "payment_intent_for_recurring_charge",
                "balance_transaction_for_recurring_charge",
                False,
                False,
            ),
        )
    )
    def payment_from_pi_succeeded_test_case_factory(self, request, mocker):
        def _implmenentation(contribution_found: bool):
            event = request.getfixturevalue(request.param[0])
            pi = request.getfixturevalue(request.param[1])
            pi.id = event.data.object.id
            balance_transaction = request.getfixturevalue(request.param[2])
            expect_payment_creation = request.param[3]
            pi_id_on_contribution = request.param[4]
            pi.charges = event.data.object.charges

            mocker.patch("stripe.BalanceTransaction.retrieve", return_value=balance_transaction)
            mocker.patch("stripe.PaymentIntent.retrieve", return_value=pi)
            kwargs = {
                "interval": (
                    ContributionInterval.ONE_TIME
                    if balance_transaction.source.invoice is None
                    else ContributionInterval.MONTHLY
                ),
                "provider_payment_id": pi.id if pi_id_on_contribution else None,
            }

            if request.param[0] in (
                "payment_intent_succeeded_subscription_recurring_charge_event",
                "payment_intent_succeeded_subscription_creation_event",
            ):
                kwargs["provider_subscription_id"] = balance_transaction.source.invoice.subscription
            return (
                event,
                ContributionFactory(**kwargs) if contribution_found else None,
                balance_transaction,
                expect_payment_creation,
            )

        return _implmenentation

    @pytest.mark.parametrize("contribution_found", [True, False])
    def test_from_stripe_payment_intent_succeeded_event(
        self, contribution_found, payment_from_pi_succeeded_test_case_factory
    ):
        """Crucially, show that we do not create a payment in context of a subscription creation event."""
        event, contribution, balance_transaction, expect_payment = payment_from_pi_succeeded_test_case_factory(
            contribution_found
        )
        count = Payment.objects.count()
        _kwargs = {"event": StripeEventData(**event)}
        if contribution is None:
            with pytest.raises(ValueError, match="Could not find a contribution for this event"):
                Payment.from_stripe_payment_intent_succeeded_event(**_kwargs)
        else:
            payment = Payment.from_stripe_payment_intent_succeeded_event(**_kwargs)
            if expect_payment:
                assert payment.contribution == contribution
                assert payment.net_amount_paid == balance_transaction.net
                assert payment.gross_amount_paid == balance_transaction.amount
                assert payment.amount_refunded == 0
                assert payment.stripe_balance_transaction_id == balance_transaction.id
            else:
                assert payment is None
                assert Payment.objects.count() == count

    @pytest.fixture
    def balance_transaction_for_refund_of_one_time_charge(self):
        with Path(
            "apps/contributions/tests/fixtures/balance-transaction-for-refund-of-one-time-charge.json"
        ).open() as f:
            return stripe.BalanceTransaction.construct_from(json.load(f), stripe.api_key)

    @pytest.fixture(
        params=(
            (
                "charge_refunded_one_time_event",
                "payment_intent_for_one_time_contribution",
                "balance_transaction_for_refund_of_one_time_charge",
            ),
            (
                "charge_refunded_recurring_charge_event",
                "payment_intent_for_recurring_charge",
                "balance_transaction_for_refund_of_recurring_charge",
            ),
            (
                "charge_refunded_recurring_first_charge_event",
                "payment_intent_for_subscription_creation_charge",
                "balance_transaction_for_refund_of_subscription_creation_charge",
            ),
        )
    )
    def payment_from_charge_refunded_test_case_factory(self, request, mocker):
        def implementation(contribution_found: bool):
            # get these all linked up correctly
            # how charge relate to bt to ? re: amoutn on refund for fixture

            payment_intent = request.getfixturevalue(request.param[1])
            balance_transaction = request.getfixturevalue(request.param[2])
            balance_transaction.amount = payment_intent.amount
            balance_transaction.source.amount_refunded = payment_intent.amount
            balance_transaction.source.payment_intent = payment_intent.id
            event = request.getfixturevalue(request.param[0])
            event.data.object.payment_intent = payment_intent.id
            event.data.object.amount_refunded = balance_transaction.source.amount_refunded
            event.data.object.refunds.data[0].balance_transaction = balance_transaction.id
            event.data.object.refunds.data[0].amount = balance_transaction.source.amount_refunded

            mocker.patch(
                "stripe.BalanceTransaction.retrieve",
                return_value=balance_transaction,
            )
            mocker.patch(
                "stripe.PaymentIntent.retrieve",
                return_value=payment_intent,
            )

            match request.param[0]:
                case "charge_refunded_one_time_event":
                    kwargs = {
                        "interval": ContributionInterval.ONE_TIME,
                        "provider_payment_id": event.data.object.payment_intent,
                    }
                case "charge_refunded_recurring_charge_event":
                    kwargs = {
                        "interval": ContributionInterval.MONTHLY,
                        "provider_subscription_id": payment_intent.invoice.subscription,
                    }
                case "charge_refunded_recurring_first_charge_event":
                    kwargs = {
                        "interval": ContributionInterval.MONTHLY,
                        "provider_payment_id": event.data.object.payment_intent,
                        "provider_subscription_id": payment_intent.invoice.subscription,
                    }

            contribution = ContributionFactory(**kwargs) if contribution_found else None
            return (
                event,
                contribution,
                balance_transaction,
            )

        return implementation

    @pytest.mark.parametrize("contribution_found", [True])
    def test_from_stripe_charge_refunded_event(
        self, contribution_found, payment_from_charge_refunded_test_case_factory
    ):
        event, contribution, _ = payment_from_charge_refunded_test_case_factory(contribution_found=contribution_found)
        kwargs = {"event": StripeEventData(**event)}
        if not contribution_found:
            with pytest.raises(ValueError, match="Could not find a contribution for this event"):
                Payment.from_stripe_charge_refunded_event(**kwargs)
        else:
            payment = Payment.from_stripe_charge_refunded_event(**kwargs)
            assert payment.contribution == contribution
            assert payment.net_amount_paid == 0
            assert payment.gross_amount_paid == 0
            assert payment.amount_refunded == event.data.object.refunds.data[0].amount
            assert payment.stripe_balance_transaction_id == event.data.object.refunds.data[0].balance_transaction

    @pytest.fixture
    def invoice_payment_succeeded_recurring_charge_event(self):
        with Path("apps/contributions/tests/fixtures/invoice-payment-succeeded-event.json").open() as f:
            return stripe.Webhook.construct_event(f.read(), None, None)

    @pytest.fixture(
        params=[
            (
                "invoice_payment_succeeded_recurring_charge_event",
                "payment_intent_for_recurring_charge",
                "balance_transaction_for_recurring_charge",
            ),
        ]
    )
    def payment_from_invoice_payment_succeeded_test_case_factory(self, request, mocker):
        def implementation(contribution_found: bool, balance_transaction_found: bool):
            event = request.getfixturevalue(request.param[0])
            payment_intent = request.getfixturevalue(request.param[1])
            balance_transaction = request.getfixturevalue(request.param[2]) if balance_transaction_found else None
            if balance_transaction:
                balance_transaction.amount = payment_intent.amount
                balance_transaction.source.amount_refunded = payment_intent.amount
                balance_transaction.source.payment_intent = payment_intent.id
            mocker.patch(
                "stripe.BalanceTransaction.retrieve",
                return_value=balance_transaction,
            )
            mocker.patch(
                "stripe.PaymentIntent.retrieve",
                return_value=payment_intent,
            )
            kwargs = {
                "interval": ContributionInterval.MONTHLY,
                "provider_payment_id": event.data.object.payment_intent,
                "provider_subscription_id": payment_intent.invoice.subscription,
            }
            contribution = ContributionFactory(**kwargs) if contribution_found else None
            return (
                event,
                contribution,
                balance_transaction if balance_transaction_found else None,
            )

        return implementation

    @pytest.mark.parametrize("contribution_found", [True, False])
    @pytest.mark.parametrize("balance_transaction_found", [True, False])
    def test_from_stripe_invoice_payment_succeeded_event(
        self,
        contribution_found,
        balance_transaction_found,
        payment_from_invoice_payment_succeeded_test_case_factory,
    ):
        event, contribution, balance_transaction = payment_from_invoice_payment_succeeded_test_case_factory(
            contribution_found=contribution_found, balance_transaction_found=balance_transaction_found
        )
        kwargs = {"event": StripeEventData(**event)}
        if not contribution_found:
            with pytest.raises(ValueError, match="Could not find a contribution for this event"):
                Payment.from_stripe_invoice_payment_succeeded_event(**kwargs)
        if contribution_found and not balance_transaction_found:
            with pytest.raises(ValueError, match="Could not find a balance transaction for this event"):
                payment = Payment.from_stripe_invoice_payment_succeeded_event(**kwargs)
        if contribution and balance_transaction:
            payment = Payment.from_stripe_invoice_payment_succeeded_event(**kwargs)
            assert payment.contribution == contribution
            assert payment.net_amount_paid == balance_transaction.net
            assert payment.gross_amount_paid == balance_transaction.amount
            assert payment.amount_refunded == 0
            assert payment.stripe_balance_transaction_id == balance_transaction.id

    @pytest.mark.parametrize(
        ("charges", "expect_error"),
        [
            ([], True),
            ([stripe.Charge.construct_from({"id": "foo"}, stripe.api_key)], False),
            (
                [
                    stripe.Charge.construct_from({"id": "foo"}, stripe.api_key),
                    stripe.Charge.construct_from({"id": "bar"}, stripe.api_key),
                ],
                True,
            ),
        ],
    )
    def test__ensure_pi_has_single_charge(
        self, charges, expect_error, payment_intent_for_one_time_contribution, mocker
    ):
        """Show that we raise an error if there are no charges or more than one charge.

        We only test this path through function because other paths get tested in calling contexts.

        This is only here to achieve 100% test coverage on the model.
        """
        payment_intent_for_one_time_contribution.charges.data = charges
        if expect_error:
            with pytest.raises(ValueError, match="Cannot link payment intent to a single balance transaction"):
                Payment._ensure_pi_has_single_charge(payment_intent_for_one_time_contribution, "some-id")
        else:
            assert Payment._ensure_pi_has_single_charge(payment_intent_for_one_time_contribution, "some-id") is None

    def test_get_contribution_and_balance_transaction_for_payment_intent_succeeded_event_edge_case(
        self, payment_intent_succeeded_one_time_event, payment_intent_for_one_time_contribution, mocker
    ):
        """Edge case that we narrowly test for in this function to get to 100% on the model."""
        Contribution.objects.all().delete()
        payment_intent_for_one_time_contribution.charges.data[0].balance_transaction = None
        mocker.patch("stripe.PaymentIntent.retrieve", return_value=payment_intent_for_one_time_contribution)

        assert Payment.get_contribution_and_balance_transaction_for_payment_intent_succeeded_event(
            event=StripeEventData(**payment_intent_succeeded_one_time_event)
        )

    def test_get_contribution_and_balance_transaction_for_payment_intent_succeeded_event_when_contribution_not_found(
        self, mocker, payment_intent_succeeded_one_time_event, payment_intent_for_one_time_contribution
    ):
        """Edge case that we narrowly test for in this function to get to 100% on the model."""
        Contribution.objects.all().delete()
        mocker.patch("stripe.PaymentIntent.retrieve", return_value=payment_intent_for_one_time_contribution)
        mocker.patch("stripe.BalanceTransaction.retrieve", return_value=None)
        assert Payment.get_contribution_and_balance_transaction_for_payment_intent_succeeded_event(
            event=StripeEventData(**payment_intent_succeeded_one_time_event)
        ) == (None, None)

    def test_multiple_payments_for_recurring_contribution_behavior(self, monthly_contribution):
        for _ in range(2):
            PaymentFactory(contribution=monthly_contribution)
        assert monthly_contribution.payment_set.count() == 2

    @pytest.mark.parametrize(
        ("interval", "event_fixture"),
        [
            (ContributionInterval.ONE_TIME, "payment_intent_succeeded_one_time_event"),
            (ContributionInterval.MONTHLY, "payment_intent_succeeded_subscription_creation_event"),
            (ContributionInterval.YEARLY, "payment_intent_succeeded_subscription_creation_event"),
        ],
    )
    def contribution(self, request):
        return ContributionFactory(
            interval=request.param[0], provider_payment_id=request.getfixturevalue(request.param[1]).data.object.id
        )

    def test_get_contribution_and_balance_transaction_for_payment_intent_succeeded_event_when_value_error(
        self, mocker, payment_intent_succeeded_one_time_event, payment_intent_for_one_time_contribution
    ):
        mocker.patch("apps.contributions.models.Payment._ensure_pi_has_single_charge", side_effect=ValueError("foo"))
        contribution = ContributionFactory(provider_payment_id=payment_intent_for_one_time_contribution.id)
        mocker.patch("stripe.PaymentIntent.retrieve", return_value=payment_intent_for_one_time_contribution)
        logger_spy = mocker.spy(logger, "warning")
        assert Payment.get_contribution_and_balance_transaction_for_payment_intent_succeeded_event(
            event=StripeEventData(**payment_intent_succeeded_one_time_event)
        ) == (
            contribution,
            None,
        )
        logger_spy.assert_called_once_with(
            "Could not find a balance transaction for PI %s associated with event %s", mocker.ANY, mocker.ANY
        )

    def test_from_stripe_charge_refunded_event_when_more_than_one_refund(self, mocker, charge_refunded_one_time_event):
        charge_refunded_one_time_event.data.object.refunds.data.append(
            stripe.Refund.construct_from({"id": "foo", "amount": 500}, stripe.api_key)
        )
        mocker.patch("stripe.PaymentIntent.retrieve")
        with pytest.raises(ValueError, match="Too many refunds"):
            Payment.from_stripe_charge_refunded_event(event=StripeEventData(**charge_refunded_one_time_event))

    def test_from_stripe_charge_refunded_event_when_no_search_conditions(self, mocker, charge_refunded_one_time_event):
        mocker.patch("stripe.PaymentIntent.retrieve", return_value=None)
        mocker.patch("stripe.BalanceTransaction.retrieve", return_value=mocker.Mock(source="foo"))
        with pytest.raises(ValueError, match=re.escape("Could not find a contribution for this event (no conditions)")):
            Payment.from_stripe_charge_refunded_event(event=StripeEventData(**charge_refunded_one_time_event))

    def test_from_stripe_charge_refunded_event_when_contribution_not_found_on_search(
        self,
        mocker,
        charge_refunded_one_time_event,
        payment_intent_for_one_time_contribution,
        balance_transaction_for_one_time_charge,
    ):
        mocker.patch("stripe.PaymentIntent.retrieve", return_value=payment_intent_for_one_time_contribution)
        mocker.patch("stripe.BalanceTransaction.retrieve", return_value=balance_transaction_for_one_time_charge)
        Contribution.objects.all().delete()
        with pytest.raises(ValueError, match=re.escape("Could not find a contribution for this event (no match)")):
            Payment.from_stripe_charge_refunded_event(event=StripeEventData(**charge_refunded_one_time_event))
