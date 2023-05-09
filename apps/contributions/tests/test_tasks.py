from csv import DictReader
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.test import TestCase

import pytest
from addict import Dict as AttrDict

from apps.contributions import tasks as contribution_tasks
from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.tests.factories import ContributionFactory
from apps.contributions.utils import CONTRIBUTION_EXPORT_CSV_HEADERS


@pytest.fixture
def expiring_flagged_contributions(now):
    flagged_date = now - timedelta(settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA) - timedelta(days=1)
    return ContributionFactory.create_batch(2, status=ContributionStatus.FLAGGED, flagged_date=flagged_date)


@pytest.fixture
def non_expiring_flagged_contributions(now):
    flagged_date = now - timedelta(days=1)
    return ContributionFactory.create_batch(2, status=ContributionStatus.FLAGGED, flagged_date=flagged_date)


@pytest.mark.django_db
class AutoAcceptFlaggedContributionsTaskTest:
    def test_successful_captures(self, non_expiring_flagged_contributions, expiring_flagged_contributions, mocker):
        expected_update_count = len(expiring_flagged_contributions)
        mock_complete_payment = mocker.patch(
            "apps.contributions.payment_managers.StripePaymentManager.complete_payment"
        )
        succeeded, failed = contribution_tasks.auto_accept_flagged_contributions()
        mock_complete_payment.assert_called_n_times(expected_update_count)
        assert succeeded == expected_update_count
        assert failed == 0

    def test_unsuccessful_captures(self, mocker, expiring_flagged_contributions, non_expiring_flagged_contributions):
        mock_complete_payment = mocker.patch(
            "apps.contributions.payment_managers.StripePaymentManager.complete_payment"
        )
        succeeded, failed = contribution_tasks.auto_accept_flagged_contributions()
        mock_complete_payment.side_effect = PaymentProviderError
        mock_complete_payment.assert_called_n_times(expected_len := len(expiring_flagged_contributions))
        assert failed == expected_len
        assert succeeded == 0

    def test_only_acts_on_flagged(self, mocker, non_expiring_flagged_contributions):
        mock_complete_payment = mocker.patch(
            "apps.contributions.payment_managers.StripePaymentManager.complete_payment"
        )
        succeeded, failed = contribution_tasks.auto_accept_flagged_contributions()
        mock_complete_payment.assert_not_called()
        assert succeeded == 0
        assert failed == 0


class TestTaskStripeContributions(TestCase):
    @patch("apps.contributions.tasks.task_pull_payment_intents.delay")
    @patch(
        "apps.contributions.stripe_contributions_provider.StripeContributionsProvider.generate_chunked_customers_query"
    )
    def test_task_pull_serialized_stripe_contributions_to_cache(self, customers_query_mock, pull_payment_intents_mock):
        customers_query_mock.return_value = [
            "customer:'cust_0' OR customer:'cust_1'",
            "customer:'cust_2' OR customer:'cust_3'",
            "customer:'cust_4' OR customer:'cust_5'",
        ]
        contribution_tasks.task_pull_serialized_stripe_contributions_to_cache("test@email.com", "acc_00000")
        self.assertEqual(pull_payment_intents_mock.call_count, 3)

    @patch("apps.contributions.stripe_contributions_provider.StripeContributionsProvider.fetch_payment_intents")
    @patch("apps.contributions.tasks.ContributionsCacheProvider")
    @patch("apps.contributions.tasks.SubscriptionsCacheProvider")
    def test_task_pull_payment_intents(self, sub_cache_mock, contrib_cache_mock, fetch_payment_intents_mock):
        mock_1 = MagicMock()
        mock_1.has_more = True
        mock_1.__iter__.return_value = [AttrDict(**{"id": "ch_000000", "invoice": None})]

        mock_2 = MagicMock()
        mock_2.has_more = False
        mock_2.__iter__.return_value = [AttrDict(**{"id": "ch_000001", "invoice": None})]

        fetch_payment_intents_mock.side_effect = [mock_1, mock_2]
        contribution_tasks.task_pull_payment_intents(
            "test@email.com", "customer:'cust_0' OR customer:'cust_1'", "acc_0000"
        )
        self.assertEqual(fetch_payment_intents_mock.call_count, 2)


@pytest.mark.django_db
class TestEmailContributionCsvExportToUser:
    def test_when_all_requesetd_contributions_found(self, monkeypatch, mocker, org_user_free_plan):
        """Show happy path behavior when all of requested contributions are found and included in export

        Note that we rely on narrow unit testing of export_contributions_to_csv elsewhere. We only assert that
        expected rows show up based on value for contribution id, but we don't test any other attributes at row
        level in this test.
        """
        contributions = ContributionFactory.create_batch(size=10)
        monkeypatch.setattr(
            "apps.contributions.tasks.send_templated_email_with_attachment", lambda *args, **kwargs: None
        )
        send_email_spy = mocker.spy(contribution_tasks, "send_templated_email_with_attachment")
        make_csv_spy = mocker.spy(contribution_tasks, "export_contributions_to_csv")
        contribution_tasks.email_contribution_csv_export_to_user(
            [x.id for x in contributions], org_user_free_plan.email
        )
        send_email_spy.assert_called_once()
        make_csv_spy.assert_called_once()
        assert set(make_csv_spy.call_args[0][0]) == set(
            Contribution.objects.filter(id__in=[x.id for x in contributions])
        )
        assert send_email_spy.call_args[1]["to"] == org_user_free_plan.email
        assert send_email_spy.call_args[1]["subject"] == "Check out your Contributions"
        assert send_email_spy.call_args[1]["text_template"] == "nrh-contribution-csv-email-body.txt"
        assert send_email_spy.call_args[1]["html_template"] == "nrh-contribution-csv-email-body.html"
        data = [row for row in DictReader(send_email_spy.call_args[1]["attachment"].splitlines())]
        assert set(data[0].keys()) == set(CONTRIBUTION_EXPORT_CSV_HEADERS)
        assert set([str(_.pk) for _ in contributions]) == set([_["Contribution ID"] for _ in data])

    def test_when_some_requested_contributions_missing(self, org_user_free_plan, monkeypatch, mocker):
        """Show behavior when some requested contributions are not found

        In this case, the task should still succeed, generating a CSV with a subset of the requested contributions.

        Additionally, it will log a warning.
        """
        contributions = ContributionFactory.create_batch(size=10)
        ids = [x.id for x in contributions]
        deleted = contributions.pop(0)
        deleted_id = deleted.id
        deleted.delete()
        monkeypatch.setattr(
            "apps.contributions.tasks.send_templated_email_with_attachment", lambda *args, **kwargs: None
        )
        send_email_spy = mocker.spy(contribution_tasks, "send_templated_email_with_attachment")
        make_csv_spy = mocker.spy(contribution_tasks, "export_contributions_to_csv")
        logger_spy = mocker.spy(contribution_tasks.logger, "warning")
        contribution_tasks.email_contribution_csv_export_to_user(ids, org_user_free_plan.email)
        send_email_spy.assert_called_once()
        make_csv_spy.assert_called_once()
        assert set(make_csv_spy.call_args[0][0]) == set(Contribution.objects.filter(id__in=ids))
        assert send_email_spy.call_args[1]["to"] == org_user_free_plan.email
        assert send_email_spy.call_args[1]["subject"] == "Check out your Contributions"
        assert send_email_spy.call_args[1]["text_template"] == "nrh-contribution-csv-email-body.txt"
        assert send_email_spy.call_args[1]["html_template"] == "nrh-contribution-csv-email-body.html"
        data = [row for row in DictReader(send_email_spy.call_args[1]["attachment"].splitlines())]
        assert set(str(x) for x in ids).difference(set([_["Contribution ID"] for _ in data])) == {str(deleted_id)}
        logger_spy.assert_called_once_with(
            (
                "`email_contribution_csv_export_to_user` was unable to locate %s of %s requested contributions. The following "
                "IDs could not be found: %s"
            ),
            1,
            len(ids),
            str(deleted_id),
        )

    def test_when_contribution_ids_is_empty_list(self, org_user_free_plan, monkeypatch, mocker):
        """Show behavior when task called with empty list for contributions ids

        In this case, a CSV with only headers will be sent.
        """
        ids = []
        monkeypatch.setattr(
            "apps.contributions.tasks.send_templated_email_with_attachment", lambda *args, **kwargs: None
        )
        send_email_spy = mocker.spy(contribution_tasks, "send_templated_email_with_attachment")
        make_csv_spy = mocker.spy(contribution_tasks, "export_contributions_to_csv")
        contribution_tasks.email_contribution_csv_export_to_user(ids, org_user_free_plan.email)
        send_email_spy.assert_called_once()
        make_csv_spy.assert_called_once()
        assert set(make_csv_spy.call_args[0][0]) == set(Contribution.objects.none())
        assert send_email_spy.call_args[1]["to"] == org_user_free_plan.email
        assert send_email_spy.call_args[1]["subject"] == "Check out your Contributions"
        assert send_email_spy.call_args[1]["text_template"] == "nrh-contribution-csv-email-body.txt"
        assert send_email_spy.call_args[1]["html_template"] == "nrh-contribution-csv-email-body.html"
        assert len([row for row in DictReader(send_email_spy.call_args[1]["attachment"].splitlines())]) == 0
