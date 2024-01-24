import datetime

from django.core.management import call_command

import pytest

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
def test_sync_payment_transaction_time(mocker, balance_transaction_for_one_time_charge):
    payment = PaymentFactory(transaction_time=None)
    mocker.patch(
        "stripe.BalanceTransaction.retrieve",
        return_value=balance_transaction_for_one_time_charge,
    )
    call_command("sync_payment_transaction_time")
    payment.refresh_from_db()
    assert payment.transaction_time == datetime.datetime.fromtimestamp(
        balance_transaction_for_one_time_charge.created, tz=datetime.timezone.utc
    )
