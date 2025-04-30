import json
from io import StringIO
from typing import Literal
from unittest.mock import MagicMock

from django.core.management import call_command
from django.core.management.base import CommandError

import pytest
import pytest_mock
from mailchimp_marketing.api_client import ApiClientError
from stripe.error import StripeError

from apps.organizations.management.commands.migrate_mailchimp_integration import (
    BatchOperation,
    Dev5586MailchimpMigrationerror,
    MailchimpMigrator,
    MailchimpOrderLineItem,
    PartialMailchimpRecurringOrder,
    migrate_rp_mailchimp_integration,
)
from apps.organizations.models import RevenueProgram
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.organizations.typings import MailchimpProductType, MailchimpSegmentName


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
class TestDisableIntegrationCommand:

    @pytest.fixture
    def revenue_program(self, revenue_program: RevenueProgram) -> RevenueProgram:
        revenue_program.activecampaign_server_url = "test.api.com"
        revenue_program.mailchimp_server_prefix = "us1"
        revenue_program.save()
        return revenue_program

    @pytest.fixture
    def mock_gcs_provider(self, mocker: pytest_mock.MockerFixture):
        mocker.patch("apps.organizations.models.GoogleCloudSecretProvider")

    @pytest.mark.usefixtures("mock_gcs_provider")
    @pytest.mark.parametrize(
        "integrations",
        [
            ("mailchimp",),
            ("activecampaign",),
            (
                "mailchimp",
                "activecampaign",
            ),
        ],
    )
    def test_happy_path(
        self, revenue_program: RevenueProgram, mocker: pytest_mock.MockerFixture, integrations: tuple[str]
    ):
        disable_mc_spy = mocker.spy(revenue_program, "disable_mailchimp_integration")
        disable_ac_spy = mocker.spy(revenue_program, "disable_activecampaign_integration")
        mocker.patch(
            "apps.organizations.management.commands.disable_integration.RevenueProgram.objects.get",
            return_value=revenue_program,
        )
        call_command("disable_integration", slug=revenue_program.slug, integrations=integrations)
        revenue_program.refresh_from_db()
        if "mailchimp" in integrations:
            assert revenue_program.mailchimp_server_prefix is None
            assert disable_mc_spy.call_count == 1
        else:
            assert revenue_program.mailchimp_server_prefix == "us1"
            assert disable_mc_spy.call_count == 0
        if "activecampaign" in integrations:
            assert revenue_program.activecampaign_server_url is None
            assert disable_ac_spy.call_count == 1
        else:
            assert revenue_program.activecampaign_server_url == "test.api.com"
            assert disable_ac_spy.call_count == 0

    def test_nonexistent_rp(self):
        with pytest.raises(RevenueProgram.DoesNotExist, match="RevenueProgram matching query does not exist."):
            call_command("disable_integration", slug="nonexistent", integrations=["mailchimp", "activecampaign"])

    def test_requires_slug(self):
        with pytest.raises(CommandError, match="Error: the following arguments are required: --slug"):
            call_command("disable_integration", integrations=["mailchimp", "activecampaign"])

    def test_requires_integrations(self, revenue_program: RevenueProgram):
        with pytest.raises(CommandError, match="Error: the following arguments are required: --integrations"):
            call_command("disable_integration", slug=revenue_program.slug)


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
        mocker.patch(
            "apps.organizations.models.RevenueProgram.stripe_account_id",
            new_callable=mocker.PropertyMock,
            return_value="acct_id",
        )
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_client", new_callable=mocker.PropertyMock)
        mock_store = mocker.MagicMock(id="mc_store_id")
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_store",
            new_callable=mocker.PropertyMock(id="mc_store_id"),
            return_value=mock_store,
        )
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
    def test_get_update_order_batch_op_happy_path(
        self,
        mc_ready_rp: RevenueProgram,
        interval: Literal["month", "year"],
    ):
        order = PartialMailchimpRecurringOrder(
            id="order_id",
            lines=[
                MailchimpOrderLineItem(
                    id="line_id",
                    product_id="product_id",
                    product_variant_id="variant_id",
                    quantity=1,
                    price=10,
                    discount=0,
                )
            ],
        )
        batch_op = MailchimpMigrator(
            rp_id=mc_ready_rp.id, mc_batch_size=100, mc_results_per_page=100
        ).get_update_order_batch_op(interval=interval, order=order)
        product = MailchimpProductType.MONTHLY if interval == "month" else MailchimpProductType.YEARLY
        new_id = product.as_mailchimp_product_id(mc_ready_rp.id)
        assert batch_op == BatchOperation(
            method="PATCH",
            path=f"/ecommerce/stores/{mc_ready_rp.mailchimp_store.id}/orders/{order['id']}/lines/{order['lines'][0]['id']}",
            body=json.dumps({"product_id": new_id, "product_variant_id": new_id}),
        )

    @pytest.mark.parametrize("num_lines", [0, 2])
    def test_get_update_order_batch_op_when_order_not_have_1_line(self, mc_ready_rp: RevenueProgram, num_lines: int):
        lines = [
            MailchimpOrderLineItem(
                id=f"line_id_{i}",
                product_id=f"product_id_{i}",
                product_variant_id=f"variant_id_{i}",
                quantity=1,
                price=10,
                discount=0,
            )
            for i in range(num_lines)
        ]
        order = PartialMailchimpRecurringOrder(
            id="order_id",
            lines=lines,
        )
        assert (
            MailchimpMigrator(
                rp_id=mc_ready_rp.id, mc_batch_size=100, mc_results_per_page=100
            ).get_update_order_batch_op(interval="month", order=order)
            is None
        )

    def test_get_update_order_batch_op_when_already_migrated(
        self,
        mc_ready_rp: RevenueProgram,
    ):
        new_id = MailchimpProductType.MONTHLY.as_mailchimp_product_id(mc_ready_rp.id)
        order = PartialMailchimpRecurringOrder(
            id="order_id",
            lines=[
                MailchimpOrderLineItem(
                    id="line_id",
                    product_id=new_id,
                    product_variant_id=new_id,
                    quantity=1,
                    price=10,
                    discount=0,
                )
            ],
        )
        assert (
            MailchimpMigrator(
                rp_id=mc_ready_rp.id, mc_batch_size=100, mc_results_per_page=100
            ).get_update_order_batch_op(interval="month", order=order)
            is None
        )

    def test_ensure_mailchimp_monthly_and_yearly_products_happy_path(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        mock_ensure_product = mocker.patch(
            "apps.organizations.models.RevenueProgram.ensure_mailchimp_contribution_product"
        )
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_client.get_product",
            # first two calls are for monthly and yearly products before created, second two are for calls after
            side_effect=[None, None, mocker.MagicMock(), mocker.MagicMock()],
        )
        migrator = MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        )
        migrator.ensure_mailchimp_monthly_and_yearly_products()
        mock_ensure_product.assert_has_calls(
            [
                mocker.call(MailchimpProductType.MONTHLY),
                mocker.call(MailchimpProductType.YEARLY),
            ]
        )

    def test_ensure_mailchimp_monthly_and_yearly_products_already_exist(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        mock_ensure_product = mocker.patch(
            "apps.organizations.models.RevenueProgram.ensure_mailchimp_contribution_product"
        )
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_client.get_product",
            return_value=mocker.MagicMock(),
        )
        migrator = MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        )
        migrator.ensure_mailchimp_monthly_and_yearly_products()
        mock_ensure_product.assert_not_called()

    def test_ensure_mailchimp_monthly_and_yearly_products_when_not_exist_after_creation(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        mock_ensure_product = mocker.patch(
            "apps.organizations.models.RevenueProgram.ensure_mailchimp_contribution_product"
        )
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_client.get_product",
            # first two calls are for monthly and yearly products before created, third call is for monthly product after
            # created, simulating edge case where for some reason it's not found.
            side_effect=[None, None, None],
        )
        migrator = MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        )
        with pytest.raises(
            Dev5586MailchimpMigrationerror,
            match=(
                f"Failed to create Mailchimp product type {MailchimpProductType.MONTHLY} for revenue program ID "
                f"{mc_ready_rp.id}"
            ),
        ):
            migrator.ensure_mailchimp_monthly_and_yearly_products()
        mock_ensure_product.assert_called_once_with(MailchimpProductType.MONTHLY)

    def test_ensure_monthly_and_yearly_mailchimp_segments_happy_path(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_client.get_product",
            return_value=mocker.MagicMock(),
        )
        mock_ensure_segment = mocker.patch(
            "apps.organizations.models.RevenueProgram.ensure_mailchimp_contributor_segment"
        )
        MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        ).ensure_monthly_and_yearly_mailchimp_segments()
        mock_ensure_segment.assert_has_calls(
            (
                mocker.call(MailchimpSegmentName.MONTHLY_CONTRIBUTORS),
                mocker.call(MailchimpSegmentName.YEARLY_CONTRIBUTORS),
            )
        )

    def test_ensure_monthly_and_yearly_mailchimp_segments_when_missing_product(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_client.get_product",
            return_value=None,
        )
        mock_ensure_segment = mocker.patch(
            "apps.organizations.models.RevenueProgram.ensure_mailchimp_contributor_segment"
        )
        with pytest.raises(
            Dev5586MailchimpMigrationerror,
            match=f"Revenue program with ID {mc_ready_rp.id} does not have monthly and yearly Mailchimp product types",
        ):
            MailchimpMigrator(
                rp_id=mc_ready_rp.id,
                mc_batch_size=100,
                mc_results_per_page=100,
            ).ensure_monthly_and_yearly_mailchimp_segments()

        mock_ensure_segment.assert_not_called()

    def test_ensure_monthly_and_yearly_mailchimp_segments_when_already_exist(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_client.get_product", return_value=mocker.Mock()
        )
        mc_ready_rp.mailchimp_monthly_contributors_segment_id = "segment_id"
        mc_ready_rp.mailchimp_yearly_contributors_segment_id = "segment_id"
        mc_ready_rp.save()
        mock_ensure_segment = mocker.patch(
            "apps.organizations.models.RevenueProgram.ensure_mailchimp_contributor_segment"
        )
        MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        ).ensure_monthly_and_yearly_mailchimp_segments()
        mock_ensure_segment.assert_not_called()

    def test_ensure_mailchimp_recurring_segment_criteria_happy_path(
        self, mocker: pytest_mock.MockerFixture, mc_ready_rp: RevenueProgram
    ):
        mc_ready_rp.mailchimp_recurring_contributors_segment_id = "segment_id"
        mc_ready_rp.save()
        mock_segment = mocker.MagicMock(
            list_id="list_id",
            options={
                "match": "old",
                "conditions": [],
            },
        )
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_recurring_contributors_segment",
            return_value=mock_segment,
            new_callable=mocker.PropertyMock,
        )
        mock_update_segment = mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_client.lists.update_segment"
        )
        MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        ).ensure_mailchimp_recurring_segment_criteria()
        mock_update_segment.assert_called_once_with(
            mock_segment.list_id,
            mc_ready_rp.mailchimp_recurring_contributors_segment_id,
            {"options": MailchimpSegmentName.RECURRING_CONTRIBUTORS.get_segment_options()},
        )

    def test_ensure_mailchimp_recurring_segment_criteria_when_segment_missing(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_recurring_contributors_segment",
            return_value=None,
            new_callable=mocker.PropertyMock,
        )
        mock_update_segment = mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_client.lists.update_segment"
        )
        with pytest.raises(
            Dev5586MailchimpMigrationerror,
            match=f"Revenue program with ID {mc_ready_rp.id} does not have recurring contributors segment",
        ):
            MailchimpMigrator(
                rp_id=mc_ready_rp.id,
                mc_batch_size=100,
                mc_results_per_page=100,
            ).ensure_mailchimp_recurring_segment_criteria()
        mock_update_segment.assert_not_called()

    def test_ensure_mailchimp_recurring_segment_criteria_when_already_updated(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        mock_segment = mocker.MagicMock(
            list_id="list_id", options=MailchimpSegmentName.RECURRING_CONTRIBUTORS.get_segment_options()
        )
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_recurring_contributors_segment",
            return_value=mock_segment,
            new_callable=mocker.PropertyMock,
        )
        mock_update_segment = mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_client.lists.update_segment"
        )
        MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        ).ensure_mailchimp_recurring_segment_criteria()
        mock_update_segment.assert_not_called()

    def test_ensure_mailchimp_recurring_segment_criteria_when_error_updating(
        self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture
    ):
        mc_ready_rp.mailchimp_recurring_contributors_segment_id = "segment_id"
        mc_ready_rp.save()
        mock_segment = mocker.MagicMock(
            list_id="list_id",
            options={
                "match": "old",
                "conditions": [],
            },
        )
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_recurring_contributors_segment",
            return_value=mock_segment,
            new_callable=mocker.PropertyMock,
        )
        mock_update_segment = mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_client.lists.update_segment",
            side_effect=ApiClientError("Test error"),
        )
        with pytest.raises(
            Dev5586MailchimpMigrationerror,
            match=(
                f"Failed to update membership criteria for recurring contributors "
                f"segment for revenue program ID {mc_ready_rp.id}"
            ),
        ):
            MailchimpMigrator(
                rp_id=mc_ready_rp.id,
                mc_batch_size=100,
                mc_results_per_page=100,
            ).ensure_mailchimp_recurring_segment_criteria()
        mock_update_segment.assert_called_once()

    def test__get_all_orders_happy_path(self, mocker: pytest_mock.MockerFixture, mc_ready_rp: RevenueProgram):
        migrator = MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        )
        mocker.patch.object(
            migrator.mc_client.ecommerce,
            "get_store_orders",
            side_effect=[
                {
                    "orders": [
                        {"id": "order_id", "lines": [{"product_id": "product_id"}]},
                    ],
                    "total_items": 2,
                },
                {
                    "orders": [
                        {"id": "order_id_2", "lines": [{"product_id": "product_id"}]},
                    ],
                    "total_items": 2,
                },
            ],
        )
        migrator._get_all_orders()

    def test__get_all_orders_when_api_error(self, mocker: pytest_mock.MockerFixture, mc_ready_rp: RevenueProgram):
        migrator = MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        )
        mocker.patch.object(
            migrator.mc_client.ecommerce,
            "get_store_orders",
            side_effect=ApiClientError("Test error"),
        )

        with pytest.raises(
            Dev5586MailchimpMigrationerror,
            match="Failed to retrieve orders for store ID",
        ):
            migrator._get_all_orders()

    def test__get_updateable_orders(self, mocker: pytest_mock.MockerFixture, mc_ready_rp: RevenueProgram):
        mocker.patch(
            "apps.organizations.management.commands.migrate_mailchimp_integration.MailchimpMigrator._get_all_orders",
            return_value=[
                (
                    found := {
                        "id": "in_1",
                        "lines": [
                            {"product_id": MailchimpProductType.RECURRING.as_mailchimp_product_id(mc_ready_rp.id)}
                        ],
                    }
                ),
                {"id": "in_2", "lines": []},
                {"id": "in_3", "lines": [{"product_id": "unexpected"}]},
            ],
        )
        assert MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        )._get_updateable_orders() == [found]

    def test_get_update_mailchimp_order_line_item_batches_happy_path(
        self, mocker: pytest_mock.MockerFixture, mc_ready_rp: RevenueProgram
    ):
        mocker.patch(
            "apps.organizations.management.commands.migrate_mailchimp_integration.MailchimpMigrator._get_updateable_orders",
            return_value=[{"id": "1"}, {"id": "2"}, {"id": "3"}],
        )
        mocker.patch(
            "apps.organizations.management.commands.migrate_mailchimp_integration.MailchimpMigrator.get_subscription_interval_for_order",
            side_effect=["month", "month", None],
        )
        mocker.patch(
            "apps.organizations.management.commands.migrate_mailchimp_integration.MailchimpMigrator.get_update_order_batch_op",
            side_effect=["something", None],
        )
        MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=1,
            mc_results_per_page=100,
        ).get_update_mailchimp_order_line_item_batches()

    @pytest.mark.parametrize("num_batches", [0, 1, 2])
    def test_update_mailchimp_order_line_items_for_rp_happy_path(
        self, mocker: pytest_mock.MockerFixture, mc_ready_rp: RevenueProgram, num_batches: int
    ):
        mocker.patch(
            "apps.organizations.management.commands.migrate_mailchimp_integration.MailchimpMigrator.monitor_batch_status"
        )
        mocker.patch(
            "apps.organizations.management.commands.migrate_mailchimp_integration.MailchimpMigrator.get_update_mailchimp_order_line_item_batches",
            return_value=[mocker.Mock() for _ in range(num_batches)],
        )
        migrator = MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=1,
            mc_results_per_page=100,
        )
        mocker.patch.object(migrator.mc_client.batches, "start", return_value={"id": "batch_id"})
        migrator.update_mailchimp_order_line_items_for_rp(sleep_time=0)

    def test_monitor_batch_status_happy_path(self, mocker: pytest_mock.MockerFixture, mc_ready_rp: RevenueProgram):
        migrator = MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        )
        mock_status = {
            "status": "pending",
            "finished_operations": 0,
            "total_operations": 2,
            "errored_operations": 0,
        }
        mocker.patch.object(
            migrator.mc_client.batches,
            "status",
            side_effect=[
                mock_status,
                {**mock_status, "status": "finished", "response_body_url": "url"},
            ],
        )
        assert (
            MailchimpMigrator(
                rp_id=mc_ready_rp.id,
                mc_batch_size=100,
                mc_results_per_page=100,
            ).monitor_batch_status(status_id := "batch_id", interval=1)
            == "finished"
        )
        migrator.mc_client.batches.status.assert_has_calls(
            [
                mocker.call(status_id),
                mocker.call(status_id),
            ]
        )

    def test_monitor_batch_status_when_api_error(self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture):
        migrator = MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        )
        mocker.patch.object(migrator.mc_client.batches, "status", side_effect=ApiClientError("Test error"))
        assert (
            MailchimpMigrator(
                rp_id=mc_ready_rp.id,
                mc_batch_size=100,
                mc_results_per_page=100,
            ).monitor_batch_status("batch_id", interval=1)
            == "error"
        )

    def test_monitor_batch_status_when_canceled(self, mc_ready_rp: RevenueProgram, mocker: pytest_mock.MockerFixture):
        migrator = MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        )
        mock_status = {
            "status": "canceled",
            "finished_operations": 0,
            "total_operations": 2,
            "errored_operations": 0,
        }
        mocker.patch.object(
            migrator.mc_client.batches,
            "status",
            return_value=mock_status,
        )
        assert (
            MailchimpMigrator(
                rp_id=mc_ready_rp.id,
                mc_batch_size=100,
                mc_results_per_page=100,
            ).monitor_batch_status("batch_id", interval=1)
            == "canceled"
        )

    def test_monitor_batch_status_when_timeout(self, mocker: pytest_mock.MockerFixture, mc_ready_rp: RevenueProgram):
        migrator = MailchimpMigrator(
            rp_id=mc_ready_rp.id,
            mc_batch_size=100,
            mc_results_per_page=100,
        )
        mock_status = {
            "status": "pending",
            "finished_operations": 0,
            "total_operations": 2,
            "errored_operations": 0,
        }
        mocker.patch.object(
            migrator.mc_client.batches,
            "status",
            return_value=mock_status,
        )
        assert (
            MailchimpMigrator(
                rp_id=mc_ready_rp.id,
                mc_batch_size=100,
                mc_results_per_page=100,
            ).monitor_batch_status("batch_id", interval=1, timeout=1)
            == "timeout"
        )
