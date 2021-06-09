from datetime import timedelta
from unittest.mock import patch

from django.conf import settings
from django.test import TestCase
from django.utils import timezone

from apps.contributions.models import ContributionStatus
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.tasks import auto_accept_flagged_contributions
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
