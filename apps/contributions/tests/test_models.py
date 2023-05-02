import datetime
from dataclasses import asdict
from unittest.mock import Mock, patch
from urllib.parse import parse_qs, quote_plus, urlparse

from django.conf import settings
from django.core import mail
from django.template.loader import render_to_string
from django.test import TestCase, override_settings
from django.utils import timezone
from django.utils.safestring import mark_safe

import pytest
import pytest_cases
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
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.emails.tasks import make_send_thank_you_email_data, send_templated_email
from apps.organizations.models import FiscalStatusChoices
from apps.organizations.tests.factories import (
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
from apps.pages.tests.factories import DonationPageFactory
from apps.users.choices import Roles


class ContributorTest(TestCase):
    def setUp(self):
        self.contributor = Contributor.objects.create(email="test@test.com")

    def test_contributions_count(self):
        target_count = 5
        for _ in range(target_count):
            Contribution.objects.create(amount=1000, contributor=self.contributor)
        self.assertEqual(self.contributor.contributions_count, target_count)

    def test_most_recent_contribution(self):
        Contribution.objects.create(amount=1000, contributor=self.contributor, status="paid")
        one_minute = datetime.timedelta(minutes=1)
        second_contribution = Contribution.objects.create(
            amount=1000,
            contributor=self.contributor,
            status="paid",
            modified=timezone.now() + one_minute,
        )
        self.assertEqual(self.contributor.most_recent_contribution, second_contribution)

    def test__str(self):
        self.assertEqual(str(self.contributor), self.contributor.email)

    def test_is_superuser(self):
        self.assertFalse(self.contributor.is_superuser)


@pytest.fixture
def contribution():
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        return ContributionFactory(one_time=True)


@pytest.mark.django_db()
def test_create_magic_link(contribution):
    assert isinstance(contribution, Contribution)
    parsed = urlparse(Contributor.create_magic_link(contribution))
    assert parsed.scheme == "https"
    expected_domain = urlparse(settings.SITE_URL).netloc
    assert parsed.netloc == f"{contribution.donation_page.revenue_program.slug}.{expected_domain}"
    params = parse_qs(parsed.query)
    assert params["token"][0]
    assert params["email"][0] == contribution.contributor.email


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
def test_create_magic_link_with_invalid_values(value):
    with pytest.raises(ValueError):
        Contributor.create_magic_link(value)


test_key = "test_key"


# This is to squash a side effect in contribution.save
# TODO: DEV-3026
@patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None)
@override_settings(STRIPE_TEST_SECRET_KEY=test_key)
class ContributionTest(TestCase):
    def setUp(self):
        self.amount = 1000
        self.stripe_account_id = "testing-123-stripe"
        self.org = OrganizationFactory()
        self.payment_provider = PaymentProviderFactory(stripe_account_id=self.stripe_account_id)
        self.revenue_program = RevenueProgramFactory(organization=self.org, payment_provider=self.payment_provider)
        self.donation_page = DonationPageFactory(revenue_program=self.revenue_program)
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            self.contribution = ContributionFactory(one_time=True, amount=self.amount, donation_page=self.donation_page)

        self.required_data = {"amount": 1000, "currency": "usd", "donation_page": self.donation_page}

    @patch("stripe.Customer.create", return_value={"id": "cus_fakefakefake"})
    def test_create_stripe_customer(self, mock_create_customer, *args):
        """Show Contributor.create_stripe_customer calls Stripe with right params and returns the customer object"""
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
        self.contribution.contributor = ContributorFactory()
        self.contribution.save()
        customer = self.contribution.create_stripe_customer(**call_args)
        name = f"{call_args['first_name']} {call_args['last_name']}"

        address = {
            "line1": call_args["mailing_street"],
            "line2": call_args["mailing_complement"],
            "city": call_args["mailing_city"],
            "state": call_args["mailing_state"],
            "postal_code": call_args["mailing_postal_code"],
            "country": call_args["mailing_country"],
        }
        mock_create_customer.assert_called_once_with(
            name=name,
            email=self.contribution.contributor.email,
            address=address,
            shipping={"address": address, "name": name},
            phone=call_args["phone"],
            stripe_account=self.contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
        )
        self.assertEqual(customer, mock_create_customer.return_value)

    @patch("stripe.Customer.create", return_value={"id": "cus_fakefakefake"})
    def test_create_stripe_customer_empty_complement(self, mock_create_customer, *args):
        """Show Contributor.create_stripe_customer calls Stripe with right params and returns the customer object"""
        call_args = {
            "first_name": "Jane",
            "last_name": "doe",
            "phone": "555-555-5555",
            "mailing_street": "123 Street Lane",
            "mailing_complement": None,
            "mailing_city": "Small Town",
            "mailing_state": "OK",
            "mailing_postal_code": "12345",
            "mailing_country": "US",
        }
        self.contribution.contributor = ContributorFactory()
        self.contribution.save()
        customer = self.contribution.create_stripe_customer(**call_args)
        name = f"{call_args['first_name']} {call_args['last_name']}"

        address = {
            "line1": call_args["mailing_street"],
            "line2": "",
            "city": call_args["mailing_city"],
            "state": call_args["mailing_state"],
            "postal_code": call_args["mailing_postal_code"],
            "country": call_args["mailing_country"],
        }
        mock_create_customer.assert_called_once_with(
            name=name,
            email=self.contribution.contributor.email,
            address=address,
            shipping={"address": address, "name": name},
            phone=call_args["phone"],
            stripe_account=self.contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
        )
        self.assertEqual(customer, mock_create_customer.return_value)

    def test_formatted_amount(self, mock_fetch_stripe_payment_method, *args):
        target_format = "$10.00 USD"
        self.assertEqual(self.contribution.formatted_amount, target_format)

    def test_str(self, *args):
        self.assertEqual(
            str(self.contribution),
            f"{self.contribution.formatted_amount}, {self.contribution.created.strftime('%Y-%m-%d %H:%M:%S')}",
        )

    def test_expanded_bad_actor_score(self, mock_fetch_stripe_payment_method, *args):
        # First, expanded_bad_actor_score should be none by default
        score = 2
        self.contribution.bad_actor_score = score
        self.contribution.save()
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.expanded_bad_actor_score, Contribution.BAD_ACTOR_SCORES[2][1])

    def test_request_stripe_payment_method_details_when_new(self, mock_fetch_stripe_payment_method, *args):
        """
        fetch_stripe_payment_method should be called when a new contribution is being created and it has a defined provider_payment_method_id
        """
        mock_fetch_stripe_payment_method.return_value = "some-fake-id"
        target_pm_id = "new-pm-id"
        contribution = Contribution(**self.required_data)
        contribution.provider_payment_method_id = target_pm_id
        contribution.save()
        mock_fetch_stripe_payment_method.assert_called_once()

    def test_request_stripe_payment_method_details_when_old_updating_payment_method(
        self, mock_fetch_stripe_payment_method, *args
    ):
        """
        fetch_stripe_payment_method should be called when updating an existing contribution, if provider_payment_method_id is not the same as the previous
        """
        target_pm_id = "new-pm-id"
        self.contribution.provider_payment_method_id = target_pm_id
        self.contribution.save()
        mock_fetch_stripe_payment_method.assert_called_once()

    @patch("stripe.PaymentMethod.retrieve", side_effect="{}")
    def test_do_not_request_stripe_payment_method_details_when_updating_anything_else(self, mock_retrieve_pm, *args):
        """
        fetch_stripe_payment_method should not be called if provider_payment_method_id is unchanged
        """
        self.contribution.status = ContributionStatus.PAID
        self.contribution.save()
        mock_retrieve_pm.assert_not_called()

    @patch("stripe.PaymentIntent.create")
    def test_create_stripe_one_time_payment_intent(self, mock_create_pi, *args):
        """Show Contribution.create_stripe_one_time_payment_intent calls Stripe with right params...

        ...that it returns the created payment intent, and that it saves the payment intent ID and
        client secret back to the contribution
        """
        stripe_customer_id = "fake_stripe_customer_id"
        return_value = {"id": "fake_id", "client_secret": "fake_client_secret", "customer": stripe_customer_id}
        mock_create_pi.return_value = return_value
        metadata = {"meta": "data"}
        contributor = ContributorFactory()
        self.contribution.contributor = contributor
        self.contribution.provider_customer_id = stripe_customer_id
        self.contribution.contribution_metadata = metadata
        self.contribution.status = ContributionStatus.PROCESSING
        self.contribution.save()

        payment_intent = self.contribution.create_stripe_one_time_payment_intent()
        mock_create_pi.assert_called_once_with(
            amount=self.contribution.amount,
            currency=self.contribution.currency,
            customer=stripe_customer_id,
            receipt_email=contributor.email,
            metadata=self.contribution.contribution_metadata,
            statement_descriptor_suffix=self.revenue_program.stripe_statement_descriptor_suffix,
            stripe_account=self.revenue_program.stripe_account_id,
            capture_method="automatic",
        )
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.provider_payment_id, return_value["id"])
        self.assertEqual(payment_intent, return_value)

    @patch("stripe.PaymentIntent.create")
    def test_create_stripe_one_time_payment_intent_when_flagged(self, mock_create_pi, *args):
        """Show Contribution.create_stripe_one_time_payment_intent calls Stripe with right params...

        ...that it returns the created payment intent, and that it saves the payment intent ID and
        client secret back to the contribution
        """
        stripe_customer_id = "fake_stripe_customer_id"
        return_value = {"id": "fake_id", "client_secret": "fake_client_secret", "customer": stripe_customer_id}
        mock_create_pi.return_value = return_value
        contributor = ContributorFactory()
        self.contribution.contributor = contributor
        self.contribution.provider_customer_id = stripe_customer_id
        self.contribution.status = ContributionStatus.FLAGGED
        self.contribution.save()

        payment_intent = self.contribution.create_stripe_one_time_payment_intent()
        mock_create_pi.assert_called_once_with(
            amount=self.contribution.amount,
            currency=self.contribution.currency,
            customer=stripe_customer_id,
            metadata=self.contribution.contribution_metadata,
            receipt_email=contributor.email,
            statement_descriptor_suffix=self.revenue_program.stripe_statement_descriptor_suffix,
            stripe_account=self.revenue_program.stripe_account_id,
            capture_method="manual",
        )
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.provider_payment_id, return_value["id"])
        self.assertEqual(payment_intent, return_value)

    @patch("stripe.Subscription.create")
    def test_create_stripe_subscription(self, mock_create_subscription, *args):
        """Show Contribution.create_stripe_subscription calls Stripe with right params...

        ...that it returns the created subscription, and that it saves the right subscription data
        back to the contribution
        """
        stripe_customer_id = "fake_stripe_customer_id"
        return_value = {
            "id": "fake_id",
            "latest_invoice": {"payment_intent": {"client_secret": "fake_client_secret", "id": "pi_fakefakefake"}},
            "customer": stripe_customer_id,
        }
        mock_create_subscription.return_value = return_value
        metadata = {"meta": "data"}
        contributor = ContributorFactory()
        self.contribution.provider_customer_id = stripe_customer_id
        self.contribution.contributor = contributor
        self.contribution.interval = "month"
        self.contribution.save()
        subscription = self.contribution.create_stripe_subscription(metadata)
        mock_create_subscription.assert_called_once_with(
            customer=stripe_customer_id,
            items=[
                {
                    "price_data": {
                        "unit_amount": self.contribution.amount,
                        "currency": self.contribution.currency,
                        "product": self.payment_provider.stripe_product_id,
                        "recurring": {"interval": self.contribution.interval},
                    }
                }
            ],
            stripe_account=self.revenue_program.stripe_account_id,
            metadata=metadata,
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
            off_session=False,
            default_payment_method=None,
        )
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.payment_provider_data, return_value)
        self.assertEqual(self.contribution.provider_subscription_id, return_value["id"])
        self.assertEqual(self.contribution.provider_payment_id, "pi_fakefakefake")
        self.assertEqual(subscription, return_value)

    @patch("stripe.SetupIntent.create")
    def test_create_stripe_setup_intent(self, mock_create_setup_intent, *args):
        """Show Contribution.create_stripe_setup_intent calls Stripe with right params...

        ...that it returns the created setup intent, and that it saves the right data
        back to the contribution
        """
        stripe_customer_id = "fake_stripe_customer_id"
        return_value = {
            "id": "fake_id",
            "client_secret": "fake_client_secret",
        }
        mock_create_setup_intent.return_value = return_value
        metadata = {"meta": "data"}
        contributor = ContributorFactory()
        self.contribution.contributor = contributor
        self.contribution.provider_customer_id = stripe_customer_id
        self.contribution.provider_customer_id = stripe_customer_id
        self.contribution.interval = "month"
        self.contribution.status = ContributionStatus.FLAGGED
        self.contribution.save()

        subscription = self.contribution.create_stripe_setup_intent(metadata)
        mock_create_setup_intent.assert_called_once_with(
            customer=stripe_customer_id,
            stripe_account=self.revenue_program.stripe_account_id,
            metadata=metadata,
        )
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.provider_setup_intent_id, return_value["id"])
        self.assertEqual(subscription, return_value)

    def test_stripe_metadata(self, mock_fetch_stripe_payment_method, *args):
        referer = "https://somewhere.com"
        campaign_id = "some-id"
        contribution = ContributionFactory()
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
            "sf_campaign_id": campaign_id,
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


@pytest.mark.django_db
class TestContributionModel:
    @pytest.mark.parametrize(
        "status",
        (
            ContributionStatus.PROCESSING,
            ContributionStatus.FLAGGED,
        ),
    )
    def test_cancel_when_one_time(self, status, monkeypatch):
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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

    @pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
    def test_billing_details(self, trait):
        # TODO: DEV-3026 -- remove provider_payment_method_id = None
        contribution = ContributionFactory(**{trait: True, "provider_payment_method_id": None})
        assert (
            contribution.billing_details
            and contribution.billing_details
            == contribution.payment_provider_data["data"]["object"]["charges"]["data"][0]["billing_details"]
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
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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

        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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

    @pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
    def test_billing_name(self, trait):
        # TODO: DEV-3026  -- remove provider_payment_method_id = None
        contribution = ContributionFactory(**{trait: True, "provider_payment_method_id": None})
        assert contribution.billing_name and contribution.billing_name == contribution.billing_details.name

    @pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
    def test_billing_email(self, trait):
        # TODO: DEV-3026  -- remove provider_payment_method_id = None
        contribution = ContributionFactory(**{trait: True, "provider_payment_method_id": None})
        assert contribution.billing_email and contribution.billing_email == contribution.billing_details.email

    @pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
    def test_billing_phone(self, trait):
        # TODO: DEV-3026  -- remove provider_payment_method_id = None
        contribution = ContributionFactory(**{trait: True, "provider_payment_method_id": None})
        assert contribution.billing_phone and contribution.billing_phone == contribution.billing_details.phone

    @pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
    def test_billing_address(self, trait):
        # TODO: DEV-3026  -- remove provider_payment_method_id = None
        contribution = ContributionFactory(**{trait: True, "provider_payment_method_id": None})
        assert contribution.billing_address

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
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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

    @pytest.mark.parametrize(
        "trait",
        (
            "one_time",
            "annual_subscription",
            "monthly_subscription",
        ),
    )
    def test_formatted_donor_selected_amount(self, trait):
        # TODO: DEV-3026  -- remove provider_payment_method_id = None
        kwargs = {trait: True, "provider_payment_method_id": None}
        contribution = ContributionFactory(**kwargs)
        assert (
            contribution.formatted_donor_selected_amount
            and contribution.formatted_donor_selected_amount == f"{contribution.amount} {contribution.currency.upper()}"
        )

    @pytest.mark.parametrize("name, symbol", settings.CURRENCIES.items())
    def test_get_currency_dict(self, name, symbol):
        contribution = ContributionFactory(currency=name, provider_payment_method_id=None)
        assert {"code": name, "symbol": symbol} == contribution.get_currency_dict()

    def test_get_currency_dict_bad_value(self, monkeypatch):
        mock_log_error = Mock()
        monkeypatch.setattr(logger, "error", mock_log_error)
        contribution = ContributionFactory(currency="???", provider_payment_method_id=None)
        assert {"code": "", "symbol": ""} == contribution.get_currency_dict()
        mock_log_error.assert_called_once_with(
            'Currency settings for stripe account "%s" misconfigured. Tried to access "%s", but valid options are: %s',
            contribution.stripe_account_id,
            "???",
            settings.CURRENCIES,
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
        # This is to squash a side effect in contribution.save
        # TODO: DEV-3026
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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
                render_to_string(
                    "recurring-contribution-email-reminder.txt",
                    (
                        data := {
                            "rp_name": contribution.donation_page.revenue_program.name,
                            "contribution_date": next_charge_date.strftime("%m/%d/%Y"),
                            "contribution_amount": contribution.formatted_amount,
                            "contribution_interval_display_value": contribution.interval,
                            "non_profit": contribution.donation_page.revenue_program.non_profit,
                            "contributor_email": contribution.contributor.email,
                            "tax_id": contribution.donation_page.revenue_program.tax_id,
                            "magic_link": magic_link,
                            "fiscal_status": contribution.donation_page.revenue_program.fiscal_status,
                            "fiscal_sponsor_name": contribution.donation_page.revenue_program.fiscal_sponsor_name,
                            "style": asdict(contribution.donation_page.revenue_program.transactional_email_style),
                        }
                    ),
                ),
                render_to_string("recurring-contribution-email-reminder.html", data),
            )
            assert len(mail.outbox) == 1
        else:
            mock_log_warning.assert_called_once_with(
                "`Contribution.send_recurring_contribution_email_reminder` was called on an instance (ID: %s) whose interval is one-time",
                contribution.id,
            )

    @pytest_cases.parametrize(
        "revenue_program",
        (
            pytest_cases.fixture_ref("fiscally_sponsored_revenue_program"),
            pytest_cases.fixture_ref("nonprofit_revenue_program"),
            pytest_cases.fixture_ref("for_profit_revenue_program"),
        ),
    )
    @pytest.mark.parametrize("tax_id", (None, "123456789"))
    def test_send_recurring_contribution_email_reminder_email_text(
        self, revenue_program, tax_id, monkeypatch, settings
    ):
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(interval=ContributionInterval.YEARLY)
        revenue_program.tax_id = tax_id
        revenue_program.save()
        contribution.donation_page.revenue_program = revenue_program
        contribution.donation_page.save()
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
            f"Amount Contributed: {contribution.formatted_amount}/{contribution.interval}",
        ]

        if revenue_program.fiscal_status == FiscalStatusChoices.FISCALLY_SPONSORED:
            email_expectations.extend(
                [
                    "This receipt may be used for tax purposes.",
                    f"All contributions or gifts to {contribution.donation_page.revenue_program.name} are tax deductible through our fiscal sponsor {contribution.donation_page.revenue_program.fiscal_sponsor_name}.",
                    f"{contribution.donation_page.revenue_program.fiscal_sponsor_name}'s tax ID is {tax_id}"
                    if tax_id
                    else "",
                ]
            )
        elif revenue_program.fiscal_status == FiscalStatusChoices.NONPROFIT:
            email_expectations.extend(
                [
                    "This receipt may be used for tax purposes.",
                    f"{contribution.donation_page.revenue_program.name} is a 501(c)(3) nonprofit organization",
                    f"with a Federal Tax ID #{tax_id}" if tax_id else "",
                ]
            )
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
            # pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            # pytest_cases.fixture_ref("rp_user"),
            # pytest_cases.fixture_ref("user_with_unexpected_role"),
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
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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

    @pytest.mark.parametrize("contribution_trait", ("one_time", "monthly_subscription", "annual_subscription"))
    @pytest.mark.parametrize("nre_sends_receipts", (True, False))
    def test_handle_thank_you_email(self, contribution_trait, nre_sends_receipts, mocker):
        mock_send_thank_you_task = mocker.patch("apps.contributions.models.send_thank_you_email.delay")
        mock_stripe_customer = mocker.patch("stripe.Customer.retrieve")
        mock_stripe_customer.return_value = AttrDict({"name": "Foo Bar"})
        mock_create_magic_link = mocker.patch("apps.contributions.models.Contributor.create_magic_link")
        mock_create_magic_link.return_value = "https://example.com/magic-link"
        contribution = ContributionFactory(
            **{
                contribution_trait: True,
                "donation_page__revenue_program__organization__send_receipt_email_via_nre": nre_sends_receipts,
                # this is so we don't trigger a call to Stripe
                "provider_payment_method_id": None,
            }
        )
        contribution.handle_thank_you_email()
        if nre_sends_receipts:
            mock_send_thank_you_task.assert_called_once_with(make_send_thank_you_email_data(contribution))
        else:
            mock_send_thank_you_task.assert_not_called()


@pytest.mark.django_db()
@pytest.mark.parametrize(
    "fiscal_status,tax_id",
    (
        (FiscalStatusChoices.NONPROFIT, None),
        (FiscalStatusChoices.NONPROFIT, "123456789"),
        (FiscalStatusChoices.FOR_PROFIT, None),
    ),
)
def test_contribution_send_recurring_contribution_email_reminder_email_text(
    fiscal_status, tax_id, monkeypatch, settings
):
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        contribution = ContributionFactory(interval=ContributionInterval.YEARLY)
    contribution.donation_page.revenue_program.fiscal_status = fiscal_status
    contribution.donation_page.revenue_program.tax_id = tax_id
    contribution.donation_page.revenue_program.save()
    next_charge_date = datetime.datetime.now()
    mock_send_templated_email = Mock(wraps=send_templated_email.delay)
    token = "token"

    class MockForContributorReturn:
        def __init__(self, *args, **kwargs):
            self.short_lived_access_token = token

    monkeypatch.setattr(send_templated_email, "delay", mock_send_templated_email)
    monkeypatch.setattr(ContributorRefreshToken, "for_contributor", lambda *args, **kwargs: MockForContributorReturn())
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    settings.CELERY_ALWAYS_EAGER = True
    contribution.send_recurring_contribution_email_reminder(next_charge_date)
    assert len(mail.outbox) == 1
    email_expectations = [
        f"Scheduled: {next_charge_date.strftime('%m/%d/%Y')}",
        f"Email: {contribution.contributor.email}",
        f"Amount Contributed: ${contribution.formatted_amount}/{contribution.interval}",
    ]
    if fiscal_status == FiscalStatusChoices.NONPROFIT:
        email_expectations.extend(
            [
                "This receipt may be used for tax purposes.",
                f"{contribution.donation_page.revenue_program.name} is a 501(c)(3) nonprofit organization",
            ]
        )
