import uuid
from copy import deepcopy

from django.core.management import call_command
from django.db.models import CharField, Value

import pytest
import reversion
import stripe

from apps.contributions.choices import ContributionInterval, ContributionStatus, QuarantineStatus
from apps.contributions.management.commands.add_quarantine_status import Command as AddQuarantineStatusCommand
from apps.contributions.management.commands.audit_recurring_contributions import Command as AuditRecurringContributions
from apps.contributions.management.commands.fix_contributions_missing_provider_payment_method_id import (
    Command as FixContributionMissingProviderPaymentMethodId,
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
from apps.contributions.models import Contribution
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
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


@pytest.mark.django_db
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


@pytest.fixture
def contributions():
    return ContributionFactory.create_batch(size=3, provider_payment_id=None, monthly_subscription=True)


@pytest.mark.django_db
class Test_fix_recurring_contribution_missing_provider_payment_id:
    @pytest.fixture
    def contribution(self):
        return ContributionFactory(provider_payment_id=None, monthly_subscription=True)

    @pytest.fixture
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


@pytest.mark.django_db
class Test_fix_imported_contributions_with_incorrect_donation_page_value:
    @pytest.fixture
    def rp_1(self):
        return RevenueProgramFactory()

    @pytest.fixture
    def rp_2(self):
        return RevenueProgramFactory()

    @pytest.fixture
    def eligible_metadata(self, rp_1):
        return {
            "agreed_to_pay_fees": True,
            "donor_selected_amount": 100,
            "revenue_program_id": str(rp_1.id),
            "revenue_program_slug": rp_1.slug,
            "source": "rev-engine",
            "schema_version": "1.5",
        }

    @pytest.fixture
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

    @pytest.fixture
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

    @pytest.fixture
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


@pytest.mark.django_db
class Test_sync_missing_provider_payment_method_details:
    @pytest.fixture
    def fetch_stripe_payment_method(self, mocker, payment_method):
        return mocker.patch(
            "apps.contributions.models.Contribution.fetch_stripe_payment_method", side_effect=[payment_method, None]
        )

    @pytest.fixture
    def contribution_no_stripe_account_id(self):
        return ContributionFactory(
            provider_payment_method_id="pm_1",
            provider_payment_method_details=None,
            donation_page__revenue_program__payment_provider__stripe_account_id=None,
        )

    @pytest.fixture
    def contributions_with_stripe_account_id(self):
        return ContributionFactory.create_batch(
            provider_payment_method_id="pm_1", provider_payment_method_details=None, size=3
        )

    @pytest.fixture
    def contributions(self, contribution_no_stripe_account_id, contributions_with_stripe_account_id):
        return [contribution_no_stripe_account_id, *contributions_with_stripe_account_id]

    @pytest.fixture
    @pytest.mark.parametrize
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

    @pytest.fixture
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


@pytest.mark.django_db
class Test_fix_incident_2445:
    @pytest.fixture
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

    @pytest.fixture
    def payment_intent_with_payment_method(self, mocker):
        return mocker.Mock(id="pi_1", payment_method="pm_1")

    @pytest.fixture
    def payment_intent_without_payment_method(self, mocker):
        return mocker.Mock(id="pi_2", payment_method=None)

    @pytest.fixture
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

    @pytest.fixture
    def contribution_unflagged(self):
        return ContributionFactory(
            monthly_subscription=True, provider_payment_method_id=None, provider_payment_method_details=None
        )

    @pytest.fixture
    def contribution_flagged(self):
        return ContributionFactory(
            monthly_subscription=True,
            flagged=True,
            provider_payment_method_id=None,
            provider_payment_method_details=None,
        )

    @pytest.fixture
    def subscription_with_invoice(self, mocker):
        return mocker.Mock(latest_invoice=mocker.Mock(payment_intent=mocker.Mock(payment_method="pm_1")))

    @pytest.fixture
    def subscription_no_invoice(self, mocker):
        return mocker.Mock(latest_invoice=None)

    @pytest.fixture
    def setup_intent_with_pm(self, mocker):
        return mocker.Mock(payment_method="pm_1")

    @pytest.fixture
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


@pytest.mark.django_db
class Test_fix_missing_provider_payment_method_id:
    @pytest.fixture
    def command(self):
        return FixContributionMissingProviderPaymentMethodId()

    @pytest.fixture
    def one_time_contribution_and_pi_with_conforming_metadata(self, payment_intent_for_one_time_contribution):
        pi_id = "some-random-pi-id"
        contribution = ContributionFactory(
            provider_subscription_id=None,
            provider_payment_method_id=None,
            provider_payment_id=pi_id,
            interval=ContributionInterval.ONE_TIME,
        )
        contribution.contribution_metadata["schema_version"] = "1.4"
        contribution.contribution_metadata["contributor_id"] = contribution.contributor.id
        contribution.save()
        payment_intent_for_one_time_contribution.id = pi_id
        return contribution, payment_intent_for_one_time_contribution

    @pytest.fixture
    def recurring_contribution_and_subscription_with_conforming_metadata(
        self, stripe_subscription, payment_method, faker
    ):
        # We need to assign a unique ID to the subscription to avoid conflicting
        # with the other recurring_contribution fixture below.
        sub = deepcopy(stripe_subscription)
        sub.id = f"sub_{faker.uuid4()}"
        sub.default_payment_method = payment_method
        contribution = ContributionFactory(
            provider_payment_method_id=None,
            provider_subscription_id=sub.id,
            provider_payment_id=None,
            interval=ContributionInterval.MONTHLY,
        )
        contribution.contribution_metadata["schema_version"] = "1.4"
        contribution.contribution_metadata["contributor_id"] = contribution.contributor.id
        contribution.save()
        stripe_subscription.default_payment_method = payment_method
        stripe_subscription.metadata["contributor_id"] = contribution.contributor.id
        return contribution, sub

    @pytest.fixture
    def recurring_contribution_and_subscription_with_non_conforming_metadata(
        self, stripe_subscription, payment_method, faker
    ):
        # We need to assign a unique ID to the subscription to avoid conflicting
        # with the other recurring_contribution fixture above.
        sub = deepcopy(stripe_subscription)
        sub.id = f"sub_{faker.uuid4()}"
        sub.default_payment_method = payment_method
        contribution = ContributionFactory(
            provider_payment_method_id=None,
            provider_subscription_id=sub.id,
            interval=ContributionInterval.MONTHLY,
            provider_payment_id=None,
            contribution_metadata={},
        )
        return contribution, sub

    @pytest.fixture
    def one_time_contribution_with_pi_with_non_conforming_contribution_metadata(
        self,
        payment_intent_for_one_time_contribution,
        payment_method,
        faker,
    ):
        """One-time with no metadata so we expect to be retrieved not searched for."""
        pi_id = faker.uuid4()
        contribution = ContributionFactory(
            provider_payment_method_id=None,
            provider_payment_id=pi_id,
            provider_subscription_id=None,
            interval=ContributionInterval.ONE_TIME,
            contribution_metadata={},
        )
        pi = deepcopy(payment_intent_for_one_time_contribution)
        pi.id = pi_id
        pi["payment_method"] = payment_method
        return contribution, pi

    @pytest.fixture
    def mock_stripe(
        self,
        mocker,
        one_time_contribution_and_pi_with_conforming_metadata,
        recurring_contribution_and_subscription_with_conforming_metadata,
        recurring_contribution_and_subscription_with_non_conforming_metadata,
        one_time_contribution_with_pi_with_non_conforming_contribution_metadata,
        request,
    ):
        _, pi = one_time_contribution_and_pi_with_conforming_metadata
        pi.payment_method = request.getfixturevalue("payment_method")
        _, sub = recurring_contribution_and_subscription_with_conforming_metadata
        _, pi_no_metadata = one_time_contribution_with_pi_with_non_conforming_contribution_metadata
        pi_no_metadata.payment_method = request.getfixturevalue("payment_method")
        _, sub_no_metadata = recurring_contribution_and_subscription_with_non_conforming_metadata
        sub_no_metadata.default_payment_method = request.getfixturevalue("payment_method")
        mock_pi_search = mocker.patch("stripe.PaymentIntent.search")
        mock_sub_search = mocker.patch("stripe.Subscription.search")
        mock_pi_search.return_value.auto_paging_iter.return_value = [pi]
        mock_sub_search.return_value.auto_paging_iter.return_value = [sub]
        mock_pi_retrieve = mocker.patch("stripe.PaymentIntent.retrieve", return_value=pi_no_metadata)
        mock_sub_retrieve = mocker.patch(
            "stripe.Subscription.retrieve",
            return_value=sub_no_metadata,
        )
        return mock_pi_search, mock_sub_search, mock_pi_retrieve, mock_sub_retrieve

    def test_call_command_when_no_fixable_contributions(self):
        assert Contribution.objects.count() == 0
        call_command("fix_contributions_missing_provider_payment_method_id")

    @pytest.fixture
    def one_time_contribution_fixable_via_search(self, one_time_contribution_and_pi_with_conforming_metadata):
        return one_time_contribution_and_pi_with_conforming_metadata[0]

    @pytest.fixture
    def one_time_contribution_fixable_via_retrieve(
        self, one_time_contribution_with_pi_with_non_conforming_contribution_metadata
    ):
        return one_time_contribution_with_pi_with_non_conforming_contribution_metadata[0]

    @pytest.fixture
    def recurring_contribution_fixable_via_retrieve(
        self, recurring_contribution_and_subscription_with_non_conforming_metadata
    ):
        return recurring_contribution_and_subscription_with_non_conforming_metadata[0]

    @pytest.fixture
    def recurring_contribution_fixable_via_search(
        self, recurring_contribution_and_subscription_with_conforming_metadata
    ):
        return recurring_contribution_and_subscription_with_conforming_metadata[0]

    @pytest.fixture
    def fixable_contributions(
        self,
        one_time_contribution_fixable_via_search,
        one_time_contribution_fixable_via_retrieve,
        recurring_contribution_fixable_via_retrieve,
        recurring_contribution_fixable_via_search,
    ):
        return Contribution.objects.filter(
            id__in=(
                one_time_contribution_fixable_via_search.id,
                one_time_contribution_fixable_via_retrieve.id,
                recurring_contribution_fixable_via_retrieve.id,
                recurring_contribution_fixable_via_search.id,
            )
        )

    @pytest.fixture
    def payment_method(self, faker):
        return stripe.PaymentMethod.construct_from({"id": faker.uuid4()}, "fake-key")

    @pytest.fixture
    def _stripe_account_connected(self, mocker, fixable_contributions):
        mocker.patch(
            "apps.contributions.models.ContributionQuerySet.exclude_disconnected_stripe_accounts",
            return_value=fixable_contributions,
        )

    @pytest.mark.usefixtures("mock_stripe", "_stripe_account_connected")
    def test_call_command_happy_path(self, fixable_contributions):
        assert fixable_contributions.filter(provider_payment_method_id__isnull=True).count() == 4
        call_command("fix_contributions_missing_provider_payment_method_id")
        assert fixable_contributions.filter(provider_payment_method_id__isnull=True).count() == 0

    @pytest.mark.parametrize("not_updated_query_exists", [True, False])
    def test_handle_when_none_updated(self, mocker, command, not_updated_query_exists):
        mocker.patch(
            "apps.contributions.management.commands.fix_contributions_missing_provider_payment_method_id.Command.get_relevant_contributions",
            return_value=Contribution.objects.filter(id__in=[ContributionFactory().id]),
        )
        mocker.patch.object(
            command,
            "process_contributions",
            return_value=(
                Contribution.objects.none(),
                (
                    Contribution.objects.filter(id__in=[ContributionFactory().id])
                    if not not_updated_query_exists
                    else Contribution.objects.none()
                ),
            ),
        )
        command.handle()

    def test_process_contribution_via_retrieve_api_when_stripe_error(self, mocker, command):
        mocker.patch.object(command, "get_stripe_payment_object_for_contribution", side_effect=stripe.error.StripeError)
        command.process_contribution_via_retrieve_api(ContributionFactory())

    def test_process_contribution_via_retrieve_api_when_payment_object_has_no_pm(
        self, mocker, command, one_time_contribution_with_pi_with_non_conforming_contribution_metadata
    ):
        contribution, payment_object = one_time_contribution_with_pi_with_non_conforming_contribution_metadata
        payment_object.payment_method = None
        mocker.patch.object(command, "get_stripe_payment_object_for_contribution", return_value=payment_object)
        command.process_contribution_via_retrieve_api(contribution)

    def test_process_contribution_via_retrieve_api_when_payment_object_pm_not_object(
        self, mocker, command, one_time_contribution_with_pi_with_non_conforming_contribution_metadata
    ):
        contribution, payment_object = one_time_contribution_with_pi_with_non_conforming_contribution_metadata
        payment_object.payment_method = "pm_99999"
        mocker.patch.object(command, "get_stripe_payment_object_for_contribution", return_value=payment_object)
        command.process_contribution_via_retrieve_api(contribution)

    def test_process_contributions_via_retrieve_api_when_not_updated(self, mocker, command):
        contribution = ContributionFactory()
        mocker.patch.object(command, "process_contribution_via_retrieve_api", return_value=(contribution, False))
        command.process_contributions_via_retrieve_api(Contribution.objects.all())

    def test_process_contributions_via_search_api_when_no_pm(self, mocker, command, stripe_subscription):
        ContributionFactory(monthly_subscription=True)
        mocker.patch.object(command, "get_metadata_queries", side_effect=[[], [("acct_id", "somequery")]])
        stripe_subscription.default_payment_method = None
        mocker.patch.object(command, "search_subscriptions", return_value=[stripe_subscription])
        mocker.patch.object(command, "get_pm_from_subscription", return_value=None)
        command.process_contributions_via_search_api(Contribution.objects.all())

    def test_process_contributions_via_search_api_when_no_contribution(self, mocker, command, stripe_subscription):
        ContributionFactory(monthly_subscription=True)
        mocker.patch.object(command, "get_metadata_queries", side_effect=[[], [("acct_id", "somequery")]])
        stripe_subscription.default_payment_method = "truthy"
        mocker.patch.object(command, "search_subscriptions", return_value=[stripe_subscription])
        command.process_contributions_via_search_api(Contribution.objects.all())

    def test_process_contributions_via_search_api_when_multiple_contributions(
        self, mocker, command, payment_method, stripe_subscription, faker
    ):
        # We need separate subscription IDs to avoid integrity exceptions.
        subs = []
        for _ in range(2):
            sub = deepcopy(stripe_subscription)
            sub.id = f"sub_{faker.uuid4()}"
            sub.default_payment_method = payment_method
            ContributionFactory(monthly_subscription=True, provider_subscription_id=sub.id)
            subs.append(sub)
        mocker.patch.object(command, "get_metadata_queries", side_effect=[[], [("acct_id", "somequery")]])
        mocker.patch.object(command, "search_subscriptions", return_value=subs)
        command.process_contributions_via_search_api(Contribution.objects.all())

    @pytest.fixture
    def subscription_with_default_pm(self, stripe_subscription, payment_method):
        stripe_subscription.default_payment_method = payment_method
        return stripe_subscription

    @pytest.fixture
    def subscription_with_pm_on_customer_invoice_settings(self, stripe_subscription, payment_method):
        stripe_subscription.default_payment_method = None
        stripe_subscription.customer.invoice_settings.default_payment_method = payment_method
        return stripe_subscription

    @pytest.fixture
    def subscription_with_pm_on_latest_invoice_pi(
        self, stripe_subscription, payment_method, payment_intent_for_one_time_contribution
    ):
        stripe_subscription.default_payment_method = None
        stripe_subscription.customer.invoice_settings.default_payment_method = None
        payment_intent_for_one_time_contribution.payment_method = payment_method
        invoice = stripe.Invoice.construct_from(
            {"payment_intent": payment_intent_for_one_time_contribution, "id": "inv_1"}, key="fake-key"
        )
        stripe_subscription.latest_invoice = invoice
        stripe_subscription.latest_invoice.payment_intent.payment_method = payment_method
        return stripe_subscription

    @pytest.fixture
    def subscription_with_no_pm(self, subscription_with_pm_on_latest_invoice_pi):
        subscription_with_pm_on_latest_invoice_pi.latest_invoice.payment_intent.payment_method = None
        return subscription_with_pm_on_latest_invoice_pi

    @pytest.fixture
    def subscription_with_customer_but_no_invoice_settings(self, subscription_with_pm_on_customer_invoice_settings):
        subscription_with_pm_on_customer_invoice_settings.customer.invoice_settings = None
        subscription_with_pm_on_customer_invoice_settings.latest_invoice = None
        return subscription_with_pm_on_customer_invoice_settings

    @pytest.fixture
    def subscription_with_latest_invoice_but_no_pi(self, subscription_with_pm_on_latest_invoice_pi):
        subscription_with_pm_on_latest_invoice_pi.latest_invoice.payment_intent = None
        return subscription_with_pm_on_latest_invoice_pi

    @pytest.mark.parametrize(
        ("subscription_fixture", "expect_pm"),
        [
            ("subscription_with_default_pm", True),
            ("subscription_with_pm_on_customer_invoice_settings", True),
            ("subscription_with_pm_on_latest_invoice_pi", True),
            ("subscription_with_no_pm", False),
            ("subscription_with_customer_but_no_invoice_settings", False),
            ("subscription_with_latest_invoice_but_no_pi", False),
        ],
    )
    def test_get_pm_from_subscription(self, command, request, subscription_fixture, expect_pm, payment_method):
        subscription = request.getfixturevalue(subscription_fixture)
        if expect_pm:
            assert command.get_pm_from_subscription(subscription) == payment_method
        else:
            assert command.get_pm_from_subscription(subscription) is None

    @pytest.mark.parametrize("has_dummies", [True, False])
    def test_set_remaining_dummy_payment_method_ids_to_null(self, has_dummies, command, settings):
        assert settings.DUMMY_PAYMENT_METHOD_ID
        qs = Contribution.objects.filter(provider_payment_method_id=settings.DUMMY_PAYMENT_METHOD_ID)
        if has_dummies:
            ContributionFactory(provider_payment_method_id=settings.DUMMY_PAYMENT_METHOD_ID)
            assert qs.exists()
        command.set_remaining_dummy_payment_method_ids_to_null()
        assert not qs.exists()


@pytest.mark.django_db
class Test_audit_recurring_contributions:
    @pytest.fixture
    def command(self):
        return AuditRecurringContributions()

    def test_handle(self, mocker, command):
        id1 = "acct_1"
        id2 = "acct_2"
        mocker.patch(
            "apps.contributions.management.commands.audit_recurring_contributions.get_stripe_accounts_and_their_connection_status",
            return_value={id1: True, id2: False},
        )
        mock_do_audit = mocker.patch.object(command, "do_audit")
        command.handle(for_stripe_accounts=[id1, id2])
        mock_do_audit.assert_called_once_with(stripe_account_id=id1)

    @pytest.fixture
    def orphaned_contribution(self, donation_page):
        return ContributionFactory(
            provider_subscription_id="sub_orphaned",
            monthly_subscription=True,
            donation_page=donation_page,
        )

    @pytest.fixture
    def contributions_with_unexpected_status_result(self, donation_page):
        con = ContributionFactory(
            monthly_subscription=True,
            donation_page=donation_page,
        )
        return (
            Contribution.objects.filter(id=con.id)
            .annotate(
                expected_status=Value("paid", output_field=CharField()),
                subscription_status=Value("past_due", output_field=CharField()),
            )
            .values(
                "id",
                "provider_subscription_id",
                "expected_status",
                "status",
                "subscription_status",
            )
        )

    @pytest.mark.parametrize(
        ("plan_interval", "expected_interval"),
        [("month", ContributionInterval.MONTHLY), ("year", ContributionInterval.YEARLY), ("unexpected", None)],
    )
    def test_get_expected_interval(self, command, plan_interval, expected_interval, stripe_subscription):
        stripe_subscription["items"].data[0].plan.interval = plan_interval
        if expected_interval is None:
            with pytest.raises(ValueError, match=f"Unexpected interval {plan_interval}"):
                command.get_expected_interval(stripe_subscription)
        else:
            assert command.get_expected_interval(stripe_subscription) == expected_interval

    def test_do_audit(
        self,
        mocker,
        command,
        contributions_with_unexpected_status_result,
        orphaned_contribution,
        request,
        faker,
    ):

        subs = []
        for _ in range(3):
            sub = request.getfixturevalue("stripe_subscription")
            sub.id = faker.uuid4()
            subs.append(sub)
        mocker.patch(
            "apps.contributions.management.commands.audit_recurring_contributions.Command.get_stripe_subscriptions_for_account",
            return_value=subs,
        )
        mock_contributions_qs = mocker.patch(
            "apps.contributions.management.commands.audit_recurring_contributions.Command.get_recurring_contributions_for_account"
        )
        mock_contributions_qs.return_value = Contribution.objects.filter(
            id__in=[orphaned_contribution.id, contributions_with_unexpected_status_result.first()["id"]]
        )
        mocker.patch(
            "apps.contributions.management.commands.audit_recurring_contributions.Command.get_contributions_with_mismatched_data",
            return_value=contributions_with_unexpected_status_result,
        )
        command.do_audit(stripe_account_id="acct_1")

    @pytest.fixture
    def contribution_and_sub_with_matched_status(self, stripe_subscription):
        con = ContributionFactory(
            status=ContributionStatus.PAID,
            monthly_subscription=True,
            provider_subscription_id=stripe_subscription.id,
            amount=stripe_subscription["items"].data[0].plan.amount,
        )
        return con, stripe_subscription

    @pytest.fixture
    def contribution_and_sub_with_mismatched_status(self, stripe_subscription, faker):
        stripe_subscription = deepcopy(stripe_subscription)
        stripe_subscription.id = faker.uuid4()
        stripe_subscription.status = "canceled"
        con = ContributionFactory(
            status=ContributionStatus.PAID,
            monthly_subscription=True,
            provider_subscription_id=stripe_subscription.id,
            amount=stripe_subscription["items"].data[0].plan.amount,
        )
        return con, stripe_subscription

    @pytest.fixture
    def contribution_and_sub_with_mismatched_interval(self, faker, stripe_subscription):
        stripe_subscription = deepcopy(stripe_subscription)
        stripe_subscription["items"].data[0].plan.interval = "month"
        stripe_subscription.id = faker.uuid4()
        con = ContributionFactory(
            annual_subscription=True,
            status=ContributionStatus.PAID,
            provider_subscription_id=stripe_subscription.id,
            amount=stripe_subscription["items"].data[0].plan.amount,
        )
        return con, stripe_subscription

    @pytest.fixture
    def contribution_and_sub_with_mismatched_amount(self, faker, stripe_subscription):
        stripe_subscription = deepcopy(stripe_subscription)
        stripe_subscription.id = faker.uuid4()
        con = ContributionFactory(
            status=ContributionStatus.PAID,
            monthly_subscription=True,
            provider_subscription_id=stripe_subscription.id,
            amount=stripe_subscription["items"].data[0].plan.amount + 1,
        )
        return con, stripe_subscription

    def test_get_contributions_with_mismatched_data(
        self,
        command,
        contribution_and_sub_with_matched_status,
        contribution_and_sub_with_mismatched_status,
        contribution_and_sub_with_mismatched_interval,
        contribution_and_sub_with_mismatched_amount,
    ):
        qs = command.get_contributions_with_mismatched_data(
            contributions=Contribution.objects.filter(
                id__in=[
                    contribution_and_sub_with_matched_status[0].id,
                    contribution_and_sub_with_mismatched_status[0].id,
                    contribution_and_sub_with_mismatched_interval[0].id,
                    contribution_and_sub_with_mismatched_amount[0].id,
                ]
            ),
            subscriptions=[
                contribution_and_sub_with_matched_status[1],
                contribution_and_sub_with_mismatched_status[1],
                contribution_and_sub_with_mismatched_interval[1],
                contribution_and_sub_with_mismatched_amount[1],
            ],
            stripe_account_id="acct_1",
        )
        assert qs.count() == 3
        assert qs.get(pk=contribution_and_sub_with_mismatched_status[0].id) == {
            "id": contribution_and_sub_with_mismatched_status[0].id,
            "provider_subscription_id": contribution_and_sub_with_mismatched_status[1].id,
            "expected_status": ContributionStatus.CANCELED,
            "status": contribution_and_sub_with_mismatched_status[0].status,
            "subscription_status": contribution_and_sub_with_mismatched_status[1].status,
            "expected_interval": ContributionInterval.MONTHLY,
            "interval": ContributionInterval.MONTHLY,
            "expected_amount": contribution_and_sub_with_mismatched_status[1]["items"].data[0].plan.amount,
            "amount": contribution_and_sub_with_mismatched_status[0].amount,
        }
        assert qs.get(pk=contribution_and_sub_with_mismatched_interval[0].id) == {
            "id": contribution_and_sub_with_mismatched_interval[0].id,
            "provider_subscription_id": contribution_and_sub_with_mismatched_interval[1].id,
            "expected_status": ContributionStatus.PAID,
            "status": contribution_and_sub_with_mismatched_interval[0].status,
            "subscription_status": contribution_and_sub_with_mismatched_interval[1].status,
            "expected_interval": ContributionInterval.MONTHLY,
            "interval": ContributionInterval.YEARLY,
            "expected_amount": contribution_and_sub_with_mismatched_interval[1]["items"].data[0].plan.amount,
            "amount": contribution_and_sub_with_mismatched_interval[0].amount,
        }
        assert qs.get(pk=contribution_and_sub_with_mismatched_amount[0].id) == {
            "id": contribution_and_sub_with_mismatched_amount[0].id,
            "provider_subscription_id": contribution_and_sub_with_mismatched_amount[1].id,
            "expected_status": ContributionStatus.PAID,
            "status": ContributionStatus.PAID,
            "subscription_status": contribution_and_sub_with_mismatched_amount[1].status,
            "expected_interval": ContributionInterval.MONTHLY,
            "interval": ContributionInterval.MONTHLY,
            "expected_amount": contribution_and_sub_with_mismatched_amount[1]["items"].data[0].plan.amount,
            "amount": contribution_and_sub_with_mismatched_amount[0].amount,
        }

    def test_get_stripe_subscriptions_for_account(self, mocker, command):
        stripe_search = mocker.patch("stripe.Subscription.search")
        stripe_search.return_value.auto_paging_iter.return_value = (
            subs := [stripe.Subscription.construct_from({"id": "sub_1"}, "fake-key")]
        )
        assert command.get_stripe_subscriptions_for_account("acct_1") == subs

    @pytest.fixture
    def recurring_contributions(self, monthly_contribution_multiple_payments):
        assert monthly_contribution_multiple_payments.donation_page
        assert monthly_contribution_multiple_payments._revenue_program is None
        return [
            monthly_contribution_multiple_payments,
            ContributionFactory(
                monthly_subscription=True,
                donation_page=None,
                _revenue_program=monthly_contribution_multiple_payments.revenue_program,
            ),
        ]

    def test_get_recurring_contributions_for_account(self, recurring_contributions, command):
        via_dp, _ = recurring_contributions
        stripe_account_id = via_dp.stripe_account_id
        contributions = command.get_recurring_contributions_for_account(stripe_account_id)
        assert contributions.count() == 2
        assert set(contributions.values_list("id", flat=True)) == {_.id for _ in recurring_contributions}

    def test_call_command(self, command, mocker):
        mocker.patch.object(command, "do_audit")
        call_command("audit_recurring_contributions", for_stripe_accounts="acct_1")


@pytest.mark.django_db
class Test_add_quarantine_status:
    @pytest.fixture
    def command(self):
        return AddQuarantineStatusCommand()

    @pytest.mark.usefixtures(
        "contribution_one_time_approved", "contribution_recurring_approved", "rejected_contributions"
    )
    @pytest.mark.parametrize("dry_run", [True, False])
    def test_handle(self, mocker, command, dry_run: bool):
        update_rejected_spy = mocker.spy(command, "update_rejected_contributions_quarantine_status")
        update_approved_spy = mocker.spy(command, "update_approved_contributions_quarantine_status")
        mock_save = mocker.patch("apps.contributions.models.Contribution.save")
        command.handle(dry_run=dry_run)
        update_rejected_spy.assert_called_once()
        update_approved_spy.assert_called_once()
        if dry_run:
            mock_save.assert_not_called()
        else:
            # there are total of 4 contributions to update because rejected contributions consists of 2
            assert mock_save.call_count == 4

    def test_update_contribution_quarantine_status(self, command, mocker, one_time_contribution):
        one_time_contribution.quarantine_status = None
        one_time_contribution.save()
        command.update_contribution_quarantine_status(one_time_contribution, QuarantineStatus.APPROVED_BY_UNKNOWN)

    @pytest.fixture
    def contribution_one_time_approved(self, one_time_contribution, settings):
        one_time_contribution.quarantine_status = None
        one_time_contribution.status = ContributionStatus.PAID
        one_time_contribution.bad_actor_score = settings.BAD_ACTOR_BAD_SCORE
        one_time_contribution.save()
        return one_time_contribution

    @pytest.fixture
    def contribution_recurring_approved(self, monthly_contribution):
        monthly_contribution.quarantine_status = None
        monthly_contribution.status = ContributionStatus.PAID
        monthly_contribution.provider_setup_intent_id = f"seti_{uuid.uuid4()}"
        monthly_contribution.save()
        return monthly_contribution

    def test_update_approved_contributions_quarantine_status(
        self,
        contribution_one_time_approved,
        contribution_recurring_approved,
        command,
    ):
        command.update_approved_contributions_quarantine_status()
        contribution_one_time_approved.refresh_from_db()
        contribution_recurring_approved.refresh_from_db()
        assert contribution_one_time_approved.quarantine_status == QuarantineStatus.APPROVED_BY_UNKNOWN
        assert contribution_recurring_approved.quarantine_status == QuarantineStatus.APPROVED_BY_UNKNOWN

    @pytest.fixture
    def rejected_contributions(self, settings):
        one_time_rejected = ContributionFactory(
            status=ContributionStatus.REJECTED,
            quarantine_status=None,
            interval=ContributionInterval.ONE_TIME,
            bad_actor_score=settings.BAD_ACTOR_BAD_SCORE,
        )
        recurring_rejected = ContributionFactory(
            status=ContributionStatus.REJECTED,
            quarantine_status=None,
            interval=ContributionInterval.MONTHLY,
            provider_subscription_id=f"sub_{uuid.uuid4()}",
            provider_setup_intent_id=f"seti_{uuid.uuid4()}",
        )
        return [one_time_rejected, recurring_rejected]

    def test_update_rejected_contributions_quarantine_status(self, command, rejected_contributions):
        command.update_rejected_contributions_quarantine_status()
        for con in rejected_contributions:
            con.refresh_from_db()
            assert con.quarantine_status == QuarantineStatus.REJECTED_BY_HUMAN_FOR_UNKNOWN
