import datetime
from zoneinfo import ZoneInfo

from django.core.management import call_command

import pytest
import stripe

from apps.contributions.models import Payment
from apps.contributions.tests.factories import PaymentFactory
from apps.organizations.tests.factories import PaymentProviderFactory, RevenueProgramFactory


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
    def payment_no_transaction_time_ineligible_because_no_page(self):
        return PaymentFactory(
            transaction_time=None, contribution__donation_page=None, contribution__contribution_metadata=None
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
        payment_no_transaction_time_ineligible_because_no_page,
        payment_no_transaction_time_ineligible_because_of_no_account,
    ):
        return [
            payment_no_transaction_time_eligible_fail_with_account_retrieval_permissions_error,
            payment_no_transaction_time_eligible_fail_with_account_retrieval_other_error,
            payment_no_transaction_time_eligible_fail_with_bt_retrieval,
            payment_no_transaction_time_ineligible_because_no_page,
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
    def test_handle(self, async_mode, mocker, for_orgs):
        provider_1 = PaymentProviderFactory()
        provider_2 = PaymentProviderFactory()
        rp_1 = RevenueProgramFactory(payment_provider=provider_1)
        mock_importer = mocker.patch(
            "apps.contributions.management.commands.import_stripe_transactions_data.StripeTransactionsImporter"
        )

        mock_task = mocker.patch(
            "apps.contributions.tasks.task_import_contributions_and_payments_for_stripe_account.delay"
        )
        call_command(
            "import_stripe_transactions_data",
            async_mode=async_mode,
            for_orgs=[rp_1.organization.id] if for_orgs else [],
            for_stripe_accounts=[provider_2.stripe_account_id] if not for_orgs else [],
        )
        if async_mode:
            mock_task.assert_called_once()
            mock_importer.assert_not_called()
        else:
            mock_importer.assert_called_once()
            mock_task.assert_not_called()


def test_clear_stripe_transactions_import_cache(mocker):
    mock_clear_cache = mocker.patch(
        "apps.contributions.stripe_import.StripeTransactionsImporter.clear_all_stripe_transactions_cache"
    )
    call_command("clear_stripe_transactions_import_cache")
    mock_clear_cache.assert_called_once()
