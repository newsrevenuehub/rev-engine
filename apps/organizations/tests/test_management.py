from io import StringIO
from unittest.mock import MagicMock

from django.core.management import call_command
from django.core.management.base import CommandError

import pytest
import pytest_mock
from stripe.error import StripeError

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

    @pytest.fixture
    def mc_ready_rp(self, mc_connected_rp: RevenueProgram, mocker: pytest_mock.MockerFixture) -> RevenueProgram:
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_integration_ready", return_value=mc_connected_rp
        )
        # this approach is needed to avodi
        # AttributeError: can't delete attribute 'stripe_account_id'
        mocker.patch(
            "apps.organizations.models.RevenueProgram.stripe_account_id",
            new_callable=mocker.PropertyMock,
            return_value="acct_id",
        )
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_client", new_callable=mocker.PropertyMock)
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_store", new_callable=mocker.PropertyMock)
        return mc_connected_rp

    @pytest.fixture
    def mock_stripe_importer(self, mocker: pytest_mock.MockerFixture) -> MagicMock:
        instance = mocker.MagicMock()
        mocker.patch(
            "apps.organizations.management.commands.migrate_mailchimp_integration.StripeTransactionsImporter",
            return_value=instance,
        )
        return instance

    @pytest.mark.parametrize("has_error", [True, False])
    def test_get_stripe_data(
        self,
        has_error: bool,
        mc_ready_rp: RevenueProgram,
        mock_stripe_importer: MagicMock,
    ):
        if has_error:
            mock_stripe_importer.list_and_cache_stripe_resources_for_recurring_contributions.side_effect = StripeError(
                "Test error"
            )
            with pytest.raises(
                Dev5586MailchimpMigrationerror,
                match=f"Failed to retrieve invoices from Stripe for revenue program with ID {mc_ready_rp.id}",
            ):
                MailchimpMigrator(rp_id=mc_ready_rp.id, mc_batch_size=100, mc_results_per_page=100).get_stripe_data()

        else:
            MailchimpMigrator(rp_id=mc_ready_rp.id, mc_batch_size=100, mc_results_per_page=100).get_stripe_data()

    @pytest.mark.parametrize("interval", ["month", "year", "unexpected"])
    def test_get_subscription_interval_for_order(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture, interval: str
    ):
        migrator = MailchimpMigrator(rp_id=mc_ready_rp.id, mc_batch_size=100, mc_results_per_page=100)
        mock_invoice = {"subscription": "sub_id", "id": "in_123"}
        mock_subscription = {"plan": {"interval": interval}, "id": "sub_id"}
        mocker.patch.object(
            migrator.stripe_importer,
            "get_resource_from_cache",
            side_effect=[
                mock_invoice,
                mock_subscription,
            ],
        )
        assert migrator.get_subscription_interval_for_order("order_id") == (
            interval if interval in ["month", "year"] else None
        )

    def test_get_subscription_interval_for_order_when_invoice_not_found(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        migrator = MailchimpMigrator(rp_id=mc_ready_rp.id, mc_batch_size=100, mc_results_per_page=100)
        mocker.patch.object(migrator.stripe_importer, "get_resource_from_cache", return_value=None)
        assert migrator.get_subscription_interval_for_order("order_id") is None

    def test_get_subscription_interval_for_order_when_sub_id_not_found(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        migrator = MailchimpMigrator(rp_id=mc_ready_rp.id, mc_batch_size=100, mc_results_per_page=100)
        mock_invoice = {"id": "in_123"}
        mocker.patch.object(
            migrator.stripe_importer,
            "get_resource_from_cache",
            return_value=mock_invoice,
        )
        assert migrator.get_subscription_interval_for_order("order_id") is None

    def test_get_subscription_interval_for_order_when_sub_not_found(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        migrator = MailchimpMigrator(rp_id=mc_ready_rp.id, mc_batch_size=100, mc_results_per_page=100)
        mock_invoice = {"id": "in_123", "subscription": "sub_id"}
        mocker.patch.object(
            migrator.stripe_importer,
            "get_resource_from_cache",
            side_effect=[mock_invoice, None],
        )
        assert migrator.get_subscription_interval_for_order("order_id") is None

    def test_get_subscription_interval_for_order_when_sub_not_have_plan(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        migrator = MailchimpMigrator(rp_id=mc_ready_rp.id, mc_batch_size=100, mc_results_per_page=100)
        mock_invoice = {"subscription": "sub_id", "id": "in_123"}
        mock_subscription = {"id": "sub_id"}
        mocker.patch.object(
            migrator.stripe_importer,
            "get_resource_from_cache",
            side_effect=[
                mock_invoice,
                mock_subscription,
            ],
        )
        assert migrator.get_subscription_interval_for_order("order_id") is None

    @pytest.mark.parametrize("interval", ["month", "year"])
    def test_get_update_order_batch_op_happy_path(self, interval: str, mocker: pytest_mock.MockerFixture):
        pass

    def test_get_update_order_batch_op_when_order_not_have_1_line(self):
        pass

    def test_ensure_mailchimp_monthly_and_yearly_products_happy_path(self):
        pass

    def test_ensure_mailchimp_monthly_and_yearly_products_already_exist(self):
        pass

    def test_ensure_mailchimp_monthly_and_yearly_products_not_exist_after_creation(self):
        pass

    def test_ensure_monthly_and_yearly_mailchimp_segments_happy_path(self):
        pass

    def test_ensure_monthly_and_yearly_mailchimp_segments_when_missing_product(self):
        pass

    def test_ensure_monthly_and_yearly_mailchimp_segments_when_already_exist(self):
        pass

    def test_ensure_mailchimp_recurring_segment_criteria_happy_path(self, mocker: pytest_mock.MockerFixture):
        pass

    def test_ensure_mailchimp_recurring_segment_criteria_when_segment_missing(self, mocker: pytest_mock.MockerFixture):
        pass

    def test_ensure_mailchimp_recurring_segment_criteria_when_already_updated(self, mocker: pytest_mock.MockerFixture):
        pass

    def test_ensure_mailchimp_recurring_segment_criteria_when_error_updating(self, mocker: pytest_mock.MockerFixture):
        pass

    def test__get_all_orders_happy_path(self, mocker: pytest_mock.MockerFixture):
        pass

    def test__get_all_orders_when_api_error(self, mocker: pytest_mock.MockerFixture):
        pass

    def _get_updateable_orders(self, mocker: pytest_mock.MockerFixture):
        pass

    def test_get_update_mailchimp_order_line_item_batches_happy_path(self, mocker: pytest_mock.MockerFixture):
        pass

    def test_get_update_mailchimp_order_line_item_batches_when_interval_not_found(
        self, mocker: pytest_mock.MockerFixture
    ):
        pass

    def test_get_update_mailchimp_order_line_item_batches_when_batch_is_none(self, mocker: pytest_mock.MockerFixture):
        pass

    def test_update_mailchimp_order_line_items_for_rp_happy_path(self, mocker: pytest_mock.MockerFixture):
        pass

    def test_update_mailchimp_order_line_items_for_rp_when_no_batches(self, mocker: pytest_mock.MockerFixture):
        pass

    def test_monitor_batch_status_happy_path(self):
        pass

    def test_monitor_batch_status_when_api_error(self):
        pass

    def test_monitor_batch_status_when_timeout(self):
        pass
