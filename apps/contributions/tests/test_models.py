import datetime
from unittest.mock import Mock
from urllib.parse import parse_qs, quote_plus, urlparse

from django.conf import settings
from django.core import mail
from django.utils.safestring import mark_safe

import pytest
import pytest_cases
import stripe
from addict import Dict as AttrDict
from bs4 import BeautifulSoup

from apps.api.views import construct_rp_domain
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionIntervalError,
    ContributionStatus,
    ContributionStatusError,
    Contributor,
    ContributorRefreshToken,
    logger,
)
from apps.contributions.tasks import task_pull_serialized_stripe_contributions_to_cache
from apps.contributions.tests.factories import ContributionFactory
from apps.emails.tasks import send_templated_email, send_thank_you_email
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory
from apps.users.choices import Roles


@pytest.mark.django_db
class TestContributorModel:
    def test_contributions_count(self, contributor_user):
        target_count = 3
        ContributionFactory.create_batch(
            size=target_count,
            contributor=contributor_user,
        )
        assert contributor_user.contributions_count == target_count

    def test_most_recent_contribution(self, contributor_user):
        ContributionFactory.create_batch(size=3, contributor=contributor_user, status=ContributionStatus.PAID)
        ContributionFactory(contributor=contributor_user, status=ContributionStatus.REFUNDED)
        assert (
            contributor_user.most_recent_contribution
            == Contribution.objects.filter(contributor=contributor_user, status="paid").latest()
        )

    def test__str__(self, contributor_user):
        assert str(contributor_user) == contributor_user.email

    def test_is_authenticated(self, contributor_user):
        assert contributor_user.is_authenticated is True

    def test_is_superuser(self, contributor_user):
        assert contributor_user.is_superuser is False

    def test_create_stripe_customer(self, monkeypatch, mocker, contributor_user):
        return_val = {"foo": "bar"}
        monkeypatch.setattr("stripe.Customer.create", lambda *args, **kwargs: return_val)
        spy = mocker.spy(stripe.Customer, "create")
        kwargs = {
            "customer_name": "My Name",
            "phone": "222222222",
            "street": "Main St",
            "city": "Eau Claire",
            "state": "WI",
            "postal_code": "54701",
            "country": "US",
            "metadata": {"meta": "data"},
        }
        rp_stripe_id = "some-id"
        cus = contributor_user.create_stripe_customer(rp_stripe_id, **kwargs)
        assert cus == return_val
        spy.assert_called_once_with(
            email=contributor_user.email,
            address=(
                address := {
                    "line1": kwargs["street"],
                    "city": kwargs["city"],
                    "state": kwargs["state"],
                    "postal_code": kwargs["postal_code"],
                    "country": kwargs["country"],
                }
            ),
            shipping={"address": address, "name": (name := kwargs["customer_name"])},
            name=name,
            phone=kwargs["phone"],
            stripe_account=rp_stripe_id,
            metadata=kwargs["metadata"],
        )

    def test_create_magic_link(self, one_time_contribution):
        assert isinstance(one_time_contribution, Contribution)
        parsed = urlparse(Contributor.create_magic_link(one_time_contribution))
        assert parsed.scheme == "https"
        expected_domain = urlparse(settings.SITE_URL).netloc
        assert parsed.netloc == f"{one_time_contribution.donation_page.revenue_program.slug}.{expected_domain}"
        params = parse_qs(parsed.query)
        assert params["token"][0]
        assert params["email"][0] == one_time_contribution.contributor.email

    @pytest.mark.parametrize(
        "value",
        (
            None,
            "",
            "Something",
            1,
            True,
            False,
            dict(),
            lambda x: None,
        ),
    )
    def test_create_magic_link_with_invalid_values(self, value):
        with pytest.raises(ValueError):
            Contributor.create_magic_link(value)


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


@pytest.fixture
def invalid_stripe_backfill_data():
    return {"arbitrary": "keys"}


@pytest.fixture
def valid_stripe_backfill_data():
    return {
        "agreed_to_pay_fees": True,
        "donor_selected_amount": "",
        "reason_for_giving": "",
        "honoree": "",
        "in_memory_of": "",
        "comp_subscription": False,
        "swag_opt_out": True,
        "swag_choice": "",
        "referer": "",
        "revenue_program_id": "",
        "revenue_program_slug": "",
        "sf_campaign_id": "",
    }


@pytest.mark.django_db
class TestContributionModel:
    @pytest_cases.parametrize(
        "contribution",
        (pytest_cases.fixture_ref("one_time_contribution"), pytest_cases.fixture_ref("monthly_contribution")),
    )
    def test_create_stripe_customer(self, contribution, mocker, monkeypatch):
        """Show Contributor.create_stripe_customer calls Stripe with right params and returns the customer object"""
        customer_create_return_val = {"id": "cus_fakefakefake"}
        monkeypatch.setattr("stripe.Customer.create", lambda *args, **kwargs: customer_create_return_val)
        spy = mocker.spy(stripe.Customer, "create")
        call_args = {
            "first_name": "Jane",
            "last_name": "doe",
            "phone": "555-555-5555",
            "mailing_street": "123 Street Lane",
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
                    "city": call_args["mailing_city"],
                    "state": call_args["mailing_state"],
                    "postal_code": call_args["mailing_postal_code"],
                    "country": call_args["mailing_country"],
                }
            ),
            shipping={"address": address, "name": name},
            phone=call_args["phone"],
            stripe_account=contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
        )
        assert customer == customer_create_return_val

    def test_formatted_amount_property(self, one_time_contribution):
        one_time_contribution.amount = 1000
        one_time_contribution.save()
        assert one_time_contribution.formatted_amount == "10.00 USD"

    @pytest_cases.parametrize(
        "contribution",
        (pytest_cases.fixture_ref("one_time_contribution"), pytest_cases.fixture_ref("monthly_contribution")),
    )
    @pytest.mark.parametrize("has_donation_page", (True, False))
    def test_revenue_program_property(self, contribution, has_donation_page):
        if not has_donation_page:
            contribution.donation_page = None
            contribution.save()
            assert contribution.revenue_program is None
        else:
            assert (rp := contribution.donation_page.revenue_program) is not None
            assert contribution.revenue_program == rp

    @pytest_cases.parametrize(
        "contribution",
        (pytest_cases.fixture_ref("one_time_contribution"), pytest_cases.fixture_ref("monthly_contribution")),
    )
    @pytest.mark.parametrize(
        "has_revenue_program,has_payment_provider,expect_result",
        ((True, False, False), (False, True, False), (True, True, True)),
    )
    def test_stripe_account_id_property(self, contribution, has_revenue_program, has_payment_provider, expect_result):
        if not has_revenue_program:
            contribution.donation_page.revenue_program = None
            contribution.donation_page.save()
        if has_revenue_program and not has_payment_provider:
            contribution.revenue_program.payment_provider = None
            contribution.revenue_program.save()
        stripe_account_id = contribution.stripe_account_id
        assert stripe_account_id == (
            contribution.revenue_program.payment_provider.stripe_account_id if expect_result else None
        )

    def test_str(self, one_time_contribution):
        assert (
            str(one_time_contribution)
            == f"{one_time_contribution.formatted_amount}, {one_time_contribution.created.strftime('%Y-%m-%d %H:%M:%S')}"
        )

    @pytest.mark.parametrize(
        "make_contribution_fn,update_data,expect_stripe_fetch,stripe_fetch_return_val",
        (
            (
                lambda: ContributionFactory(provider_payment_method_id=None),
                {"amount": 2000},
                False,
                None,
            ),
            (
                lambda: ContributionFactory(provider_payment_method_id=None),
                {"provider_payment_method_id": "something"},
                True,
                None,
            ),
            (
                lambda: ContributionFactory(provider_payment_method_id=None),
                {"provider_payment_method_id": "something"},
                True,
                {"key": "val"},
            ),
            (
                lambda: ContributionFactory(provider_payment_method_id="old-id"),
                {"provider_payment_method_id": "new-id"},
                True,
                {"key": "val"},
            ),
            (
                lambda: ContributionFactory(provider_payment_method_id="old-id"),
                {"provider_payment_method_id": "new-id"},
                True,
                None,
            ),
            (
                lambda: ContributionFactory(provider_payment_method_id="old-id"),
                {"provider_payment_method_id": "old-id"},
                False,
                None,
            ),
            (lambda: ContributionFactory(provider_payment_method_id="old-id"), {"amount": 2000}, False, None),
        ),
    )
    def test_save_method_fetch_payment_method_side_effect_when_update(
        self, make_contribution_fn, update_data, expect_stripe_fetch, stripe_fetch_return_val, monkeypatch, mocker
    ):
        """Show conditions under which `fetch_stripe_payment_method` is expected to be called and when its return value is saved back

        Note we only test updates here as the set up for a new contribution vis-a-vis the behavior under test is too distinct.
        """
        contribution = make_contribution_fn()
        monkeypatch.setattr(
            "apps.contributions.models.Contribution.fetch_stripe_payment_method",
            lambda *args, **kwargs: stripe_fetch_return_val,
        )
        stripe_fetch_spy = mocker.spy(Contribution, "fetch_stripe_payment_method")
        for k, v in update_data.items():
            setattr(contribution, k, v)
        contribution.save()
        assert stripe_fetch_spy.call_count == (1 if expect_stripe_fetch else 0)
        if expect_stripe_fetch and stripe_fetch_return_val:
            contribution.refresh_from_db()
            assert contribution.provider_payment_method_details == stripe_fetch_return_val

    @pytest.mark.parametrize(
        "create_data,expect_stripe_fetch,stripe_fetch_return_val",
        (
            (
                {"provider_payment_method_id": None},
                False,
                None,
            ),
            (
                {"provider_payment_method_id": "something"},
                True,
                None,
            ),
            (
                {"provider_payment_method_id": "something"},
                True,
                {"key": "val"},
            ),
        ),
    )
    def test_save_method_fetch_payment_method_side_effect_when_new_instance(
        self, create_data, expect_stripe_fetch, stripe_fetch_return_val, monkeypatch, mocker
    ):
        """Show conditions under which `fetch_stripe_payment_method` is expected to be called and when its return value is saved back

        Note we only test on new contribution creation here, not updating an existing one as that requires distinct setup.
        """
        monkeypatch.setattr(
            "apps.contributions.models.Contribution.fetch_stripe_payment_method",
            lambda *args, **kwargs: stripe_fetch_return_val,
        )
        stripe_fetch_spy = mocker.spy(Contribution, "fetch_stripe_payment_method")
        contribution = ContributionFactory(**create_data)
        assert stripe_fetch_spy.call_count == (1 if expect_stripe_fetch else 0)
        if expect_stripe_fetch and stripe_fetch_return_val:
            contribution.refresh_from_db()
            assert contribution.provider_payment_method_details == stripe_fetch_return_val

    def test_create_stripe_one_time_payment_intent(self, one_time_contribution, monkeypatch, mocker):
        """Show Contribution.create_stripe_one_time_payment_intent calls Stripe with right params...

        ...that it returns the created payment intent, and that it saves the payment intent ID and
        client secret back to the contribution
        """
        create_pi_return_val = {
            "id": "fake_id",
            "client_secret": "fake_client_secret",
            "customer": "fake_stripe_customer_id",
        }
        monkeypatch.setattr("stripe.PaymentIntent.create", lambda *args, **kwargs: create_pi_return_val)
        spy = mocker.spy(stripe.PaymentIntent, "create")
        payment_intent = one_time_contribution.create_stripe_one_time_payment_intent()
        spy.assert_called_once_with(
            amount=one_time_contribution.amount,
            currency=one_time_contribution.currency,
            customer=one_time_contribution.provider_customer_id,
            receipt_email=one_time_contribution.contributor.email,
            metadata=one_time_contribution.contribution_metadata,
            statement_descriptor_suffix=(
                (rp := one_time_contribution.donation_page.revenue_program).stripe_statement_descriptor_suffix
            ),
            stripe_account=rp.stripe_account_id,
            capture_method="automatic",
        )
        one_time_contribution.refresh_from_db()
        assert one_time_contribution.provider_payment_id == create_pi_return_val["id"]
        assert payment_intent == create_pi_return_val
        assert one_time_contribution.payment_provider_data == create_pi_return_val | {"client_secret": None}

    @pytest_cases.parametrize(
        "contribution",
        (pytest_cases.fixture_ref("monthly_contribution"), pytest_cases.fixture_ref("annual_contribution")),
    )
    def test_create_stripe_one_time_payment_intent_when_not_one_time(self, contribution):
        """Show Contribution.create_stripe_one_time_payment_intent calls Stripe with right params...

        ...that it returns the created payment intent, and that it saves the payment intent ID and
        client secret back to the contribution
        """
        assert contribution.interval != ContributionInterval.ONE_TIME
        # show raises error

    @pytest_cases.parametrize(
        "contribution",
        (pytest_cases.fixture_ref("monthly_contribution"), pytest_cases.fixture_ref("annual_contribution")),
    )
    def test_create_stripe_subscription(self, contribution, monkeypatch, mocker):
        """Show Contribution.create_stripe_subscription calls Stripe with right params...

        ...that it returns the created subscription, and that it saves the right subscription data
        back to the contribution
        """
        return_value = {
            "id": "fake_id",
            "latest_invoice": {"payment_intent": {"client_secret": "fake_client_secret", "id": "pi_fakefakefake"}},
            "customer": "fake_stripe_customer_id",
        }
        monkeypatch.setattr("stripe.Subscription.create", lambda *args, **kwargs: return_value)
        spy = mocker.spy(stripe.Subscription, "create")
        metadata = {"foo": "bar"}
        subscription = contribution.create_stripe_subscription(metadata)
        spy.assert_called_once_with(
            customer=contribution.provider_customer_id,
            items=[
                {
                    "price_data": {
                        "unit_amount": contribution.amount,
                        "currency": contribution.currency,
                        "product": contribution.donation_page.revenue_program.payment_provider.stripe_product_id,
                        "recurring": {"interval": contribution.interval},
                    }
                }
            ],
            stripe_account=contribution.donation_page.revenue_program.stripe_account_id,
            metadata=metadata,
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
            off_session=False,
            default_payment_method=None,
        )
        contribution.refresh_from_db()
        assert contribution.payment_provider_data == return_value
        assert contribution.provider_subscription_id == return_value["id"]
        assert contribution.provider_payment_id == return_value["latest_invoice"]["payment_intent"]["id"]
        assert subscription == return_value

    @pytest_cases.parametrize(
        "contribution",
        (pytest_cases.fixture_ref("monthly_contribution"), pytest_cases.fixture_ref("annual_contribution")),
    )
    def test_create_stripe_setup_intent(self, contribution, monkeypatch, mocker):
        """Show Contribution.create_stripe_setup_intent calls Stripe with right params...

        ...that it returns the created setup intent, and that it saves the right data
        back to the contribution
        """
        return_value = {
            "id": "fake_id",
            "client_secret": "fake_client_secret",
        }
        monkeypatch.setattr("stripe.SetupIntent.create", lambda *args, **kwargs: return_value)
        spy = mocker.spy(stripe.SetupIntent, "create")
        metadata = {"meta": "data"}
        setup_intent = contribution.create_stripe_setup_intent(metadata)
        spy.assert_called_once_with(
            customer=contribution.provider_customer_id,
            stripe_account=contribution.donation_page.revenue_program.stripe_account_id,
            metadata=metadata,
        )
        contribution.refresh_from_db()
        assert contribution.provider_setup_intent_id == return_value["id"]
        assert setup_intent == return_value

    @pytest_cases.parametrize(
        "contribution",
        (
            pytest_cases.fixture_ref("one_time_contribution"),
            pytest_cases.fixture_ref("monthly_contribution"),
            pytest_cases.fixture_ref("annual_contribution"),
        ),
    )
    @pytest.mark.parametrize("send_receipt_email_via_nre", (True, False))
    def test_handle_thank_you_email(self, contribution, send_receipt_email_via_nre, monkeypatch, mocker):
        """Show that when org configured to have NRE send thank you emails, send_templated_email
        gets called with expected args.
        """
        (
            org := contribution.donation_page.revenue_program.organization
        ).send_receipt_email_via_nre = send_receipt_email_via_nre
        org.save()
        monkeypatch.setattr("apps.emails.tasks.send_thank_you_email.delay", lambda *args, **kwargs: None)
        spy = mocker.spy(send_thank_you_email, "delay")
        contribution.handle_thank_you_email()
        assert spy.call_count == (1 if send_receipt_email_via_nre else 0)

    @pytest_cases.parametrize(
        "contribution",
        (
            pytest_cases.fixture_ref("one_time_contribution"),
            pytest_cases.fixture_ref("monthly_contribution"),
            pytest_cases.fixture_ref("annual_contribution"),
        ),
    )
    def test_stripe_metadata(self, contribution):
        referer = "https://somewhere.com"
        validated_data = {
            "agreed_to_pay_fees": True,
            "donor_selected_amount": "120",
            "reason_for_giving": "reason",
            "honoree": None,
            "in_memory_of": None,
            "comp_subscription": False,
            "swag_opt_out": True,
            "swag_choice": None,
            "page": contribution.donation_page,
            "sf_campaign_id": "some-id",
        }
        assert Contribution.stripe_metadata(contribution.contributor, validated_data, referer) == {
            "source": settings.METADATA_SOURCE,
            "schema_version": settings.METADATA_SCHEMA_VERSION,
            "contributor_id": contribution.contributor.id,
            "agreed_to_pay_fees": validated_data["agreed_to_pay_fees"],
            "donor_selected_amount": validated_data["donor_selected_amount"],
            "reason_for_giving": validated_data["reason_for_giving"],
            "honoree": validated_data["honoree"],
            "in_memory_of": validated_data["in_memory_of"],
            "comp_subscription": validated_data["comp_subscription"],
            "swag_opt_out": validated_data["swag_opt_out"],
            "swag_choice": validated_data["swag_choice"],
            "referer": referer,
            "revenue_program_id": validated_data["page"].revenue_program.id,
            "revenue_program_slug": validated_data["page"].revenue_program.slug,
            "sf_campaign_id": validated_data["sf_campaign_id"],
        }

    @pytest.mark.parametrize(
        "status",
        (
            ContributionStatus.PROCESSING,
            ContributionStatus.FLAGGED,
        ),
    )
    def test_cancel_when_one_time(self, status, monkeypatch):
        contribution = ContributionFactory(one_time=True, status=status)
        mock_cancel = Mock()
        monkeypatch.setattr("stripe.PaymentIntent.cancel", mock_cancel)
        contribution.cancel()
        contribution.refresh_from_db()
        assert contribution.status == ContributionStatus.CANCELED
        mock_cancel.assert_called_once_with(
            contribution.provider_payment_id,
            stripe_account=contribution.donation_page.revenue_program.stripe_account_id,
        )

    @pytest.mark.parametrize(
        "status,contribution_type,has_payment_method_id",
        (
            (ContributionStatus.PROCESSING, "monthly_subscription", True),
            (ContributionStatus.PROCESSING, "annual_subscription", True),
            (ContributionStatus.FLAGGED, "monthly_subscription", True),
            (ContributionStatus.FLAGGED, "annual_subscription", True),
            (ContributionStatus.PROCESSING, "monthly_subscription", False),
            (ContributionStatus.PROCESSING, "annual_subscription", False),
            (ContributionStatus.FLAGGED, "monthly_subscription", False),
            (ContributionStatus.FLAGGED, "annual_subscription", False),
        ),
    )
    def test_cancel_when_recurring(self, status, contribution_type, has_payment_method_id, monkeypatch):
        contribution = ContributionFactory(
            **{
                contribution_type: True,
                "status": status,
                "provider_payment_method_id": "some-id" if has_payment_method_id else None,
            }
        )
        mock_delete_sub = Mock()
        monkeypatch.setattr("stripe.Subscription.delete", mock_delete_sub)
        mock_pm_detach = Mock()

        class MockPaymentMethod:
            def __init__(self, *args, **kwargs):
                self.detach = mock_pm_detach

        mock_retrieve_pm = Mock(return_value=MockPaymentMethod())
        monkeypatch.setattr("stripe.PaymentMethod.retrieve", mock_retrieve_pm)

        contribution.cancel()
        contribution.refresh_from_db()
        assert contribution.status == ContributionStatus.CANCELED

        if status == ContributionStatus.PROCESSING:
            mock_delete_sub.assert_called_once_with(
                contribution.provider_subscription_id,
                stripe_account=contribution.donation_page.revenue_program.stripe_account_id,
            )
        elif has_payment_method_id:
            mock_retrieve_pm.assert_called_once_with(
                contribution.provider_payment_method_id,
                stripe_account=contribution.donation_page.revenue_program.stripe_account_id,
            )
            mock_pm_detach.assert_called_once()
        else:
            mock_pm_detach.assert_not_called()

    def test_cancel_when_unpermitted_interval(self, monkeypatch):
        contribution = ContributionFactory(
            annual_subscription=True, status=ContributionStatus.PROCESSING, interval="foobar"
        )
        last_modified = contribution.modified
        mock_stripe_method = Mock()
        monkeypatch.setattr("stripe.PaymentIntent.cancel", mock_stripe_method)
        monkeypatch.setattr("stripe.Subscription.delete", mock_stripe_method)
        monkeypatch.setattr("stripe.PaymentMethod.retrieve", mock_stripe_method)
        monkeypatch.setattr("stripe.PaymentMethod.detach", mock_stripe_method)
        with pytest.raises(ContributionIntervalError):
            contribution.cancel()
        assert contribution.modified == last_modified
        mock_stripe_method.assert_not_called()

    @pytest.mark.parametrize(
        "status",
        (
            ContributionStatus.CANCELED,
            ContributionStatus.FAILED,
            ContributionStatus.PAID,
            ContributionStatus.REFUNDED,
            ContributionStatus.REJECTED,
            "unexpected",
        ),
    )
    def test_cancel_when_unpermitted_status(self, status, monkeypatch):
        contribution = ContributionFactory(annual_subscription=True, status=status)
        last_modified = contribution.modified
        mock_stripe_method = Mock()
        monkeypatch.setattr("stripe.PaymentIntent.cancel", mock_stripe_method)
        monkeypatch.setattr("stripe.Subscription.delete", mock_stripe_method)
        monkeypatch.setattr("stripe.PaymentMethod.retrieve", mock_stripe_method)
        monkeypatch.setattr("stripe.PaymentMethod.detach", mock_stripe_method)

        with pytest.raises(ContributionStatusError):
            contribution.cancel()
        assert contribution.modified == last_modified
        mock_stripe_method.assert_not_called()

    @pytest_cases.parametrize(
        "contribution",
        (
            pytest_cases.fixture_ref("one_time_contribution"),
            pytest_cases.fixture_ref("monthly_contribution"),
            pytest_cases.fixture_ref("annual_contribution"),
        ),
    )
    @pytest.mark.parametrize(
        "setup_intent_id,stripe_account_id,expect_retrieve",
        (
            (None, None, False),
            (None, "something", False),
            ("something", None, False),
            ("something", "else", True),
        ),
    )
    def test_stripe_setup_intent_property(
        self, contribution, setup_intent_id, stripe_account_id, expect_retrieve, monkeypatch, mocker
    ):
        contribution.provider_setup_intent_id = setup_intent_id
        contribution.save()
        (provider := contribution.donation_page.revenue_program.payment_provider).stripe_account_id = stripe_account_id
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

    @pytest_cases.parametrize(
        "contribution",
        (
            pytest_cases.fixture_ref("one_time_contribution"),
            pytest_cases.fixture_ref("monthly_contribution"),
            pytest_cases.fixture_ref("annual_contribution"),
        ),
    )
    @pytest.mark.parametrize(
        "payment_intent_id,stripe_account_id,expect_retrieve",
        (
            (None, None, False),
            (None, "something", False),
            ("something", None, False),
            ("something", "else", True),
        ),
    )
    def test_stripe_payment_intent_property(
        self, contribution, payment_intent_id, stripe_account_id, expect_retrieve, monkeypatch, mocker
    ):
        contribution.provider_payment_id = payment_intent_id
        contribution.save()
        (provider := contribution.donation_page.revenue_program.payment_provider).stripe_account_id = stripe_account_id
        provider.save()
        return_val = {"foo": "bar"}
        monkeypatch.setattr("stripe.PaymentIntent.retrieve", lambda *args, **kwargs: return_val)
        spy = mocker.spy(stripe.PaymentIntent, "retrieve")
        pi = contribution.stripe_payment_intent
        if expect_retrieve:
            spy.assert_called_once_with(payment_intent_id, stripe_account=stripe_account_id)
        else:
            spy.assert_not_called()
        assert pi == (return_val if expect_retrieve else None)

    @pytest_cases.parametrize(
        "contribution",
        (
            pytest_cases.fixture_ref("one_time_contribution"),
            pytest_cases.fixture_ref("monthly_contribution"),
            pytest_cases.fixture_ref("annual_contribution"),
        ),
    )
    @pytest.mark.parametrize(
        "subscription_id,stripe_account_id,expect_retrieve",
        (
            (None, None, False),
            (None, "something", False),
            ("something", None, False),
            ("something", "else", True),
        ),
    )
    def test_stripe_subscription_property(
        self, contribution, subscription_id, stripe_account_id, expect_retrieve, monkeypatch, mocker
    ):
        contribution.provider_subscription_id = subscription_id
        contribution.save()
        (provider := contribution.donation_page.revenue_program.payment_provider).stripe_account_id = stripe_account_id
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

    @pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
    def test_billing_details(self, trait):
        details = {"foo": "bar", "billing_details": "details"}
        contribution = ContributionFactory(**{trait: True, "provider_payment_method_details": details})
        assert (
            contribution.billing_details
            and contribution.billing_details == contribution.provider_payment_method_details["billing_details"]
        )

    @pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
    @pytest.mark.parametrize("name_val", ("something", None, False, ""))
    def test_billing_name(self, trait, name_val):
        data = {"billing_details": {"name": name_val}}
        contribution = ContributionFactory(**{trait: True, "provider_payment_method_details": data})
        assert contribution.billing_name == (name_val or "")

    @pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
    @pytest.mark.parametrize("email_val", ("something", None, False, ""))
    def test_billing_email(self, trait, email_val):
        data = {"billing_details": {"email": email_val}}
        contribution = ContributionFactory(**{trait: True, "provider_payment_method_details": data})
        assert contribution.billing_email == (email_val or "")

    @pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
    @pytest.mark.parametrize("phone_val", ("something", None, False, ""))
    def test_billing_phone(self, trait, phone_val):
        data = {"billing_details": {"phone": phone_val}}
        contribution = ContributionFactory(**{trait: True, "provider_payment_method_details": data})
        assert contribution.billing_phone == (phone_val or "")

    @pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
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

    @pytest.mark.parametrize(
        "trait",
        (
            "one_time",
            "annual_subscription",
            "monthly_subscription",
        ),
    )
    def test_formatted_donor_selected_amount(self, trait):
        kwargs = {trait: True}
        contribution = ContributionFactory(**kwargs)
        assert (
            contribution.formatted_donor_selected_amount
            and contribution.formatted_donor_selected_amount
            == f"{'{:.2f}'.format(contribution.amount / 100)} {contribution.currency.upper()}"
        )

    @pytest.mark.parametrize(
        "interval,expect_success",
        (
            (ContributionInterval.ONE_TIME, False),
            (ContributionInterval.MONTHLY, True),
            (ContributionInterval.YEARLY, True),
        ),
    )
    def test_send_recurring_contribution_email_reminder(self, interval, expect_success, monkeypatch, settings):
        contribution = ContributionFactory(interval=interval)
        next_charge_date = datetime.datetime.now()
        mock_log_warning = Mock()
        mock_send_templated_email = Mock(wraps=send_templated_email.delay)
        token = "token"

        class MockForContributorReturn:
            def __init__(self, *args, **kwargs):
                self.short_lived_access_token = token

        monkeypatch.setattr(logger, "warning", mock_log_warning)
        monkeypatch.setattr(send_templated_email, "delay", mock_send_templated_email)
        monkeypatch.setattr(
            ContributorRefreshToken, "for_contributor", lambda *args, **kwargs: MockForContributorReturn()
        )
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        settings.CELERY_ALWAYS_EAGER = True
        contribution.send_recurring_contribution_email_reminder(next_charge_date)
        if expect_success:
            magic_link = mark_safe(
                f"https://{construct_rp_domain(contribution.donation_page.revenue_program.slug)}/{settings.CONTRIBUTOR_VERIFY_URL}"
                f"?token={token}&email={quote_plus(contribution.contributor.email)}"
            )
            mock_log_warning.assert_not_called()
            mock_send_templated_email.assert_called_once_with(
                contribution.contributor.email,
                f"Reminder: {contribution.donation_page.revenue_program.name} scheduled contribution",
                "recurring-contribution-email-reminder.txt",
                "recurring-contribution-email-reminder.html",
                {
                    "rp_name": contribution.donation_page.revenue_program.name,
                    "contribution_date": next_charge_date.strftime("%m/%d/%Y"),
                    "contribution_amount": contribution.formatted_amount,
                    "contribution_interval_display_value": contribution.interval,
                    "non_profit": contribution.donation_page.revenue_program.non_profit,
                    "contributor_email": contribution.contributor.email,
                    "tax_id": contribution.donation_page.revenue_program.tax_id,
                    "magic_link": magic_link,
                },
            )
            assert len(mail.outbox) == 1
        else:
            mock_log_warning.assert_called_once_with(
                "`Contribution.send_recurring_contribution_email_reminder` was called on an instance (ID: %s) whose interval is one-time",
                contribution.id,
            )

    @pytest.mark.parametrize(
        "is_non_profit,tax_id",
        (
            (True, None),
            (True, "123456789"),
            (False, None),
        ),
    )
    def test_send_recurring_contribution_email_reminder_email_text(self, is_non_profit, tax_id, monkeypatch, settings):
        contribution = ContributionFactory(interval=ContributionInterval.YEARLY)
        contribution.donation_page.revenue_program.non_profit = is_non_profit
        contribution.donation_page.revenue_program.tax_id = tax_id
        contribution.donation_page.revenue_program.save()
        next_charge_date = datetime.datetime.now()
        mock_send_templated_email = Mock(wraps=send_templated_email.delay)
        token = "token"

        class MockForContributorReturn:
            def __init__(self, *args, **kwargs):
                self.short_lived_access_token = token

        monkeypatch.setattr(send_templated_email, "delay", mock_send_templated_email)
        monkeypatch.setattr(
            ContributorRefreshToken, "for_contributor", lambda *args, **kwargs: MockForContributorReturn()
        )
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        settings.CELERY_ALWAYS_EAGER = True
        contribution.send_recurring_contribution_email_reminder(next_charge_date)
        magic_link = mark_safe(
            f"https://{construct_rp_domain(contribution.donation_page.revenue_program.slug)}/{settings.CONTRIBUTOR_VERIFY_URL}"
            f"?token={token}&email={quote_plus(contribution.contributor.email)}"
        )
        assert len(mail.outbox) == 1
        email_expectations = [
            f"Scheduled: {next_charge_date.strftime('%m/%d/%Y')}",
            f"Email: {contribution.contributor.email}",
            f"Amount Contributed: ${contribution.formatted_amount}/{contribution.interval}",
        ]
        if is_non_profit:
            email_expectations.extend(
                [
                    "This receipt may be used for tax purposes.",
                    f"{contribution.donation_page.revenue_program.name} is a 501(c)(3) nonprofit organization",
                ]
            )
            if tax_id:
                email_expectations.append(f"with a Federal Tax ID #{tax_id}")
        else:
            email_expectations.append(
                f"Contributions to {contribution.donation_page.revenue_program.name} are not deductible as charitable donations."
            )
        for x in email_expectations:
            assert x in mail.outbox[0].body
            soup = BeautifulSoup(mail.outbox[0].alternatives[0][0], "html.parser")
            as_string = " ".join([x.replace("\xa0", " ").strip() for x in soup.get_text().splitlines() if x])
            assert x in as_string
        assert "Manage contributions here" in soup.find("a", href=magic_link).text
        assert magic_link in mail.outbox[0].body

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("user_with_unexpected_role"),
        ),
    )
    @pytest_cases.parametrize(
        "_contribution",
        (
            pytest_cases.fixture_ref("one_time_contribution"),
            pytest_cases.fixture_ref("monthly_contribution"),
            pytest_cases.fixture_ref("annual_contribution"),
        ),
    )
    def test_filtered_by_role_assignment(self, user, _contribution):
        # Unclear if this stems from pytest_cases or pytest more generally, but on each run through of this test
        # all three test fixtures for contribution are in db. So in order to zero out and only have the parametrized
        # contribution being passed in as _contribution within a test run, at beginning we delete the other contributions
        # that were created.
        Contribution.objects.exclude(id=_contribution.id).delete()
        assert Contribution.objects.count() == 1
        org1 = (rp1 := _contribution.donation_page.revenue_program).organization
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
        assert _contribution.donation_page.revenue_program != contribution2.donation_page.revenue_program
        assert (
            _contribution.donation_page.revenue_program.organization
            == contribution2.donation_page.revenue_program.organization
        )
        assert (
            contribution3.donation_page.revenue_program.organization
            != _contribution.donation_page.revenue_program.organization
        )

        match user.roleassignment.role_type:
            case Roles.HUB_ADMIN:
                expected = Contribution.objects.having_org_viewable_status()
                assert expected.count() == 3
            case Roles.ORG_ADMIN:
                user.roleassignment.organization = (org := _contribution.donation_page.revenue_program.organization)
                user.roleassignment.revenue_programs.set(org.revenueprogram_set.all())
                user.roleassignment.save()
                expected = Contribution.objects.filter(donation_page__revenue_program__organization=org1).exclude(
                    status__in=(ContributionStatus.REJECTED, ContributionStatus.FLAGGED)
                )
                assert expected.count() == 2
            case Roles.RP_ADMIN:
                user.roleassignment.organization = (org := _contribution.donation_page.revenue_program.organization)
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
        "contribution_fn,stripe_return_val,expect_paid",
        (
            (
                lambda: ContributionFactory(
                    provider_payment_id="something", one_time=True, status=ContributionStatus.PROCESSING
                ),
                {"status": "succeeded"},
                True,
            ),
            (
                lambda: ContributionFactory(
                    provider_payment_id="something", one_time=True, status=ContributionStatus.PROCESSING
                ),
                {"status": "other"},
                False,
            ),
            (
                lambda: ContributionFactory(
                    provider_payment_id=None, one_time=True, status=ContributionStatus.PROCESSING
                ),
                {"status": "succeeded"},
                False,
            ),
            (
                lambda: ContributionFactory(
                    provider_subscription_id="something",
                    monthly_subscription=True,
                    status=ContributionStatus.PROCESSING,
                ),
                {"status": "active"},
                True,
            ),
            (
                lambda: ContributionFactory(
                    provider_subscription_id="something",
                    monthly_subscription=True,
                    status=ContributionStatus.PROCESSING,
                ),
                {"status": "other"},
                False,
            ),
            (
                lambda: ContributionFactory(
                    provider_subscription_id=None, monthly_subscription=True, status=ContributionStatus.PROCESSING
                ),
                {"status": "active"},
                False,
            ),
        ),
    )
    @pytest.mark.parametrize("dry_run", (True, False))
    def test_fix_contributions_stuck_in_processing(
        self, contribution_fn, stripe_return_val, expect_paid, dry_run, mocker
    ):
        contribution = contribution_fn()
        earlier_status = contribution.status
        if contribution.interval == ContributionInterval.ONE_TIME:
            mocker.patch(
                "apps.contributions.models.Contribution.stripe_payment_intent",
                new_callable=mocker.PropertyMock,
                return_value=AttrDict(stripe_return_val),
            )
        else:
            mocker.patch(
                "apps.contributions.models.Contribution.stripe_subscription",
                new_callable=mocker.PropertyMock,
                return_value=AttrDict(stripe_return_val),
            )
        Contribution.fix_contributions_stuck_in_processing(dry_run=dry_run)
        contribution.refresh_from_db()
        assert contribution.status == ContributionStatus.PAID if (expect_paid and not dry_run) else earlier_status

    @pytest.mark.parametrize(
        "make_contribution_fn,stripe_return_val,expect_update",
        (
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
        ),
    )
    @pytest.mark.parametrize(
        "contribution_status",
        (ContributionStatus.PAID, ContributionStatus.FLAGGED, ContributionStatus.REJECTED, ContributionStatus.CANCELED),
    )
    @pytest.mark.parametrize("dry_run", (True, False))
    def test_fix_missing_payment_method_details(
        self, make_contribution_fn, stripe_return_val, expect_update, contribution_status, dry_run, monkeypatch
    ):
        contribution = make_contribution_fn()
        contribution.status = contribution_status
        contribution.save()
        old_data = contribution.provider_payment_method_details
        monkeypatch.setattr(
            "apps.contributions.models.Contribution.fetch_stripe_payment_method",
            lambda *args, **kwargs: stripe_return_val,
        )
        Contribution.fix_missing_payment_method_details_data(dry_run=dry_run)
        contribution.refresh_from_db()
        assert contribution.provider_payment_method_details == (
            stripe_return_val if (expect_update and not dry_run) else old_data
        )

    @pytest_cases.parametrize(
        "make_contribution_fn,metadata,expect_update",
        (
            (
                lambda: ContributionFactory(one_time=True, contribution_metadata=None),
                pytest_cases.fixture_ref("invalid_stripe_backfill_data"),
                False,
            ),
            (
                lambda: ContributionFactory(monthly_subscription=True, contribution_metadata=None),
                pytest_cases.fixture_ref("invalid_stripe_backfill_data"),
                False,
            ),
            (
                lambda: ContributionFactory(one_time=True, contribution_metadata=None),
                pytest_cases.fixture_ref("valid_stripe_backfill_data"),
                True,
            ),
            (
                lambda: ContributionFactory(monthly_subscription=True, contribution_metadata=None),
                pytest_cases.fixture_ref("valid_stripe_backfill_data"),
                True,
            ),
        ),
    )
    @pytest.mark.parametrize("dry_run", (True, False))
    def test_fix_missing_contribution_metadata(
        self, make_contribution_fn, metadata, expect_update, dry_run, monkeypatch
    ):
        contribution = make_contribution_fn()
        old_metadata = contribution.contribution_metadata
        target = (
            "stripe_payment_intent"
            if contribution.interval == ContributionInterval.ONE_TIME
            else "stripe_setup_intent"
            if contribution.stripe_setup_intent
            else "stripe_subscription"
        )
        monkeypatch.setattr(f"apps.contributions.models.Contribution.{target}", lambda: metadata)
        Contribution.fix_contributions_stuck_in_processing(dry_run)
        contribution.refresh_from_db()
        # if Contribution._stripe_metadata_is_valid_for_contribution_metadata_backfill(metadata) and not dry_run:
        #     breakpoint()
        assert contribution.contribution_metadata == (
            metadata
            if Contribution._stripe_metadata_is_valid_for_contribution_metadata_backfill(metadata)
            and not dry_run
            and expect_update
            else old_metadata
        )


@pytest.mark.django_db
class TestContributionQuerySetMethods:
    """Basic unit tests for custom queryset methods that are on Contribution model"""

    def test_one_time(self, one_time_contribution, monthly_contribution, annual_contribution):
        """Show one-time contributions are returned by this method"""
        one_times = Contribution.objects.filter(interval=ContributionInterval.ONE_TIME)
        recurring = Contribution.objects.exclude(id__in=one_times.values_list("id", flat=True))
        assert one_times.count()
        assert recurring.count()
        assert (returned_one_times := Contribution.objects.one_time()).count() == one_times.count()
        assert set(returned_one_times.values_list("id", flat=True)) == set(one_times.values_list("id", flat=True))

    def test_recurring(self, one_time_contribution, monthly_contribution, annual_contribution):
        """Show recurring contributions are returned by this method"""
        one_times = Contribution.objects.filter(interval=ContributionInterval.ONE_TIME)
        recurring = Contribution.objects.exclude(id__in=one_times.values_list("id", flat=True))
        assert one_times.count()
        assert recurring.count()
        assert (returned_recurring := Contribution.objects.recurring()).count() == recurring.count()
        assert set(returned_recurring.values_list("id", flat=True)) == set(recurring.values_list("id", flat=True))

    def test_filter_queryset_for_contributor_when_cache_empty(
        self, contributor_user, revenue_program, mocker, monkeypatch
    ):
        """Show behavior of this method when no results in cache"""
        monkeypatch.setattr(
            "apps.contributions.stripe_contributions_provider.ContributionsCacheProvider.load",
            lambda *args, **kwargs: [],
        )
        monkeypatch.setattr(
            "apps.contributions.tasks.task_pull_serialized_stripe_contributions_to_cache.delay",
            lambda *args, **kwargs: None,
        )
        spy = mocker.spy(task_pull_serialized_stripe_contributions_to_cache, "delay")
        results = Contribution.objects.filter_queryset_for_contributor(contributor_user, revenue_program)
        assert results == []
        spy.assert_called_once_with(contributor_user.email, revenue_program.stripe_account_id)

    def test_filter_queryset_for_contributor_when_cache_not_empty(
        self, contributor_user, revenue_program, mocker, monkeypatch
    ):
        "Show behavior of this method when results in cache" ""
        results = [
            {"id": 1, "revenue_program": revenue_program.slug, "payment_type": "something"},
            {"id": 2, "revenue_program": revenue_program.slug, "payment_type": None},
            {"id": 3, "revenue_program": "something-different", "payment_type": "something"},
        ]
        monkeypatch.setattr(
            "apps.contributions.stripe_contributions_provider.ContributionsCacheProvider.load",
            lambda *args, **kwargs: results,
        )
        spy = mocker.spy(task_pull_serialized_stripe_contributions_to_cache, "delay")
        results = Contribution.objects.filter_queryset_for_contributor(contributor_user, revenue_program)
        assert set([1]) == set(item["id"] for item in results)
        spy.assert_not_called

    def test_having_org_viewable_status(
        self,
        flagged_contribution,
        rejected_contribution,
        canceled_contribution,
        refunded_contribution,
        successful_contribution,
        processing_contribution,
    ):
        """ """
        assert set(Contribution.objects.having_org_viewable_status().values_list("id", flat=True)) == set(
            (canceled_contribution.id, refunded_contribution.id, successful_contribution.id, processing_contribution.id)
        )
