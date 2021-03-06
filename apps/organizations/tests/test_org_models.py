from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.db.models.deletion import ProtectedError
from django.test import TestCase, override_settings
from django.utils.text import slugify

from faker import Faker
from stripe.error import StripeError

from apps.common.models import SocialMeta
from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import GENERIC_SLUG_DENIED_MSG, SLUG_DENIED_CODE
from apps.contributions.tests.factories import ContributionFactory
from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.tests import factories
from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory
from apps.users.models import RoleAssignment
from apps.users.tests.factories import RoleAssignmentFactory


TEST_STRIPE_LIVE_KEY = "my_test_live_key"
TEST_DOMAIN_APEX = "testapexdomain.com"


class TestPlanModel(TestCase):
    def test_cannot_delete_plan_when_referenced_by_org(self):
        plan = factories.PlanFactory()
        factories.OrganizationFactory(plan=plan)
        with self.assertRaises(ProtectedError) as protected_error:
            plan.delete()
        error_msg = (
            "Cannot delete some instances of model 'Plan' because they are referenced through protected "
            "foreign keys: 'Organization.plan'."
        )
        self.assertEqual(error_msg, protected_error.exception.args[0])


class TestOrganizationModel(TestCase):
    def setUp(self):
        self.organization = factories.OrganizationFactory()
        self.rp = factories.RevenueProgramFactory(organization=self.organization)
        self.dp = DonationPageFactory(revenue_program=self.rp)
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
        self.assertNotIn(slugify("A new Name"), self.instance.slug)

    def test_slug_larger_than_100(self):
        fake = Faker()
        Faker.seed(0)
        long_slug_rp = factories.RevenueProgramFactory(name=f"{' '.join(fake.words(nb=30))}")
        self.assertLessEqual(len(long_slug_rp.slug), 100)

    def test_cannot_delete_when_downstream_contributions(self):
        page = DonationPageFactory(revenue_program=self.instance)
        ContributionFactory(donation_page=page)
        with self.assertRaises(ProtectedError) as protected_error:
            self.instance.delete()
        error_msg = (
            "Cannot delete some instances of model 'RevenueProgram' because they are referenced "
            "through protected foreign keys: 'DonationPage.revenue_program'."
        )
        self.assertEqual(error_msg, protected_error.exception.args[0])

    def test_can_delete_when_no_downstream_contributions_and_cascades(self):
        page_id = DonationPageFactory(revenue_program=self.instance).id
        self.instance.delete()
        self.assertFalse(DonationPage.objects.filter(id=page_id).exists())

    def test_delete_organization_deletes_revenue_program(self):
        self.assertIsNotNone(self.organization)
        self.assertIsNotNone(self.instance)
        self.assertEqual(self.instance.organization, self.organization)
        rp_pk = self.instance.id
        self.organization.delete()
        self.assertFalse(RevenueProgram.objects.filter(pk=rp_pk).exists())

    def test_deleting_cascades_to_socialmeta(self):
        sm_id = SocialMeta.objects.create(
            title="title", description="description", url="https://example.com", revenue_program=self.instance
        ).id
        self.instance.delete()
        self.assertFalse(SocialMeta.objects.filter(id=sm_id).exists())

    def test_format_twitter_handle(self):
        target_handle = "testing"
        self.instance.twitter_handle = "@" + target_handle
        self.instance.clean()
        self.assertEqual(self.instance.twitter_handle, target_handle)

    @override_settings(STRIPE_LIVE_MODE=True)
    @override_settings(STRIPE_LIVE_SECRET_KEY=TEST_STRIPE_LIVE_KEY)
    @override_settings(DOMAIN_APEX=TEST_DOMAIN_APEX)
    @patch("apps.organizations.models.stripe.ApplePayDomain.create")
    def test_apple_pay_domain_verification_called_when_created_and_live(self, apple_pay_domain_create):
        my_slug = "sluggy-the-slug"
        expected_domain = f"{my_slug}.{TEST_DOMAIN_APEX}"
        self.assertIsNotNone(org := Organization.objects.first())
        org.stripe_account_id = TEST_STRIPE_LIVE_KEY
        org.save()
        rp = factories.RevenueProgramFactory(slug=my_slug, org=org)
        apple_pay_domain_create.assert_called_once_with(
            api_key=TEST_STRIPE_LIVE_KEY,
            domain_name=expected_domain,
            stripe_account=rp.payment_provider.stripe_account_id,
        )

        # revenue_program should have a non-null domain_apple_verified_date
        self.assertIsNotNone(rp.domain_apple_verified_date)

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

    @override_settings(STRIPE_LIVE_MODE=True)
    @override_settings(STRIPE_LIVE_SECRET_KEY=TEST_STRIPE_LIVE_KEY)
    @override_settings(DOMAIN_APEX=TEST_DOMAIN_APEX)
    @patch("stripe.ApplePayDomain.create")
    @patch("apps.organizations.models.logger")
    def test_apple_pay_domain_verification_when_stripe_error(self, mock_logger, apple_pay_domain_create):
        apple_pay_domain_create.side_effect = StripeError
        factories.RevenueProgramFactory()
        apple_pay_domain_create.assert_called_once()
        mock_logger.warning.assert_called_once()

    def test_slug_validated_against_denylist(self):
        denied_word = DenyListWordFactory()
        rp = RevenueProgram(name="My rp", organization=self.organization, payment_provider=self.payment_provider)
        rp.slug = denied_word.word
        with self.assertRaises(ValidationError) as validation_error:
            rp.clean_fields()
        self.assertIn("slug", validation_error.exception.error_dict)
        self.assertEqual(SLUG_DENIED_CODE, validation_error.exception.error_dict["slug"][0].code)
        self.assertEqual(GENERIC_SLUG_DENIED_MSG, validation_error.exception.error_dict["slug"][0].message)

    def test_admin_benefit_options(self):
        self.assertTrue(isinstance(self.instance.admin_benefit_options, list))

    def test_admin_benefitlevel_options(self):
        self.assertTrue(isinstance(self.instance.admin_benefitlevel_options, list))


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
