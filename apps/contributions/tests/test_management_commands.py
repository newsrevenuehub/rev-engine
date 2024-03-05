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


def test_process_stripe_event(mocker):
    mock_syncer = mocker.patch("apps.contributions.stripe_import.StripeEventProcessor")
    call_command(
        "process_stripe_event",
        stripe_account=(stripe_id := "123"),
        event_id=(event_id := "456"),
        async_mode=(async_mode := False),
    )
    mock_syncer.assert_called_once_with(stripe_account_id=stripe_id, event_id=event_id, async_mode=async_mode)
    mock_syncer.return_value.sync.assert_called_once()


@pytest.mark.django_db
class TestImportStripeTransactionsDataCommand:
    @pytest.fixture(
        params=[
            {},
            {
                "gte": (now := datetime.datetime.now()),
                "lte": now,
                "for_orgs": [1, 2, 3],
                "for_stripe_accounts": ["acct_123", "acct_456"],
            },
        ]
    )
    def command_options(self, request):
        return request.param

    @pytest.mark.parametrize("async_mode", (False, True))
    def test_happy_path(self, async_mode, command_options, mocker):
        mock_async_task = mocker.patch("apps.contributions.tasks.task_import_contributions_and_payments.delay")
        mock_transformer = mocker.patch(
            "apps.contributions.management.commands.import_stripe_transactions_data.StripeTransactionsImporter"
        )
        if async_mode:
            command_options["async_mode"] = True
        call_command("import_stripe_transactions_data", **command_options)
        gte = command_options.get("gte", None)
        lte = command_options.get("lte", None)
        expected_call_args = {
            "from_date": (int(gte.timestamp()) if async_mode and gte else gte),
            "to_date": (int(lte.timestamp()) if async_mode and lte else lte),
            "for_orgs": command_options.get("for_orgs", []),
            "for_stripe_accounts": command_options.get("for_stripe_accounts", []),
        }
        if async_mode:
            mock_async_task.assert_called_once_with(**expected_call_args)
            mock_transformer.assert_not_called()
        else:
            mock_async_task.assert_not_called()
            mock_transformer.assert_called_once_with(**expected_call_args)
            mock_transformer.return_value.import_stripe_transactions_data.assert_called_once()
