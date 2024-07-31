import datetime
import logging
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

from django.core.management import call_command

import pytest
import reversion
import stripe

from apps.contributions.choices import ContributionInterval
from apps.contributions.management.commands.fix_dev_5064 import (
    METADATA_VERSIONS,
)
from apps.contributions.management.commands.fix_dev_5064 import (
    REVISION_COMMENT as FIX_DEV_5064_REVISION_COMMENT,
)
from apps.contributions.management.commands.fix_dev_5064 import (
    Command as FixDev5064Command,
)
from apps.contributions.management.commands.fix_imported_contributions_with_incorrect_donation_page_value import (
    REVISION_COMMENT,
)
from apps.contributions.management.commands.fix_incident_2445 import (
    TEMP_PM_ID,
)
from apps.contributions.management.commands.fix_incident_2445 import (
    Command as FixIncident2445Command,
)
from apps.contributions.management.commands.fix_incident_2445 import (
    ContributionOutcome as Incident2445Outcome,
)
from apps.contributions.models import Contribution, Payment
from apps.contributions.stripe_import import StripeTransactionsImporter
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
    PaymentFactory,
)
from apps.organizations.tests.factories import PaymentProviderFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory


@pytest.mark.django_db()
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


@pytest.mark.parametrize("dry_run", [False, True])
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


@pytest.mark.django_db()
class Test_sync_payment_transaction_time:
    DISCONNECTED_ACCOUNT_ID = "acct_disconnected"
    BALANCE_TRANSACTION_ID_WITH_ERROR = "txn_with_error"
    BT_CREATED_TIMESTAMP = 1610000000
    ACCOUNT_ID_WITH_PERMISSION_ERROR = "acct_with_perm_error"
    ACCOUNT_ID_WITH_OTHER_ERROR = "acct_with_other_error"
    ACCOUNT_ID = "acct_1"

    @pytest.fixture()
    def payment_with_transaction_time(self):
        return PaymentFactory(transaction_time=datetime.datetime.now(datetime.timezone.utc))

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

    @pytest.fixture()
    def payment_no_transaction_time_ineligible_because_of_no_account(self):
        return PaymentFactory(
            transaction_time=None,
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id=None,
        )

    @pytest.fixture()
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
    def _stripe_account_retrieve(self, mocker):
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
    def _balance_transaction_retrieve(self, mocker):
        def side_effect(*args, **kwargs):
            if args[0] == self.BALANCE_TRANSACTION_ID_WITH_ERROR:
                raise stripe.error.StripeError("Some error")
            return mocker.Mock(created=self.BT_CREATED_TIMESTAMP)

        mocker.patch("stripe.BalanceTransaction.retrieve", side_effect=side_effect)

    @pytest.mark.parametrize("include_account_problem_payments", [False, True])
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


@pytest.mark.django_db()
class Test_import_stripe_transactions_data:
    @pytest.mark.parametrize("async_mode", [False, True])
    @pytest.mark.parametrize("for_orgs", [True, False])
    @pytest.mark.parametrize("suppress_stripe_info_logs", [True, False])
    @pytest.mark.parametrize("stripe_account_error", [False, True])
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
    def _mock_get_account_status(self, mocker, contribution):
        mocker.patch(
            # needed to mock at import because otherwise tests failed, seemingly because
            # of leaked mock state between tests in this class
            "apps.contributions.management.commands.fix_recurring_contribution_missing_provider_payment_id.get_stripe_accounts_and_their_connection_status",
            side_effect=[{contribution.stripe_account_id: True}],
        )

    @pytest.mark.usefixtures("_mock_get_account_status")
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

    @pytest.mark.usefixtures("_mock_get_account_status")
    def test_when_stripe_error_on_sub_retrieval(self, mocker, contribution):
        mocker.patch("stripe.Subscription.retrieve", side_effect=stripe.error.StripeError("Some error"))
        call_command("fix_recurring_contribution_missing_provider_payment_id")
        contribution.refresh_from_db()
        assert contribution.provider_payment_id is None

    @pytest.mark.usefixtures("_mock_get_account_status")
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

    @pytest.mark.parametrize("has_eligible", [True, False])
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
    def _get_accounts(self, mocker, contributions_with_stripe_account_id):
        mocker.patch(
            "apps.common.utils.get_stripe_accounts_and_their_connection_status",
            return_value={
                contributions_with_stripe_account_id[0].stripe_account_id: True,
                contributions_with_stripe_account_id[1].stripe_account_id: True,
                contributions_with_stripe_account_id[2].stripe_account_id: False,
            },
        )

    @pytest.mark.usefixtures("fetch_stripe_payment_method", "_get_accounts", "contributions")
    def test_happy_path(self):
        call_command("sync_missing_provider_payment_method_details")

    def test_when_no_eligible_contributions(self):
        call_command("sync_missing_provider_payment_method_details")

    @pytest.fixture()
    def _get_accounts_none_found(self, mocker, contributions_with_stripe_account_id):
        mocker.patch(
            "apps.common.utils.get_stripe_accounts_and_their_connection_status",
            return_value={x.stripe_account_id: False for x in contributions_with_stripe_account_id},
        )

    @pytest.mark.usefixtures("contributions", "_get_accounts_none_found")
    def test_when_eligible_but_no_fixable(self):
        call_command("sync_missing_provider_payment_method_details")


def test_mark_abandoned_carts(mocker):
    mock_mark_abandoned_carts = mocker.patch("apps.contributions.tasks.mark_abandoned_carts_as_abandoned")
    call_command("mark_abandoned_carts")
    mock_mark_abandoned_carts.assert_called_once()


@pytest.mark.django_db()
class Test_fix_incident_2445:

    @pytest.fixture()
    def command(self):
        return FixIncident2445Command()

    def test_handle_when_no_relevant_contributions(self, mocker):
        call_command("fix_incident_2445", payment_method_id="pm_1", original_contribution_id=1)

    def test_handle_when_ineligible_because_of_account_contributions(self, mocker):
        pm_id = "pm_1"
        contribution = ContributionFactory(provider_payment_method_id=pm_id)
        mocker.patch(
            "apps.contributions.management.commands.fix_incident_2445.get_stripe_accounts_and_their_connection_status",
            return_value={contribution.stripe_account_id: None},
        )
        call_command("fix_incident_2445", payment_method_id=pm_id, original_contribution_id=99)

    def test_handle_happy_path(self, mocker, command):
        one_time = ContributionFactory(one_time=True, provider_payment_method_id=None)
        recurring = ContributionFactory(monthly_subscription=True, provider_payment_method_id=None)
        contributions = Contribution.objects.all()
        assert contributions.count() == 2
        mocker.patch(
            "apps.contributions.management.commands.fix_incident_2445.Command.get_queryset", return_value=contributions
        )
        mocker.patch(
            "apps.contributions.management.commands.fix_incident_2445.Command.nullify_bad_change",
            return_value=contributions,
        )
        mocker.patch(
            "apps.contributions.management.commands.fix_incident_2445.get_stripe_accounts_and_their_connection_status",
            return_value={
                one_time.stripe_account_id: True,
                recurring.stripe_account_id: True,
            },
        )
        mocker.patch(
            "apps.contributions.management.commands.fix_incident_2445.Command.handle_one_time_contribution",
            return_value=(one_time, Incident2445Outcome.UPDATED),
        )
        mocker.patch(
            "apps.contributions.management.commands.fix_incident_2445.Command.handle_recurring_contribution",
            return_value=(recurring, Incident2445Outcome.NOT_UPDATED),
        )
        call_command("fix_incident_2445", payment_method_id="pm_1", original_contribution_id=99)

    @pytest.fixture()
    def payment_intent_with_payment_method(self, mocker):
        return mocker.Mock(id="pi_1", payment_method="pm_1")

    @pytest.fixture()
    def payment_intent_without_payment_method(self, mocker):
        return mocker.Mock(id="pi_2", payment_method=None)

    @pytest.fixture()
    def bad_payment_method_id(self):
        return "pm_X"

    @pytest.mark.parametrize(
        ("payment_intent", "fetch_pm_result", "expect_outcome"),
        [
            (None, None, Incident2445Outcome.NOT_UPDATED),
            (
                "payment_intent_with_payment_method",
                {"id": "pm_1", "card": "card_1"},
                Incident2445Outcome.UPDATED,
            ),
            ("payment_intent_with_payment_method", None, Incident2445Outcome.UPDATED),
            ("payment_intent_without_payment_method", None, Incident2445Outcome.NOT_UPDATED),
        ],
    )
    def test_handle_one_time_contribution(
        self, payment_intent, fetch_pm_result, expect_outcome, mocker, request, command
    ):
        mocker.patch(
            "apps.contributions.models.Contribution.stripe_payment_intent",
            (pi := request.getfixturevalue(payment_intent) if payment_intent else None),
        )
        _con = ContributionFactory(provider_payment_method_details=None, provider_payment_method_id=None)
        mocker.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=fetch_pm_result)
        contribution, outcome = command.handle_one_time_contribution(contribution=_con)
        assert contribution == _con
        assert outcome == expect_outcome
        if pi and pi.payment_method:
            assert contribution.provider_payment_method_id == pi.payment_method
        else:
            assert contribution.provider_payment_method_id is None
        if fetch_pm_result:
            assert contribution.provider_payment_method_details == fetch_pm_result
        else:
            assert contribution.provider_payment_method_details is None

    @pytest.fixture()
    def contribution_unflagged(self):
        return ContributionFactory(
            monthly_subscription=True, provider_payment_method_id=None, provider_payment_method_details=None
        )

    @pytest.fixture()
    def contribution_flagged(self):
        return ContributionFactory(
            monthly_subscription=True,
            flagged=True,
            provider_payment_method_id=None,
            provider_payment_method_details=None,
        )

    @pytest.fixture()
    def subscription_with_invoice(self, mocker):
        return mocker.Mock(latest_invoice=mocker.Mock(payment_intent=mocker.Mock(payment_method="pm_1")))

    @pytest.fixture()
    def subscription_no_invoice(self, mocker):
        return mocker.Mock(latest_invoice=None)

    @pytest.fixture()
    def setup_intent_with_pm(self, mocker):
        return mocker.Mock(payment_method="pm_1")

    @pytest.fixture()
    def setup_intent_no_payment_method(self, mocker):
        return mocker.Mock(payment_method=None)

    @pytest.mark.parametrize(
        (
            "contribution",
            "subscription",
            "setup_intent",
            "expected_outcome",
            "fetch_pm_return",
        ),
        [
            (
                "contribution_unflagged",
                "subscription_with_invoice",
                None,
                Incident2445Outcome.UPDATED,
                {"id": "pm_1", "card": "card_1"},
            ),
            ("contribution_unflagged", "subscription_no_invoice", None, Incident2445Outcome.NOT_UPDATED, None),
            ("contribution_unflagged", None, None, Incident2445Outcome.NOT_UPDATED, None),
            (
                "contribution_flagged",
                "subscription_no_invoice",
                "setup_intent_with_pm",
                Incident2445Outcome.UPDATED,
                None,
            ),
            (
                "contribution_flagged",
                "subscription_no_invoice",
                "setup_intent_no_payment_method",
                Incident2445Outcome.NOT_UPDATED,
                None,
            ),
            (
                "contribution_unflagged",
                "subscription_no_invoice",
                "setup_intent_no_payment_method",
                Incident2445Outcome.NOT_UPDATED,
                None,
            ),
        ],
    )
    def test_handle_reucrring_contribution(
        self, command, contribution, subscription, setup_intent, expected_outcome, fetch_pm_return, mocker, request
    ):
        _contribution = request.getfixturevalue(contribution) if contribution else None
        subscription = request.getfixturevalue(subscription) if subscription else None
        setup_intent = request.getfixturevalue(setup_intent) if setup_intent else None
        mocker.patch(
            "apps.contributions.management.commands.fix_incident_2445.Command.get_stripe_subscription",
            return_value=subscription,
        )
        mocker.patch(
            "apps.contributions.models.Contribution.stripe_setup_intent",
            return_value=setup_intent,
            new_callable=mocker.PropertyMock,
        )
        mocker.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=fetch_pm_return)
        contribution, outcome = command.handle_recurring_contribution(contribution=_contribution)
        assert contribution == _contribution
        assert outcome == expected_outcome
        if (
            subscription
            and subscription.latest_invoice
            and (pi := subscription.latest_invoice.payment_intent)
            and pi.payment_method
        ):
            assert contribution.provider_payment_method_id == pi.payment_method
            if fetch_pm_return:
                assert contribution.provider_payment_method_details == fetch_pm_return
            else:
                assert contribution.provider_payment_method_details is None
        elif setup_intent and setup_intent.payment_method:
            assert contribution.provider_payment_method_id == setup_intent.payment_method
            if fetch_pm_return:
                assert contribution.provider_payment_method_details == fetch_pm_return
            else:
                assert contribution.provider_payment_method_details is None
        else:
            assert contribution.provider_payment_method_id is None
            assert contribution.provider_payment_method_details is None

    @pytest.mark.parametrize(
        ("pm_details_returned", "expected_update_fields"),
        [
            (None, {"provider_payment_method_id"}),
            ({"card": "card_1"}, {"provider_payment_method_details", "provider_payment_method_id"}),
        ],
    )
    def test_handle_sync_pm(self, pm_details_returned, expected_update_fields, command, mocker):
        _contribution = ContributionFactory(provider_payment_method_id=None, provider_payment_method_details=None)
        mocker.patch(
            "apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=pm_details_returned
        )
        contribution, update_fields = command.handle_sync_pm(
            contribution=_contribution, pm_id=(pm_id := "pm_1"), update_fields=set()
        )
        assert contribution == _contribution
        assert update_fields == expected_update_fields
        assert contribution.provider_payment_method_id == pm_id
        if pm_details_returned:
            assert contribution.provider_payment_method_details
        else:
            assert contribution.provider_payment_method_details is None

    def test_get_stripe_subscription_when_no_id(self, command):
        contribution = ContributionFactory(provider_subscription_id=None)
        assert command.get_stripe_subscription(contribution) is None

    def test_get_stripe_subscription_when_error(self, mocker, command):
        contribution = ContributionFactory(provider_subscription_id="sub_1")
        mocker.patch("stripe.Subscription.retrieve", side_effect=stripe.error.StripeError("Some error"))
        assert command.get_stripe_subscription(contribution) is None

    def test_nullify_bad_change(self, command):
        contribution = ContributionFactory(
            provider_payment_method_id="bad",
            provider_payment_method_details={"bad": "bad"},
        )
        command.nullify_bad_change(Contribution.objects.all())
        contribution.refresh_from_db()
        assert contribution.provider_payment_method_id == TEMP_PM_ID
        assert contribution.provider_payment_method_details is None


@pytest.mark.django_db()
class Test_fix_dev_5064:

    @pytest.fixture()
    def command(self):
        return FixDev5064Command()

    @pytest.fixture()
    def importer(self):
        return StripeTransactionsImporter(stripe_account_id="acct_1")

    @pytest.fixture()
    def one_time_contribution(self):
        return ContributionFactory(interval=ContributionInterval.ONE_TIME)

    @pytest.fixture()
    def recurring_contribution(self):
        return ContributionFactory(interval=ContributionInterval.MONTHLY)

    def test_add_arguments(self, command):
        parser = MagicMock()
        command.add_arguments(parser)
        parser.add_argument.assert_called_with("--suppress-stripe-info-logs", action="store_true", default=False)

    @pytest.mark.parametrize("suppress", [True, False])
    def test_configure_stripe_log_level(self, suppress, command, mocker):
        logger = logging.getLogger("stripe")
        set_level_mock = mocker.patch.object(logger, "setLevel")
        command.configure_stripe_log_level(suppress_stripe_info_logs=suppress)
        if suppress:
            set_level_mock.assert_called_with(logging.ERROR)
        else:
            set_level_mock.assert_not_called()

    @pytest.mark.parametrize(("count_via_metadata", "count_via_revision_comment"), [(1, 1), (0, 1)])
    def test_get_contributions(self, count_via_metadata, count_via_revision_comment, command, mocker):
        via_metadata = []
        for _ in range(count_via_metadata):
            contribution = ContributionFactory(one_time=True)

            contribution.contribution_metadata["schema_version"] = METADATA_VERSIONS[0]
            contribution.save()
            via_metadata.append(contribution)
        via_reversion = []
        for _ in range(count_via_revision_comment):
            contribution = ContributionFactory(one_time=True, contribution_metadata__schema_version="1.4")
            with reversion.create_revision():
                contribution.save()
                reversion.set_comment(FIX_DEV_5064_REVISION_COMMENT)
                via_reversion.append(contribution)
        assert via_metadata + via_reversion
        mocker.patch(
            "apps.contributions.management.commands.fix_dev_5064.get_stripe_accounts_and_their_connection_status",
            return_value=({c.stripe_account_id: True for c in via_metadata + via_reversion}),
        )
        actual_via_metadata, actual_via_reversion = command.get_contributions()
        assert set(actual_via_metadata.values_list("id", flat=True)) == {c.id for c in via_metadata}
        assert set(actual_via_reversion.values_list("id", flat=True)) == {c.id for c in via_reversion}

    def test_handle_account_happy_path(self, command, one_time_contribution, recurring_contribution, mocker):
        # Picking arbitrary dates so they can be distinguished in the result.
        mock_created = datetime.datetime(2001, 1, 1, tzinfo=datetime.timezone.utc)
        mock_start_date = datetime.datetime(2002, 1, 1, tzinfo=datetime.timezone.utc)
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_resource_from_cache",
            return_value={
                "created": mock_created.timestamp(),
                "id": "mock-id",
                "start_date": mock_start_date.timestamp(),
            },
        )
        # This bends the rules by passing a list of contributions, not a
        # queryset as the method is expecting, but all it needs is to be able to iterate over it.
        command.handle_account("mock-account-id", [one_time_contribution, recurring_contribution])
        assert one_time_contribution.first_payment_date == mock_created
        assert recurring_contribution.first_payment_date == mock_start_date

    def test_handle_account_no_contributions(self, command):
        command.handle_account("mock-account-id", [])
        # Shouldn't raise an exception.

    @pytest.mark.parametrize(("fixture"), [("one_time_contribution"), ("recurring_contribution")])
    def test_handle_account_stripe_object_not_found(self, command, fixture, mocker, request):
        contribution = request.getfixturevalue(fixture)
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_resource_from_cache",
            return_value=None,
        )
        old_first_payment_date = contribution.first_payment_date
        command.handle_account("mock-account-id", [contribution])
        assert contribution.first_payment_date == old_first_payment_date

    @pytest.mark.parametrize(("suppress_stripe_info_logs"), [(True), (False)])
    def test_command_happy_path(self, suppress_stripe_info_logs, one_time_contribution, recurring_contribution, mocker):
        # We need to imitate the annotation added by get_contributions().
        relevant_via_metadata = Contribution.objects.filter(id=one_time_contribution.id).with_stripe_account()
        relevant_via_revision_comment = Contribution.objects.filter(id=recurring_contribution.id).with_stripe_account()
        # If this isn't true, we'll get 1 call to handle_account below, not 2.
        assert relevant_via_metadata[0].stripe_account != relevant_via_revision_comment[0].stripe_account
        mocker.patch(
            "apps.contributions.management.commands.fix_dev_5064.Command.get_contributions",
            return_value=(
                relevant_via_metadata,
                relevant_via_revision_comment,
            ),
        )
        configure_stripe_log_level_mock = mocker.patch(
            "apps.contributions.management.commands.fix_dev_5064.Command.configure_stripe_log_level"
        )
        handle_account_mock = mocker.patch("apps.contributions.management.commands.fix_dev_5064.Command.handle_account")
        call_command("fix_dev_5064", suppress_stripe_info_logs=suppress_stripe_info_logs)
        configure_stripe_log_level_mock.assert_called_once_with(suppress_stripe_info_logs)

        # We need to assert loosely that the right calls were made because the
        # method is creating new querysets, e.g. a strict equality check won't
        # work.
        assert handle_account_mock.call_count == 2
        for expected in [relevant_via_metadata, relevant_via_revision_comment]:
            assert (
                len(
                    [
                        call
                        for call in handle_account_mock.call_args_list
                        if call.kwargs["account_id"] == expected[0].stripe_account
                        and len(call.kwargs["contributions"]) == 1
                        and call.kwargs["contributions"][0].id == expected[0].id
                    ]
                )
                == 1
            )

    def test_command_dedupes_stripe_accounts(self, one_time_contribution, mocker):
        # We need to imitate the annotation added by get_contributions().
        contributions = Contribution.objects.filter(id=one_time_contribution.id).with_stripe_account()
        mocker.patch(
            "apps.contributions.management.commands.fix_dev_5064.Command.get_contributions",
            return_value=(
                contributions,
                contributions,
            ),
        )
        handle_account_mock = mocker.patch("apps.contributions.management.commands.fix_dev_5064.Command.handle_account")
        call_command("fix_dev_5064")
        handle_account_mock.assert_called_once()
        # See note above about why we assert about call args in a roundabout way.
        assert (
            len(
                [
                    call
                    for call in handle_account_mock.call_args_list
                    if call.kwargs["account_id"] == contributions[0].stripe_account
                    and len(call.kwargs["contributions"]) == 1
                    and call.kwargs["contributions"][0].id == contributions[0].id
                ]
            )
            == 1
        )
