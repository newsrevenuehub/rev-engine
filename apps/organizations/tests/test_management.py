from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from apps.organizations.models import RevenueProgram
from apps.organizations.tests.factories import RevenueProgramFactory


TEST_LIVE_KEY = "live-key-test"
TEST_DOMAIN_APEX = "testing.com"


@override_settings(STRIPE_LIVE_SECRET_KEY=TEST_LIVE_KEY)
@override_settings(STRIPE_LIVE_MODE=True)
class AppleDomainVerifyCommandTest(TestCase):
    def setUp(self):
        self.revenue_program = RevenueProgramFactory()

    def run_command(self, slug=None):
        out = StringIO()
        call_command("appledomainverify", slug=slug, stdout=out)
        return out.getvalue()

    def test_fails_with_helful_message_when_missing_slug_argument(self):
        with self.assertRaises(CommandError) as command_error:
            self.run_command()
        self.assertEqual(str(command_error.exception), 'Missing required argument "slug, -s, --slug"')

    @override_settings(STRIPE_LIVE_MODE=False)
    def test_fails_with_helpful_message_when_not_live_mode(self):
        with self.assertRaises(CommandError) as command_error:
            self.run_command(slug=self.revenue_program.slug)
        self.assertEqual(str(command_error.exception), "This command can only be run when STRIPE_LIVE_MODE is true")

    def test_helpful_error_when_no_rev_program(self):
        self.assertRaises(RevenueProgram.DoesNotExist, self.run_command, slug="no-such-slug")

    @override_settings(DOMAIN_APEX=TEST_DOMAIN_APEX)
    @patch("stripe.ApplePayDomain.create")
    def test_success_messages_when_success(self, _):
        expected_domain = f"{self.revenue_program.slug}.{TEST_DOMAIN_APEX}"
        stdout = self.run_command(slug=self.revenue_program.slug)
        self.assertIn("success", stdout.lower())
        self.assertIn(expected_domain, stdout)
        self.assertIn(self.revenue_program.name, stdout)

    @override_settings(DOMAIN_APEX=TEST_DOMAIN_APEX)
    @patch("stripe.ApplePayDomain.create")
    def test_stripe_apple_pay_domain_verify_called(self, mock_applepay_verify):
        expected_domain = f"{self.revenue_program.slug}.{TEST_DOMAIN_APEX}"
        self.run_command(slug=self.revenue_program.slug)
        mock_applepay_verify.assert_called_with(
            api_key=TEST_LIVE_KEY,
            domain_name=expected_domain,
            stripe_account=self.revenue_program.payment_provider.stripe_account_id,
        )
