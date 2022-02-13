from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from django.utils.text import slugify

from faker import Faker
from stripe.error import StripeError

from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import GENERIC_SLUG_DENIED_MSG, SLUG_DENIED_CODE
from apps.organizations import models
from apps.organizations.tests import factories


class OrganizationTest(TestCase):
    def setUp(self):
        self.model_class = models.Organization
        self.instance = factories.OrganizationFactory()

    def test_default_no_plan(self):
        assert not self.instance.plan


TEST_STRIPE_LIVE_KEY = "my_test_live_key"
TEST_DOMAIN_APEX = "testapexdomain.com"


class RevenueProgramTest(TestCase):
    def setUp(self):
        self.model_class = models.RevenueProgram
        self.stripe_account_id = "my_stripe_account_id"
        self.organization = factories.OrganizationFactory(stripe_account_id=self.stripe_account_id)
        self.instance = factories.RevenueProgramFactory()

    def _create_revenue_program(self):
        return models.RevenueProgram.objects.create(name="Testing", slug="testing", organization=self.organization)

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
        self.instance = factories.RevenueProgramFactory(name=f"{' '.join(fake.words(nb=30))}")
        self.assertLessEqual(len(self.instance.slug), 100)

    def test_delete_organization_cleans_up(self):
        assert len(self.model_class.objects.all()) == 1
        org = self.instance.organization
        org.delete()
        assert len(self.model_class.objects.all()) == 0

    def test_format_twitter_handle(self):
        target_handle = "testing"
        self.instance.twitter_handle = "@" + target_handle
        self.instance.clean()
        self.assertEqual(self.instance.twitter_handle, target_handle)

    @override_settings(STRIPE_LIVE_MODE=True)
    @override_settings(STRIPE_LIVE_SECRET_KEY=TEST_STRIPE_LIVE_KEY)
    @override_settings(DOMAIN_APEX=TEST_DOMAIN_APEX)
    @patch("stripe.ApplePayDomain.create")
    def test_apple_pay_domain_verification_called_when_created_and_live(self, apple_pay_domain_create):
        revenue_program = self._create_revenue_program()
        expected_domain = f"{revenue_program.slug}.{TEST_DOMAIN_APEX}"
        apple_pay_domain_create.assert_called_once_with(
            api_key=TEST_STRIPE_LIVE_KEY,
            domain_name=expected_domain,
            stripe_account=self.organization.stripe_account_id,
        )
        # revenue_program should have a non-null domain_apple_verified_date
        self.assertIsNotNone(revenue_program.domain_apple_verified_date)

    @override_settings(STRIPE_LIVE_MODE=False)
    @patch("stripe.ApplePayDomain.create")
    def test_apple_pay_domain_verification_not_called_when_created_and_not_live(self, apple_pay_domain_create):
        self._create_revenue_program()
        apple_pay_domain_create.assert_not_called()

    @override_settings(STRIPE_LIVE_MODE=True)
    @override_settings(STRIPE_LIVE_SECRET_KEY=TEST_STRIPE_LIVE_KEY)
    @override_settings(DOMAIN_APEX=TEST_DOMAIN_APEX)
    @patch("stripe.ApplePayDomain.create")
    def test_apple_pay_domain_verification_not_called_when_updated_and_live(self, apple_pay_domain_create):
        rp = models.RevenueProgram.objects.get(pk=self.instance.pk)
        rp.slug = "my-new-slug"
        rp.save()
        apple_pay_domain_create.assert_not_called()

    @override_settings(STRIPE_LIVE_MODE=True)
    @override_settings(STRIPE_LIVE_SECRET_KEY=TEST_STRIPE_LIVE_KEY)
    @override_settings(DOMAIN_APEX=TEST_DOMAIN_APEX)
    @patch("stripe.ApplePayDomain.create")
    @patch("apps.organizations.models.logger")
    def test_apple_pay_domain_verification_when_stripe_error(self, mock_logger, apple_pay_domain_create):
        apple_pay_domain_create.side_effect = StripeError
        self._create_revenue_program()
        apple_pay_domain_create.assert_called_once()
        mock_logger.warning.assert_called_once()

    def test_slug_validated_against_denylist(self):
        denied_word = DenyListWordFactory()
        rp = models.RevenueProgram(name="My rp", organization=self.organization)
        rp.slug = denied_word.word
        with self.assertRaises(ValidationError) as validation_error:
            rp.clean_fields()

        self.assertIn("slug", validation_error.exception.error_dict)
        self.assertEqual(SLUG_DENIED_CODE, validation_error.exception.error_dict["slug"][0].code)
        self.assertEqual(GENERIC_SLUG_DENIED_MSG, validation_error.exception.error_dict["slug"][0].message)


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
