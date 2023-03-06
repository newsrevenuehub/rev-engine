from unittest.mock import Mock

from django.conf import settings
from django.test import override_settings
from django.utils import timezone

import pytest
from mailchimp_marketing.api_client import ApiClientError
from stripe import ApplePayDomain
from stripe.error import StripeError

import apps
from apps.organizations.models import (
    Benefit,
    BenefitLevel,
    BenefitLevelBenefit,
    Organization,
    PaymentProvider,
    RevenueProgram,
    logger,
)
from apps.users.models import User

from .factories import RevenueProgramFactory


@pytest.mark.django_db
class TestOrganization:
    def test_basics(self):
        t = Organization()
        str(t)
        assert isinstance(t.admin_revenueprogram_options, list)

    def test_user_is_member(self):
        user = User.objects.create()
        t = Organization.objects.create()
        assert not t.user_is_member(user)
        t.users.add(user)
        assert t.user_is_member(user)

    def test_user_is_owner(self):
        user = User.objects.create()
        t = Organization.objects.create()
        assert not t.user_is_owner(user)


class TestBenefit:
    def test_basics(self):
        t = Benefit()
        str(t)


class TestBenefitLevel:
    def test_basics(self):
        t = BenefitLevel()
        str(t)

    def test_clean(self):
        t = BenefitLevel()
        t.clean()


class TestBenefitLevelBenefit:
    def test_basics(self):
        t = BenefitLevelBenefit(benefit=Benefit(), benefit_level=BenefitLevel(), order=1)
        str(t)


@pytest.mark.django_db
class TestRevenueProgram:
    def test_basics(self):
        t = RevenueProgram()
        str(t)

    def test_stripe_account_id(self):
        t = RevenueProgram()
        assert None is t.stripe_account_id

    def test_clean_fields(self):
        t = RevenueProgramFactory(name="B o %")
        t.clean_fields()
        assert "b-o" == t.slug
        # Branch coverage.
        t = RevenueProgramFactory()
        t.clean_fields()

    def test_clean(self):
        t = RevenueProgram()
        t.clean()

    def test_bad_default_page(self):
        # Avoid state of a rev program's default page not being one of "its pages"
        t = RevenueProgram()
        t.default_donation_page = apps.pages.models.DonationPage(revenue_program=t)
        t.clean()
        # Not set.
        with pytest.raises(apps.organizations.models.ValidationError):
            t.default_donation_page = apps.pages.models.DonationPage()
            t.clean()
        # Set to other RP
        with pytest.raises(apps.organizations.models.ValidationError):
            t.default_donation_page = apps.pages.models.DonationPage(revenue_program=RevenueProgram())
            t.clean()

    @override_settings(STRIPE_LIVE_MODE=True)
    def test_stripe_create_apple_pay_domain_happy_path(self, mocker):
        mock_stripe_create = mocker.patch.object(ApplePayDomain, "create")
        rp = RevenueProgramFactory(domain_apple_verified_date=None)
        rp.stripe_create_apple_pay_domain()
        rp.refresh_from_db()
        assert rp.domain_apple_verified_date is not None
        mock_stripe_create.assert_called_once_with(
            api_key="",
            domain_name=f"{rp.slug}.{settings.DOMAIN_APEX}",
            stripe_account=rp.payment_provider.stripe_account_id,
        )

    @pytest.mark.django_db
    @override_settings(STRIPE_LIVE_MODE=True)
    def test_stripe_create_apple_pay_domain_when_already_verified_date_exists(self, mocker):
        mock_stripe_create = mocker.patch.object(ApplePayDomain, "create")
        verified_date = timezone.now()
        rp = RevenueProgramFactory(domain_apple_verified_date=verified_date)
        rp.stripe_create_apple_pay_domain()
        rp.refresh_from_db()
        assert rp.domain_apple_verified_date == verified_date
        assert not mock_stripe_create.called

    @override_settings(STRIPE_LIVE_MODE=False)
    def test_stripe_create_apple_pay_domain_when_not_in_live_mode(self, mocker):
        mock_stripe_create = mocker.patch.object(ApplePayDomain, "create")
        rp = RevenueProgramFactory(domain_apple_verified_date=None)
        rp.stripe_create_apple_pay_domain()
        rp.refresh_from_db()
        assert rp.domain_apple_verified_date is None
        assert not mock_stripe_create.called

    @override_settings(STRIPE_LIVE_MODE=True)
    def test_apple_pay_domain_verification_when_stripe_error(self, mocker):
        mock_stripe_create = mocker.patch.object(ApplePayDomain, "create", side_effect=StripeError)
        mock_logger = mocker.patch("apps.organizations.models.logger")
        rp = RevenueProgramFactory(domain_apple_verified_date=None)
        rp.stripe_create_apple_pay_domain()
        mock_stripe_create.assert_called_once()
        mock_logger.exception.assert_called_once()

    def test_mailchimp_email_lists_property_happy_path(self, revenue_program, monkeypatch):
        revenue_program.mailchimp_server_prefix = "us1"
        revenue_program.mailchimp_access_token = "123456"
        revenue_program.save()
        MockClient = Mock()
        MockClient.lists.get_all_lists.return_value = {"lists": [{"id": "123", "name": "test"}]}
        monkeypatch.setattr("mailchimp_marketing.Client", lambda *args, **kwargs: MockClient)
        assert revenue_program.mailchimp_email_lists == MockClient.lists.get_all_lists.return_value["lists"]

    def test_mailchimp_email_lists_property_when_missing_server_prefix(self, revenue_program):
        revenue_program.mailchimp_server_prefix = None
        revenue_program.mailchimp_access_token = "123456"
        revenue_program.save()
        assert revenue_program.mailchimp_email_lists == []

    def test_mailchimp_email_lists_property_when_missing_access_token(self, revenue_program):
        revenue_program.mailchimp_server_prefix = "us1"
        revenue_program.mailchimp_access_token = None
        revenue_program.save()
        assert revenue_program.mailchimp_email_lists == []

    def test_mailchimp_email_lists_property_when_mailchimp_api_error(self, revenue_program, monkeypatch, mocker):
        revenue_program.mailchimp_server_prefix = "us1"
        revenue_program.mailchimp_access_token = "123456"
        revenue_program.save()
        MockClient = Mock()
        MockClient.lists.get_all_lists.side_effect = ApiClientError("something went wrong")
        monkeypatch.setattr("mailchimp_marketing.Client", lambda *args, **kwargs: MockClient)
        log_spy = mocker.spy(logger, "exception")
        assert revenue_program.mailchimp_email_lists == []
        log_spy.assert_called_once_with(
            "`RevenueProgram.mailchimp_email_lists` failed to fetch email lists from Mailchimp for RP with ID %s",
            revenue_program.id,
        )


class TestPaymentProvider:
    def test_basics(self):
        t = PaymentProvider()
        str(t)

    def test_stripe_create_default_product(self):
        t = PaymentProvider(stripe_product_id=1)
        t.stripe_create_default_product()

    @pytest.mark.parametrize("name, symbol", settings.CURRENCIES.items())
    def test_get_currency_dict(self, name, symbol):
        t = PaymentProvider(currency=name)
        assert {"code": name, "symbol": symbol} == t.get_currency_dict()

    def test_bad_money_get_currency_dict(self):
        t = PaymentProvider(currency="StarBucks")
        assert {"code": "", "symbol": ""} == t.get_currency_dict()
