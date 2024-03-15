import datetime
from zoneinfo import ZoneInfo

from django.core.management import call_command

import pytest
import stripe

from apps.contributions.models import Payment
from apps.contributions.tests.factories import PaymentFactory


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
    ACCOUNT_ID_WITH_ERROR = "acct_with_error"
    ACCOUNT_ID = "acct_1"

    @pytest.fixture(autouse=True)
    def payment_with_transaction_time(self):
        return PaymentFactory(transaction_time=datetime.datetime.utcnow())

    @pytest.fixture(autouse=True)
    def payment_no_transaction_time_eligible(self):
        return PaymentFactory(
            transaction_time=None,
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id=self.ACCOUNT_ID,
        )

    @pytest.fixture(autouse=True)
    def payment_no_transaction_time_eligible_fail_with_bt_retrieval(self):
        return PaymentFactory(
            transaction_time=None,
            stripe_balance_transaction_id=self.BALANCE_TRANSACTION_ID_WITH_ERROR,
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id=self.ACCOUNT_ID,
        )

    @pytest.fixture(autouse=True)
    def payment_no_transaction_time_eligible_fail_with_account_retrieval(self):
        return PaymentFactory(
            transaction_time=None,
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id=self.ACCOUNT_ID_WITH_ERROR,
        )

    @pytest.fixture
    def payment_no_transaction_time_ineligible_because_no_page(self):
        return PaymentFactory(transaction_time=None, contribution__donation_page=None)

    @pytest.fixture
    def payment_no_transaction_time_ineligible_because_of_no_account(self):
        return PaymentFactory(
            transaction_time=None,
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id=None,
        )

    @pytest.fixture
    def payment_no_transaction_time_ineligible_because_of_disconnected_account(self):
        return PaymentFactory(
            transaction_time=None,
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id=self.DISCONNECTED_ACCOUNT_ID,
        )

    @pytest.fixture(autouse=True)
    def stripe_account_retrieve(self, mocker):
        def side_effect(*args, **kwargs):
            account_id = args[0]
            if account_id == self.ACCOUNT_ID_WITH_ERROR:
                raise stripe.error.StripeError("Some error")
            return mocker.Mock(charges_enabled=(False if account_id == self.DISCONNECTED_ACCOUNT_ID else True))

        mocker.patch("stripe.Account.retrieve", side_effect=side_effect)

    @pytest.fixture(autouse=True)
    def balance_transaction_retrieve(self, mocker):
        def side_effect(*args, **kwargs):
            if args[0] == self.BALANCE_TRANSACTION_ID_WITH_ERROR:
                raise stripe.error.StripeError("Some error")
            return mocker.Mock(created=self.BT_CREATED_TIMESTAMP)

        mocker.patch("stripe.BalanceTransaction.retrieve", side_effect=side_effect)

    def test_sync_payment_transaction_time(self, payment_no_transaction_time_eligible):
        call_command("sync_payment_transaction_time")
        payment_no_transaction_time_eligible.refresh_from_db()
        assert payment_no_transaction_time_eligible.transaction_time == datetime.datetime.fromtimestamp(
            self.BT_CREATED_TIMESTAMP, tz=ZoneInfo("UTC")
        )

    def test_sync_payment_transaction_time_when_no_eligible_payments(self, mocker):
        Payment.objects.all().delete()
        PaymentFactory(transaction_time=datetime.datetime.utcnow())
        call_command("sync_payment_transaction_time")
