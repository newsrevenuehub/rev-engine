from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.test import TestCase
from django.utils import timezone

from apps.common.utils import AttrDict
from apps.contributions.models import ContributionStatus
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.tasks import (
    auto_accept_flagged_contributions,
    task_pull_payment_intents,
    task_pull_serialized_stripe_contributions_to_cache,
)
from apps.contributions.tests.factories import ContributionFactory


class AutoAcceptFlaggedContributionsTaskTest(TestCase):
    def setUp(self):
        self.expired_contrib_count = 2
        self.non_expired_contrib_count = 3

    def _create_contributions(self, flagged=True):
        status = ContributionStatus.FLAGGED if flagged else ContributionStatus.PAID
        expiring_flagged_data = timezone.now() - settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA - timedelta(days=1)
        non_expiring_flagged_date = timezone.now() - timedelta(days=1)
        ContributionFactory.create_batch(self.expired_contrib_count, status=status, flagged_date=expiring_flagged_data)
        ContributionFactory.create_batch(
            self.non_expired_contrib_count, status=status, flagged_date=non_expiring_flagged_date
        )

    @patch("apps.contributions.payment_managers.StripePaymentManager.complete_payment")
    def test_successful_captures(self, mock_complete_payment):
        self._create_contributions()
        succeeded, failed = auto_accept_flagged_contributions()
        self.assertEqual(mock_complete_payment.call_count, self.expired_contrib_count)
        self.assertEqual(succeeded, self.expired_contrib_count)
        self.assertEqual(failed, 0)

    @patch(
        "apps.contributions.payment_managers.StripePaymentManager.complete_payment", side_effect=PaymentProviderError
    )
    def test_unsuccessful_captures(self, mock_complete_payment):
        self._create_contributions()
        succeeded, failed = auto_accept_flagged_contributions()
        self.assertEqual(mock_complete_payment.call_count, self.expired_contrib_count)
        self.assertEqual(failed, self.expired_contrib_count)
        self.assertEqual(succeeded, 0)

    @patch("apps.contributions.payment_managers.StripePaymentManager.complete_payment")
    def test_only_acts_on_flagged(self, mock_complete_payment):
        self._create_contributions(flagged=False)
        mock_complete_payment.assert_not_called()


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
        task_pull_serialized_stripe_contributions_to_cache("test@email.com", "acc_00000")
        self.assertEqual(pull_payment_intents_mock.call_count, 3)

    @patch("apps.contributions.stripe_contributions_provider.StripeContributionsProvider.fetch_payment_intents")
    @patch("apps.contributions.tasks.ContributionsCacheProvider")
    def test_task_pull_payment_intents(self, cache_provider_mock, fetch_payment_intents_mock):
        mock_1 = MagicMock()
        mock_1.has_more = True
        mock_1.__iter__.return_value = [AttrDict(**{"id": "ch_000000", "invoice": None})]

        mock_2 = MagicMock()
        mock_2.has_more = False
        mock_2.__iter__.return_value = [AttrDict(**{"id": "ch_000001", "invoice": None})]

        fetch_payment_intents_mock.side_effect = [mock_1, mock_2]
        task_pull_payment_intents("test@email.com", "customer:'cust_0' OR customer:'cust_1'", "acc_0000")
        self.assertEqual(fetch_payment_intents_mock.call_count, 2)
