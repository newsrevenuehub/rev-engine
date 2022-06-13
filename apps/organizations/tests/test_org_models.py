from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from django.utils.text import slugify

from faker import Faker
from stripe.error import StripeError

from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import GENERIC_SLUG_DENIED_MSG, SLUG_DENIED_CODE
from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.tests import factories


TEST_STRIPE_LIVE_KEY = "my_test_live_key"
TEST_DOMAIN_APEX = "testapexdomain.com"


class TestOrganizationModel(TestCase):
    def setUp(self):
        self.organization = factories.OrganizationFactory()

    def test_admin_revenueprogram_options(self):
        rp = factories.RevenueProgramFactory(organization=self.organization)
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.admin_revenueprogram_options, [(rp.name, rp.pk)])


class RevenueProgramTest(TestCase):
    def setUp(self):
        self.stripe_account_id = "my_stripe_account_id"
        self.organization = factories.OrganizationFactory(stripe_account_id=self.stripe_account_id)
        self.revenue_program = factories.RevenueProgramFactory(organization=self.organization)

    def test_slug_created(self):
        assert self.revenue_program.slug

    def test_has_an_org(self):
        assert self.revenue_program.organization

    def test_slug_immutable(self):
        self.revenue_program.name = "A new Name"
        self.revenue_program.save()
        self.revenue_program.refresh_from_db()
        self.assertNotIn(slugify("A new Name"), self.revenue_program.slug)

    def test_slug_larger_than_100(self):
        fake = Faker()
        Faker.seed(0)
        long_slug_rp = factories.RevenueProgramFactory(name=f"{' '.join(fake.words(nb=30))}")
        self.assertLessEqual(len(long_slug_rp.slug), 100)

    def test_delete_organization_deletes_revenue_program(self):
        self.assertIsNotNone(self.organization)
        self.assertIsNotNone(self.revenue_program)
        self.assertEqual(self.revenue_program.organization, self.organization)
        rp_pk = self.revenue_program.id
        self.organization.delete()
        self.assertFalse(RevenueProgram.objects.filter(pk=rp_pk).exists())

    def test_format_twitter_handle(self):
        target_handle = "testing"
        self.revenue_program.twitter_handle = "@" + target_handle
        self.revenue_program.clean()
        self.assertEqual(self.revenue_program.twitter_handle, target_handle)

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
            stripe_account=rp.organization.stripe_account_id,
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
        self.revenue_program.slug = "my-new-slug"
        self.revenue_program.save()
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
        self.revenue_program.slug = denied_word.word
        with self.assertRaises(ValidationError) as validation_error:
            self.revenue_program.clean_fields()
        self.assertIn("slug", validation_error.exception.error_dict)
        self.assertEqual(SLUG_DENIED_CODE, validation_error.exception.error_dict["slug"][0].code)
        self.assertEqual(GENERIC_SLUG_DENIED_MSG, validation_error.exception.error_dict["slug"][0].message)

    def test_admin_benefit_options(self):
        self.assertTrue(isinstance(self.revenue_program.admin_benefit_options, list))

    def test_admin_benefitlevel_options(self):
        self.assertTrue(isinstance(self.revenue_program.admin_benefitlevel_options, list))


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
