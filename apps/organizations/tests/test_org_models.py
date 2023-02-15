from datetime import timedelta
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.db.models.deletion import ProtectedError
from django.test import TestCase, override_settings
from django.utils import timezone
from django.utils.text import slugify

import pytest
from faker import Faker

from apps.common.models import SocialMeta
from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import GENERIC_SLUG_DENIED_MSG, SLUG_DENIED_CODE
from apps.contributions.tests.factories import ContributionFactory
from apps.organizations.models import RP_SLUG_MAX_LENGTH, FiscalStatusChoices, RevenueProgram
from apps.organizations.tests import factories
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory
from apps.users.models import RoleAssignment
from apps.users.tests.factories import RoleAssignmentFactory


TEST_STRIPE_LIVE_KEY = "my_test_live_key"
TEST_DOMAIN_APEX = "testapexdomain.com"


class TestOrganizationModel(TestCase):
    def setUp(self):
        self.organization = factories.OrganizationFactory()
        self.rp = factories.RevenueProgramFactory(organization=self.organization)
        self.dp = DonationPageFactory(revenue_program=self.rp)
        # TODO: DEV-3026
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            self.contribution = ContributionFactory(donation_page=self.dp)
        self.role_assignment = RoleAssignmentFactory(organization=self.organization)

    def test_admin_revenueprogram_options(self):
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.admin_revenueprogram_options, [(self.rp.name, self.rp.pk)])

    def test_org_cannot_be_deleted_when_contributions_downstream(self):
        """An org should not be deleteable when downstream contributions exist"""
        with self.assertRaises(ProtectedError) as protected_error:
            self.organization.delete()
        error_msg = (
            "Cannot delete some instances of model 'Organization' because they are referenced through protected "
            "foreign keys: 'RevenueProgram.organization'."
        )
        self.assertEqual(error_msg, protected_error.exception.args[0])
        # prove related not deleted
        self.rp.refresh_from_db()
        self.dp.refresh_from_db()
        self.contribution.refresh_from_db()
        self.role_assignment.refresh_from_db()

    def test_org_deletion_cascades_when_no_contributions_downstream(self):
        """An org and its cascading relationships should be deleted when no downstream contributions"""
        rp_id = self.rp.id
        dp_id = self.dp.id
        ra_id = self.role_assignment.id
        self.contribution.delete()
        self.organization.delete()
        self.assertFalse(RevenueProgram.objects.filter(id=rp_id).exists())
        self.assertFalse(DonationPage.objects.filter(id=dp_id).exists())
        self.assertFalse(RoleAssignment.objects.filter(id=ra_id).exists())


class RevenueProgramTest(TestCase):
    def setUp(self):
        self.stripe_account_id = "my_stripe_account_id"
        self.organization = factories.OrganizationFactory()
        self.payment_provider = factories.PaymentProviderFactory(stripe_account_id=self.stripe_account_id)
        self.instance = factories.RevenueProgramFactory(
            organization=self.organization, payment_provider=self.payment_provider
        )

    def _create_revenue_program(self):
        return RevenueProgram.objects.create(
            name="Testing", slug="testing", organization=self.organization, payment_provider=self.payment_provider
        )

    def test_slug_created(self):
        assert self.instance.slug

    def test_has_an_org(self):
        assert self.instance.organization

    def test_slug_immutable(self):
        self.instance.name = "A new Name"
        self.instance.save()
        self.instance.refresh_from_db()
        assert slugify("A new Name") not in self.instance.slug

    def test_slug_larger_than_max_length(self):
        fake = Faker()
        Faker.seed(0)
        long_slug_rp = factories.RevenueProgramFactory(name=f"{' '.join(fake.words(nb=30))}")
        assert len(long_slug_rp.slug) < RP_SLUG_MAX_LENGTH

    # This is to squash a side effect in contribution.save
    # TODO: DEV-3026
    @patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None)
    def test_cannot_delete_when_downstream_contributions(self, mock_fetch_stripe_payment_method):
        page = DonationPageFactory(revenue_program=self.instance)
        ContributionFactory(donation_page=page)
        with pytest.raises(ProtectedError) as protected_error:
            self.instance.delete()
        error_msg = (
            "Cannot delete some instances of model 'RevenueProgram' because they are referenced "
            "through protected foreign keys: 'DonationPage.revenue_program'."
        )
        assert error_msg, protected_error.value.args[0]

    def test_can_delete_when_no_downstream_contributions_and_cascades(self):
        page_id = DonationPageFactory(revenue_program=self.instance).id
        self.instance.delete()
        assert not DonationPage.objects.filter(id=page_id).exists()

    def test_delete_organization_deletes_revenue_program(self):
        assert self.organization is not None
        assert self.instance is not None
        assert self.instance.organization == self.organization
        rp_pk = self.instance.id
        self.organization.delete()
        assert not RevenueProgram.objects.filter(pk=rp_pk).exists()

    def test_deleting_cascades_to_socialmeta(self):
        sm_id = SocialMeta.objects.create(
            title="title", description="description", url="https://example.com", revenue_program=self.instance
        ).id
        self.instance.delete()
        assert not SocialMeta.objects.filter(id=sm_id).exists()

    def test_format_twitter_handle(self):
        target_handle = "testing"
        self.instance.twitter_handle = "@" + target_handle
        self.instance.clean()
        assert self.instance.twitter_handle == target_handle

    @override_settings(STRIPE_LIVE_MODE=False)
    @patch("stripe.ApplePayDomain.create")
    def test_apple_pay_domain_verification_not_called_when_created_and_not_live(self, apple_pay_domain_create):
        factories.RevenueProgramFactory()
        apple_pay_domain_create.assert_not_called()

    @override_settings(STRIPE_LIVE_MODE=True)
    @override_settings(STRIPE_LIVE_SECRET_KEY=TEST_STRIPE_LIVE_KEY)
    @override_settings(DOMAIN_APEX=TEST_DOMAIN_APEX)
    @patch("stripe.ApplePayDomain.create")
    def test_apple_pay_domain_verification_not_called_when_updated_and_live(self, apple_pay_domain_create):
        self.instance.slug = "my-new-slug"
        self.instance.save()
        apple_pay_domain_create.assert_not_called()

    def test_slug_validated_against_denylist(self):
        denied_word = DenyListWordFactory()
        rp = RevenueProgram(name="My rp", organization=self.organization, payment_provider=self.payment_provider)
        rp.slug = denied_word.word
        with pytest.raises(ValidationError) as validation_error:
            rp.clean_fields()
        assert "slug" in validation_error.value.error_dict
        assert SLUG_DENIED_CODE == validation_error.value.error_dict["slug"][0].code
        assert GENERIC_SLUG_DENIED_MSG == validation_error.value.error_dict["slug"][0].message

    def test_admin_benefit_options(self):
        assert isinstance(self.instance.admin_benefit_options, list)

    def test_admin_benefitlevel_options(self):
        assert isinstance(self.instance.admin_benefitlevel_options, list)


@pytest.mark.parametrize(
    "fiscal_status,fiscal_sponsor_name,non_profit_value",
    [
        (FiscalStatusChoices.FOR_PROFIT, None, False),
        (FiscalStatusChoices.NONPROFIT, None, True),
        (FiscalStatusChoices.FISCALLY_SPONSORED, "NRH", True),
    ],
)
@pytest.mark.django_db
def test_fiscal_status_on_revenue_program(fiscal_status, fiscal_sponsor_name, non_profit_value):
    rp = RevenueProgramFactory(org=OrganizationFactory())
    rp.fiscal_status = fiscal_status
    rp.fiscal_sponsor_name = fiscal_sponsor_name
    assert rp.non_profit == non_profit_value


@pytest.mark.parametrize(
    "fiscal_status,fiscal_sponsor_name",
    [
        (FiscalStatusChoices.FOR_PROFIT, "NRH"),
        (FiscalStatusChoices.NONPROFIT, "NRH"),
        (FiscalStatusChoices.FISCALLY_SPONSORED, None),
    ],
)
@pytest.mark.django_db
def test_fiscal_sponsor_name_clean(fiscal_status, fiscal_sponsor_name):
    rp = RevenueProgramFactory(org=OrganizationFactory())
    rp.fiscal_status = fiscal_status
    rp.fiscal_sponsor_name = fiscal_sponsor_name
    with pytest.raises(ValidationError):
        rp.clean_fiscal_sponsor_name()


class BenefitLevelTest(TestCase):
    def setUp(self):
        self.lower_limit = 50
        self.upper_limit = 100
        self.benefit_level = factories.BenefitLevelFactory(
            upper_limit=self.upper_limit,
            lower_limit=self.lower_limit,
        )

    def test_donation_range_when_normal(self):
        self.assertEqual(
            self.benefit_level.donation_range, f"${self.benefit_level.lower_limit}-{self.benefit_level.upper_limit}"
        )

    def test_donation_range_when_no_upper(self):
        self.benefit_level.upper_limit = None
        self.benefit_level.save()
        self.assertEqual(self.benefit_level.donation_range, f"${self.benefit_level.lower_limit}+")

    def test_upper_lower_limit_validation(self):
        self.benefit_level.upper_limit = self.benefit_level.lower_limit - 1
        with self.assertRaises(ValidationError) as v_error:
            self.benefit_level.clean()

        self.assertEqual(v_error.exception.message, "Upper limit must be greater than lower limit")


class TestPaymentProviderModel(TestCase):
    def setUp(self):
        now = timezone.now()
        self.payment_provider = factories.PaymentProviderFactory()
        self.revenue_program = factories.RevenueProgramFactory(payment_provider=self.payment_provider)
        self.live_page = DonationPageFactory(
            revenue_program=self.revenue_program, published_date=now - timedelta(days=14)
        )
        self.future_live_page = DonationPageFactory(
            revenue_program=self.revenue_program, published_date=now + timedelta(days=14)
        )

    def test_get_dependent_pages_with_publication_date(self):
        # add an additional page so test is not trivial
        DonationPageFactory(revenue_program=self.revenue_program, published_date=None)
        """Show gets list of contribution pages with pub date that indirectly reference the provider"""
        self.assertEqual(
            set(list(self.payment_provider.get_dependent_pages_with_publication_date().values_list("id", flat=True))),
            {self.live_page.pk, self.future_live_page.pk},
        )
