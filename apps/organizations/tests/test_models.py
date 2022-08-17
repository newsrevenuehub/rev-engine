from unittest import mock

from django.conf import settings

import pytest

import apps
from apps.organizations.models import (
    Benefit,
    BenefitLevel,
    BenefitLevelBenefit,
    Feature,
    Organization,
    PaymentProvider,
    Plan,
    RevenueProgram,
)
from apps.users.choices import Roles
from apps.users.models import User

from .factories import RevenueProgramFactory


class TestFeature:
    def test_basics(self):
        t = Feature()
        str(t)


class TestPlan:
    def test_basics(self):
        t = Plan()
        str(t)

    @pytest.mark.parametrize(
        "role",
        [
            (Roles.HUB_ADMIN),
            (Roles.ORG_ADMIN),
            (Roles.RP_ADMIN),
        ],
    )
    def test_filter_queryset_by_role_assigment(self, role):
        role_assignment = mock.Mock(role_type=role, organization=Organization())
        Plan.filter_queryset_by_role_assignment(role_assignment, Plan.objects.all())

    def test_unknown_filter_queryset_by_role_assigment(self):
        role_assignment = mock.Mock(role_type="wat")
        with pytest.raises(apps.users.models.UnexpectedRoleType):
            Plan.filter_queryset_by_role_assignment(role_assignment, Plan.objects.all())


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


class TestRevenueProgram:
    def test_basics(self):
        t = RevenueProgram()
        str(t)

    def test_stripe_account_id(self):
        t = RevenueProgram()
        assert None is t.stripe_account_id

    @pytest.mark.django_db
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
