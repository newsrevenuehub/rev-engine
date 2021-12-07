from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from django.utils.text import slugify

from faker import Faker

from apps.organizations import models
from apps.organizations.tests import factories


class OrganizationTest(TestCase):
    def setUp(self):
        self.model_class = models.Organization
        self.instance = factories.OrganizationFactory()

    def test_slug_created(self):
        assert self.instance.slug

    def test_slug_equals_orgname(self):
        self.assertEqual(self.instance.slug, slugify(self.instance.name, allow_unicode=True))

    def test_slug_immutable(self):
        self.instance.name = "A new Name"
        self.instance.save()
        self.instance.refresh_from_db()
        self.assertNotIn(slugify("A new Name"), self.instance.slug)

    def test_default_no_plan(self):
        assert not self.instance.plan


TEST_STRIPE_LIVE_KEY = "my_test_live_key"
TEST_SITE_URL = "https://mytesturl.com"


class RevenueProgramTest(TestCase):
    def setUp(self):
        self.model_class = models.RevenueProgram
        self.instance = factories.RevenueProgramFactory()

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

    @override_settings(STRIPE_LIVE_MODE="True")
    @override_settings(STRIPE_LIVE_SECRET_KEY=TEST_STRIPE_LIVE_KEY)
    @override_settings(SITE_URL=TEST_SITE_URL)
    @patch("stripe.ApplePayDomain.create")
    def test_apple_pay_domain_verification_called_when_created_and_live(self, apple_pay_domain_create):
        revenue_program = models.RevenueProgram.objects.create(name="Testing", slug="testing")

    def test_apple_pay_domain_verification_not_called_when_created_and_not_live(self):
        pass

    def test_apple_pay_domain_verification_not_called_when_updated_and_live(self):
        pass

    # @override_settings(STRIPE_LIVE_MODE="True")
    # @override_settings(STRIPE_LIVE_SECRET_KEY=TEST_STRIPE_LIVE_KEY)
    # @override_settings(SITE_URL=TEST_SITE_URL)
    # @patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    # @patch("stripe.ApplePayDomain.create")
    # def test_apple_domain_verification_called_when_newly_verified_and_live_mode(
    #     self, mock_applepay_domain_create, *args
    # ):
    #     stripe_account_id = "my_test_stripe_account_id"
    #     self.post_to_confirmation(stripe_account_id=stripe_account_id)
    #     # Newly confirmed accounts should register the domain with apply pay
    #     domain_from_site_url = TEST_SITE_URL.split("//")[1]
    #     mock_applepay_domain_create.assert_called_once_with(
    #         api_key=TEST_STRIPE_LIVE_KEY, domain_name=domain_from_site_url, stripe_account=stripe_account_id
    #     )
    #     self.organization.refresh_from_db()
    #     self.assertIsNotNone(self.organization.domain_apple_verified_date)

    # @override_settings(STRIPE_LIVE_MODE="False")
    # @patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    # @patch("stripe.ApplePayDomain.create")
    # def test_apple_domain_verification_not_called_when_newly_verified_and_not_live_mode(
    #     self, mock_applepay_domain_create, *args
    # ):
    #     self.post_to_confirmation(stripe_account_id="testing")
    #     # Newly confirmed accounts should not register domain with apple pay unless in live mode.
    #     mock_applepay_domain_create.assert_not_called()
    #     self.organization.refresh_from_db()
    #     self.assertIsNone(self.organization.domain_apple_verified_date)

    # @override_settings(STRIPE_LIVE_MODE="True")
    # @override_settings(SITE_URL=TEST_SITE_URL)
    # @patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    # @patch("stripe.ApplePayDomain.create", side_effect=StripeError)
    # @patch("apps.organizations.models.logger")
    # def test_apple_domain_verification_failure(self, mock_logger, mock_applepay_domain_create, *args):
    #     target_id = "testing_stripe_account_id"
    #     self.post_to_confirmation(stripe_account_id=target_id)
    #     mock_applepay_domain_create.assert_called_once()
    #     # Logger should log stripe error
    #     mock_logger.warning.assert_called_once_with(
    #         f"Failed to register ApplePayDomain for organization {self.organization.name}. StripeError: <empty message>"
    #     )
    #     # StripeError above should not prevent everything else from working properly
    #     self.organization.refresh_from_db()
    #     self.assertEqual(self.organization.stripe_account_id, target_id)


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
