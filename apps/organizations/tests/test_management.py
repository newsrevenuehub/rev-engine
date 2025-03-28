from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError

import pytest
import pytest_mock

from apps.organizations.management.commands.migrate_mailchimp_integration import (
    Dev5586MailchimpMigrationerror,
    MailchimpMigrator,
    migrate_rp_mailchimp_integration,
)
from apps.organizations.models import RevenueProgram
from apps.organizations.tests.factories import RevenueProgramFactory


TEST_LIVE_KEY = "live-key-test"
TEST_DOMAIN_APEX = "testing.com"


@pytest.fixture(autouse=True)
def _defaults(settings):
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


@pytest.mark.django_db
class TestDisableMailchimpIntegrationCommand:
    def test_happy_path(self, revenue_program: RevenueProgram, mocker: pytest_mock.MockerFixture):
        mock_disable = mocker.patch("apps.organizations.models.RevenueProgram.disable_mailchimp_integration")
        call_command("disable_mailchimp_integration", slug=revenue_program.slug)
        mock_disable.assert_called_once()

    def test_nonexistent_rp(self, mocker: pytest_mock.MockerFixture):
        mock_disable = mocker.patch("apps.organizations.models.RevenueProgram.disable_mailchimp_integration")
        with pytest.raises(RevenueProgram.DoesNotExist):
            call_command("disable_mailchimp_integration", slug="nonexistent")
        mock_disable.assert_not_called()

    def test_requires_slug(self, mocker: pytest_mock.MockerFixture):
        mock_disable = mocker.patch("apps.organizations.models.RevenueProgram.disable_mailchimp_integration")
        with pytest.raises(CommandError):
            call_command("disable_mailchimp_integration")
        mock_disable.assert_not_called()


def test_migrate_mailchimp_integration_management_command(mocker):
    mock_migrate_fn = mocker.patch(
        "apps.organizations.management.commands.migrate_mailchimp_integration.migrate_rp_mailchimp_integration"
    )
    rp_ids = [1, 2, 3]
    call_command(
        "migrate_mailchimp_integration",
        ",".join(map(str, rp_ids)),
        mc_page_count=(pg_count := 100),
        mc_batch_size=(batch_size := 100),
    )
    mock_migrate_fn.assert_has_calls((mocker.call(x, pg_count, batch_size) for x in rp_ids), any_order=True)


@pytest.mark.django_db
@pytest.mark.parametrize("raise_error", [True, False])
def test_migrate_rp_mailchimp_integration(
    mocker: pytest_mock.MockerFixture, mc_connected_rp: RevenueProgram, raise_error: bool
):
    mock_migrator = mocker.patch(
        "apps.organizations.management.commands.migrate_mailchimp_integration.MailchimpMigrator"
    )
    batch_size = results_per_page = 100
    if raise_error:
        mock_logger = mocker.patch(
            "apps.organizations.management.commands.migrate_mailchimp_integration.logger.exception"
        )
        mock_migrator.return_value.ensure_mailchimp_monthly_and_yearly_products.side_effect = (
            Dev5586MailchimpMigrationerror(msg := "Test error")
        )
        with pytest.raises(Dev5586MailchimpMigrationerror, match=msg):
            migrate_rp_mailchimp_integration(
                mc_connected_rp.id, mc_batch_size=batch_size, mc_results_per_page=results_per_page
            )
        mock_logger.assert_called_once_with("Migration for revenue program with ID %s failed", mocker.ANY)
    else:
        migrate_rp_mailchimp_integration(
            mc_connected_rp.id, mc_batch_size=batch_size, mc_results_per_page=results_per_page
        )
        for method in (
            "ensure_mailchimp_monthly_and_yearly_products",
            "ensure_monthly_and_yearly_mailchimp_segments",
            "ensure_mailchimp_recurring_segment_criteria",
            "update_mailchimp_order_line_items_for_rp",
        ):
            getattr(mock_migrator.return_value, method).assert_called_once()
    mock_migrator.assert_called_once_with(
        rp_id=mc_connected_rp.id,
        mc_batch_size=batch_size,
        mc_results_per_page=results_per_page,
    )
    mock_migrator.return_value.get_stripe_data.assert_called_once()
    mock_migrator.return_value.stripe_importer.clear_all_stripe_transactions_cache.assert_called_once()


@pytest.mark.django_db
class TestMailchimpMigrator:

    @pytest.mark.parametrize("rp_exists", [True, False])
    def test_init(self, rp_exists: bool, mc_connected_rp: RevenueProgram, mocker: pytest_mock.MockerFixture):
        rp_id = mc_connected_rp.id if rp_exists else 999999999
        batch_size = results_per_page = 100
        if rp_exists:
            mock_mc_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
            mock_stripe_importer = mocker.patch(
                "apps.organizations.management.commands.migrate_mailchimp_integration.StripeTransactionsImporter"
            )
            migrator = MailchimpMigrator(
                rp_id=rp_id,
                mc_batch_size=batch_size,
                mc_results_per_page=results_per_page,
            )
            assert migrator.rp == mc_connected_rp
            assert migrator.mc_batch_size == batch_size
            assert migrator.mc_results_per_page == results_per_page
            assert migrator.mc_client == mock_mc_client.return_value
            assert migrator.mc_store == mock_mc_client.return_value.get_store.return_value
            assert migrator.stripe_importer == mock_stripe_importer.return_value
        else:
            with pytest.raises(Dev5586MailchimpMigrationerror, match=f"Revenue program with ID {rp_id} does not exist"):
                migrator = MailchimpMigrator(
                    rp_id=rp_id,
                    mc_batch_size=batch_size,
                    mc_results_per_page=results_per_page,
                )

    def test_validate_rp_happy_path(self, mocker: pytest_mock.MockerFixture):
        mock_rp = mocker.MagicMock()
        mock_rp.mailchimp_integration_ready = True
        mock_rp.stripe_account_id = "acct_id"
        mocker.patch("apps.organizations.models.RevenueProgram.objects.get", return_value=mock_rp)
        MailchimpMigrator(
            rp_id=1,
            mc_batch_size=100,
            mc_results_per_page=100,
        ).validate_rp()

    def test_validate_rp_when_not_mc_integration_ready(self, mocker: pytest_mock.MockerFixture):
        mock_rp = mocker.MagicMock()
        mock_rp.mailchimp_integration_ready = False
        mocker.patch("apps.organizations.models.RevenueProgram.objects.get", return_value=mock_rp)
        rp_id = 1
        with pytest.raises(
            Dev5586MailchimpMigrationerror,
            match=f"Revenue program with ID {rp_id} does not have Mailchimp integration connected",
        ):
            MailchimpMigrator(
                rp_id=1,
                mc_batch_size=100,
                mc_results_per_page=100,
            ).validate_rp()

    def test_validate_rp_when_not_stripe_account_id(self, mocker: pytest_mock.MockerFixture):
        mock_rp = mocker.MagicMock()
        mock_rp.mailchimp_integration_ready = True
        mock_rp.stripe_account_id = None
        mocker.patch("apps.organizations.models.RevenueProgram.objects.get", return_value=mock_rp)
        rp_id = 1
        with pytest.raises(
            Dev5586MailchimpMigrationerror,
            match=f"Revenue program with ID {rp_id} does not have a Stripe account ID",
        ):
            MailchimpMigrator(
                rp_id=1,
                mc_batch_size=100,
                mc_results_per_page=100,
            ).validate_rp()
