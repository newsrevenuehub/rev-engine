import datetime
from zoneinfo import ZoneInfo

from django.core.management import call_command

import pytest
import reversion
import stripe

from apps.contributions.management.commands.fix_imported_contributions_with_incorrect_donation_page_value import (
    REVISION_COMMENT,
)
from apps.contributions.models import Payment
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
    PaymentFactory,
)
from apps.organizations.tests.factories import PaymentProviderFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory


@pytest.mark.django_db
def test_process_stripe_event(mocker):
    mock_processor = mocker.patch("apps.contributions.stripe_import.StripeEventProcessor")
    options = {
        "stripe_account": "acct_1",
        "event_id": "evt_1",
        "async_mode": False,
    }
    call_command("process_stripe_event", **options)

    mock_processor.assert_called_once_with(
        stripe_account_id=options["stripe_account"],
        event_id=options["event_id"],
        async_mode=options["async_mode"],
    )
    mock_processor.return_value.process.assert_called_once()


@pytest.mark.parametrize("dry_run", (False, True))
def test_sync_missing_contribution_data_from_stripe(dry_run, monkeypatch, mocker):
    mock_fix_processing = mocker.Mock()
    mock_fix_pm_details = mocker.Mock()
    mock_fix_pm_id = mocker.Mock()
    mock_fix_missing_contribution_metadata = mocker.Mock()
    monkeypatch.setattr(
        "apps.contributions.models.Contribution.fix_contributions_stuck_in_processing", mock_fix_processing
    )
    monkeypatch.setattr("apps.contributions.models.Contribution.fix_missing_provider_payment_method_id", mock_fix_pm_id)
    monkeypatch.setattr(
        "apps.contributions.models.Contribution.fix_missing_payment_method_details_data", mock_fix_pm_details
    )
    monkeypatch.setattr(
        "apps.contributions.models.Contribution.fix_missing_contribution_metadata",
        mock_fix_missing_contribution_metadata,
    )
    args = ["sync_missing_contribution_data_from_stripe"]
    if dry_run:
        args.append("--dry-run")
    call_command(*args)
    mock_fix_processing.assert_called_once_with(dry_run=dry_run)
    mock_fix_pm_id.assert_called_once_with(dry_run=dry_run)
    mock_fix_pm_details.assert_called_once_with(dry_run=dry_run)
    mock_fix_missing_contribution_metadata.assert_called_once_with(dry_run=dry_run)


@pytest.mark.django_db
class Test_sync_payment_transaction_time:

    DISCONNECTED_ACCOUNT_ID = "acct_disconnected"
    BALANCE_TRANSACTION_ID_WITH_ERROR = "txn_with_error"
    BT_CREATED_TIMESTAMP = 1610000000
    ACCOUNT_ID_WITH_PERMISSION_ERROR = "acct_with_perm_error"
    ACCOUNT_ID_WITH_OTHER_ERROR = "acct_with_other_error"
    ACCOUNT_ID = "acct_1"

    @pytest.fixture()
    def payment_with_transaction_time(self):
        return PaymentFactory(transaction_time=datetime.datetime.utcnow())

    @pytest.fixture()
    def payment_no_transaction_time_eligible(self):
        return PaymentFactory(
            transaction_time=None,
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id=self.ACCOUNT_ID,
        )

    @pytest.fixture()
    def payment_no_transaction_time_eligible_fail_with_bt_retrieval(self):
        return PaymentFactory(
            transaction_time=None,
            stripe_balance_transaction_id=self.BALANCE_TRANSACTION_ID_WITH_ERROR,
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id=self.ACCOUNT_ID,
        )

    @pytest.fixture()
    def payment_no_transaction_time_eligible_fail_with_account_retrieval_permissions_error(self):
        return PaymentFactory(
            transaction_time=None,
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id=self.ACCOUNT_ID_WITH_PERMISSION_ERROR,
        )

    @pytest.fixture()
    def payment_no_transaction_time_eligible_fail_with_account_retrieval_other_error(self):
        return PaymentFactory(
            transaction_time=None,
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id=self.ACCOUNT_ID_WITH_OTHER_ERROR,
        )

    @pytest.fixture
    def payment_no_transaction_time_ineligible_because_of_no_account(self):
        return PaymentFactory(
            transaction_time=None,
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id=None,
        )

    @pytest.fixture
    def payments_with_errors(
        self,
        payment_no_transaction_time_eligible_fail_with_account_retrieval_permissions_error,
        payment_no_transaction_time_eligible_fail_with_account_retrieval_other_error,
        payment_no_transaction_time_eligible_fail_with_bt_retrieval,
        payment_no_transaction_time_ineligible_because_of_no_account,
    ):
        return [
            payment_no_transaction_time_eligible_fail_with_account_retrieval_permissions_error,
            payment_no_transaction_time_eligible_fail_with_account_retrieval_other_error,
            payment_no_transaction_time_eligible_fail_with_bt_retrieval,
            payment_no_transaction_time_ineligible_because_of_no_account,
        ]

    @pytest.fixture(autouse=True)
    def stripe_account_retrieve(self, mocker):

        def side_effect(*args, **kwargs):
            account_id = args[0]
            match account_id:
                case self.ACCOUNT_ID_WITH_PERMISSION_ERROR:
                    raise stripe.error.PermissionError("Not allowed")
                case self.ACCOUNT_ID_WITH_OTHER_ERROR:
                    raise stripe.error.StripeError("Some other error")
                case _:
                    return mocker.Mock(id=account_id)

        mocker.patch("stripe.Account.retrieve", side_effect=side_effect)

    @pytest.fixture(autouse=True)
    def balance_transaction_retrieve(self, mocker):
        def side_effect(*args, **kwargs):
            if args[0] == self.BALANCE_TRANSACTION_ID_WITH_ERROR:
                raise stripe.error.StripeError("Some error")
            return mocker.Mock(created=self.BT_CREATED_TIMESTAMP)

        mocker.patch("stripe.BalanceTransaction.retrieve", side_effect=side_effect)

    @pytest.mark.parametrize("include_account_problem_payments", (False, True))
    def test_sync_payment_transaction_time(
        self, payment_no_transaction_time_eligible, include_account_problem_payments, payments_with_errors
    ):
        # this is here so we get test coverage for both cases in some `if` blocks in the command, to get to 100% test coverage
        if include_account_problem_payments:
            Payment.objects.filter(id__in=[p.id for p in payments_with_errors]).all().delete()
        call_command("sync_payment_transaction_time")
        payment_no_transaction_time_eligible.refresh_from_db()
        assert payment_no_transaction_time_eligible.transaction_time == datetime.datetime.fromtimestamp(
            self.BT_CREATED_TIMESTAMP, tz=ZoneInfo("UTC")
        )

    def test_sync_payment_transaction_time_when_no_eligible_payments(self, mocker):
        Payment.objects.all().delete()
        PaymentFactory(transaction_time=datetime.datetime.now(tz=ZoneInfo("UTC")))
        call_command("sync_payment_transaction_time")


@pytest.mark.django_db
class Test_import_stripe_transactions_data:

    @pytest.mark.parametrize("async_mode", (False, True))
    @pytest.mark.parametrize("for_orgs", (True, False))
    @pytest.mark.parametrize("suppress_stripe_info_logs", (True, False))
    @pytest.mark.parametrize("stripe_account_error", (False, True))
    def test_handle(self, async_mode, mocker, for_orgs, suppress_stripe_info_logs, stripe_account_error):
        provider_1 = PaymentProviderFactory()
        provider_2 = PaymentProviderFactory()
        rp_1 = RevenueProgramFactory(payment_provider=provider_1)

        mock_importer = mocker.patch(
            "apps.contributions.management.commands.import_stripe_transactions_data.StripeTransactionsImporter"
        )
        if stripe_account_error:
            mock_importer.return_value.import_contributions_and_payments.side_effect = stripe.error.PermissionError(
                "Ruh roh"
            )
        mock_task = mocker.patch(
            "apps.contributions.tasks.task_import_contributions_and_payments_for_stripe_account.delay"
        )
        call_command(
            "import_stripe_transactions_data",
            async_mode=async_mode,
            for_orgs=(
                [
                    rp_1.organization.id,
                ]
                if for_orgs
                else []
            ),
            for_stripe_accounts=[provider_2.stripe_account_id] if not for_orgs else [],
            suppress_stripe_info_logs=suppress_stripe_info_logs,
        )
        if async_mode:
            mock_task.assert_called_once()
            mock_importer.assert_not_called()
        else:
            mock_importer.assert_called_once()
            mock_task.assert_not_called()


@pytest.fixture()
def contributions():
    return ContributionFactory.create_batch(size=3, provider_payment_id=None, monthly_subscription=True)


@pytest.mark.django_db()
class Test_fix_recurring_contribution_missing_provider_payment_id:
    @pytest.fixture()
    def contribution(self):
        return ContributionFactory(provider_payment_id=None, monthly_subscription=True)

    @pytest.fixture()
    def mock_get_account_status(self, mocker, contribution):
        mocker.patch(
            # needed to mock at import because otherwise tests failed, seemingly because
            # of leaked mock state between tests in this class
            "apps.contributions.management.commands.fix_recurring_contribution_missing_provider_payment_id.get_stripe_accounts_and_their_connection_status",
            side_effect=[{contribution.stripe_account_id: True}],
        )

    @pytest.mark.usefixtures("mock_get_account_status")
    def test_happy_path(self, mocker, contribution):
        mocker.patch(
            "stripe.Subscription.retrieve",
            return_value=mocker.Mock(latest_invoice=mocker.Mock(payment_intent=(pi_id := "pi_1"))),
        )
        call_command("fix_recurring_contribution_missing_provider_payment_id")
        contribution.refresh_from_db()
        assert contribution.provider_payment_id == pi_id

    def test_when_no_target_exists(self):
        call_command("fix_recurring_contribution_missing_provider_payment_id")

    def test_when_account_is_disconnected(self, mocker, contribution):
        mocker.patch(
            # needed to mock at import because otherwise tests failed, seemingly because
            # of leaked mock state between tests in this class
            "apps.contributions.management.commands.fix_recurring_contribution_missing_provider_payment_id.get_stripe_accounts_and_their_connection_status",
            return_value={contribution.stripe_account_id: False},
        )
        call_command("fix_recurring_contribution_missing_provider_payment_id")
        contribution.refresh_from_db()
        assert contribution.provider_payment_id is None

    @pytest.mark.usefixtures("mock_get_account_status")
    def test_when_stripe_error_on_sub_retrieval(self, mocker, contribution):
        mocker.patch("stripe.Subscription.retrieve", side_effect=stripe.error.StripeError("Some error"))
        call_command("fix_recurring_contribution_missing_provider_payment_id")
        contribution.refresh_from_db()
        assert contribution.provider_payment_id is None

    @pytest.mark.usefixtures("mock_get_account_status")
    def test_when_no_pi_id_on_latest_invoice(self, mocker, contribution):
        mocker.patch(
            "stripe.Subscription.retrieve", return_value=mocker.Mock(latest_invoice=mocker.Mock(payment_intent=None))
        )
        call_command("fix_recurring_contribution_missing_provider_payment_id")
        contribution.refresh_from_db()
        assert contribution.provider_payment_id is None


def test_clear_stripe_transactions_import_cache(mocker):
    mock_clear_cache = mocker.patch(
        "apps.contributions.stripe_import.StripeTransactionsImporter.clear_all_stripe_transactions_cache"
    )
    call_command("clear_stripe_transactions_import_cache")
    mock_clear_cache.assert_called_once()


@pytest.mark.django_db()
class Test_fix_imported_contributions_with_incorrect_donation_page_value:

    @pytest.fixture()
    def rp_1(self):
        return RevenueProgramFactory()

    @pytest.fixture()
    def rp_2(self):
        return RevenueProgramFactory()

    @pytest.fixture()
    def eligible_metadata(self, rp_1):
        return {
            "agreed_to_pay_fees": True,
            "donor_selected_amount": 100,
            "revenue_program_id": str(rp_1.id),
            "revenue_program_slug": rp_1.slug,
            "source": "rev-engine",
            "schema_version": "1.5",
        }

    @pytest.fixture()
    def ineligible_metadata(self, rp_2):
        return {
            "agreed_to_pay_fees": True,
            "donor_selected_amount": 100,
            "referer": "https://something-truthy.com",
            "revenue_program_id": str(rp_2.id),
            "revenue_program_slug": rp_2.slug,
            "source": "rev-engine",
            "schema_version": "1.5",
        }

    @pytest.fixture()
    def eligible_contribution(self, rp_1, eligible_metadata):
        page = DonationPageFactory(revenue_program=rp_1)
        page.revenue_program.default_donation_page = page
        page.revenue_program.save()
        contributor = ContributorFactory()
        contribution = ContributionFactory.build(
            donation_page=page, contribution_metadata=eligible_metadata, contributor=contributor
        )
        with reversion.create_revision():
            contribution.save()
            reversion.set_comment(REVISION_COMMENT)
        return contribution

    @pytest.fixture()
    def ineligible_contribution_cause_metadata(self, rp_2, ineligible_metadata):
        page = DonationPageFactory(revenue_program=rp_2)
        page.revenue_program.default_donation_page = page
        page.revenue_program.save()
        contributor = ContributorFactory()
        contribution = ContributionFactory(
            donation_page=page, contribution_metadata=ineligible_metadata, contributor=contributor
        )
        with reversion.create_revision():
            contribution.save()
            reversion.set_comment(REVISION_COMMENT)
        return contribution

    @pytest.mark.parametrize("has_eligible", (True, False))
    def test_happy_path(self, has_eligible, eligible_contribution, ineligible_contribution_cause_metadata, rp_1):
        ineligible_modified = ineligible_contribution_cause_metadata.modified
        if not has_eligible:
            eligible_contribution.delete()
        call_command("fix_imported_contributions_with_incorrect_donation_page_value")
        if has_eligible:
            eligible_contribution.refresh_from_db()
            assert eligible_contribution._revenue_program == rp_1
            assert eligible_contribution.donation_page is None
        ineligible_contribution_cause_metadata.refresh_from_db()
        assert ineligible_contribution_cause_metadata.modified == ineligible_modified


@pytest.mark.django_db()
class Test_sync_missing_provider_payment_method_details:

    @pytest.fixture()
    def fetch_stripe_payment_method(self, mocker, payment_method):
        return mocker.patch(
            "apps.contributions.models.Contribution.fetch_stripe_payment_method", side_effect=[payment_method, None]
        )

    @pytest.fixture()
    def contribution_no_stripe_account_id(self):
        return ContributionFactory(
            provider_payment_method_id="pm_1",
            provider_payment_method_details=None,
            donation_page__revenue_program__payment_provider__stripe_account_id=None,
        )

    @pytest.fixture()
    def contributions_with_stripe_account_id(self):
        return ContributionFactory.create_batch(
            provider_payment_method_id="pm_1", provider_payment_method_details=None, size=3
        )

    @pytest.fixture()
    def contributions(self, contribution_no_stripe_account_id, contributions_with_stripe_account_id):
        return [contribution_no_stripe_account_id, *contributions_with_stripe_account_id]

    @pytest.fixture()
    @pytest.mark.parametrize()
    def get_accounts(self, mocker, contributions_with_stripe_account_id):
        mocker.patch(
            "apps.common.utils.get_stripe_accounts_and_their_connection_status",
            return_value={
                contributions_with_stripe_account_id[0].stripe_account_id: True,
                contributions_with_stripe_account_id[1].stripe_account_id: True,
                contributions_with_stripe_account_id[2].stripe_account_id: False,
            },
        )

    @pytest.mark.usefixtures("fetch_stripe_payment_method", "get_accounts", "contributions")
    def test_happy_path(self):
        call_command("sync_missing_provider_payment_method_details")

    def test_when_no_eligible_contributions(self):
        call_command("sync_missing_provider_payment_method_details")

    @pytest.fixture
    def get_accounts_none_found(self, mocker, contributions_with_stripe_account_id):
        mocker.patch(
            "apps.common.utils.get_stripe_accounts_and_their_connection_status",
            return_value={x.stripe_account_id: False for x in contributions_with_stripe_account_id},
        )

    @pytest.mark.usefixtures("contributions", "get_accounts_none_found")
    def test_when_eligible_but_no_fixable(self):
        call_command("sync_missing_provider_payment_method_details")
