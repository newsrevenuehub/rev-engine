from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError

import pytest

from apps.organizations.models import RevenueProgram
from apps.organizations.tests.factories import RevenueProgramFactory


TEST_LIVE_KEY = "live-key-test"
TEST_DOMAIN_APEX = "testing.com"


@pytest.fixture(autouse=True)
def defaults(settings):
    settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS = TEST_LIVE_KEY
    settings.DOMAIN_APEX = TEST_DOMAIN_APEX
    settings.STRIPE_LIVE_MODE = True


@pytest.mark.django_db
class TestAppleDomainVerifyCommandTest:
    def run_command(self, slug=None):
        out = StringIO()
        call_command("appledomainverify", slug=slug, stdout=out)
        return out.getvalue()

    def test_fails_with_helful_message_when_missing_slug_argument(self):
        with pytest.raises(CommandError) as command_error:
            self.run_command()
        assert command_error.value.args[0] == 'Missing required argument "slug, -s, --slug"'

    def test_fails_with_helpful_message_when_not_live_mode(self, settings):
        settings.STRIPE_LIVE_MODE = False
        rp = RevenueProgramFactory()
        with pytest.raises(CommandError) as command_error:
            self.run_command(slug=rp.slug)
        assert command_error.value.args[0] == "This command can only be run when STRIPE_LIVE_MODE is true"

    def test_helpful_error_when_no_rev_program(self):
        assert RevenueProgram.objects.count() == 0
        with pytest.raises(RevenueProgram.DoesNotExist):
            self.run_command(slug="no-such-slug")

    def test_success_messages_when_success(self, mocker):
        rp = RevenueProgramFactory()
        mocker.patch("stripe.ApplePayDomain.create")
        expected_domain = f"{rp.slug}.{TEST_DOMAIN_APEX}"
        stdout = self.run_command(slug=rp.slug)
        assert "success" in stdout.lower()
        assert expected_domain in stdout
        assert rp.name in stdout

    def test_stripe_apple_pay_domain_verify_called(self, mocker):
        mock_applepay_verify = mocker.patch("stripe.ApplePayDomain.create")
        rp = RevenueProgramFactory()
        expected_domain = f"{rp.slug}.{TEST_DOMAIN_APEX}"
        self.run_command(slug=rp.slug)
        mock_applepay_verify.assert_called_with(
            api_key=TEST_LIVE_KEY,
            domain_name=expected_domain,
            stripe_account=rp.payment_provider.stripe_account_id,
        )
