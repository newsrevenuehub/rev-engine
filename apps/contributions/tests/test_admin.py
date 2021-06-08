from unittest.mock import patch

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.messages.api import MessageFailure
from django.test import RequestFactory, TestCase
from django.urls import reverse

from apps.common.tests.test_utils import setup_request
from apps.contributions.admin import BadActorScoreFilter, ContributionAdmin
from apps.contributions.models import Contribution
from apps.contributions.tests.factories import ContributionFactory
from apps.organizations.tests.factories import OrganizationFactory


class ContributionAdminTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        user_model = get_user_model()
        self.user = user_model.objects.create_superuser(email="test@test.com", password="testing")
        self.contribution_admin = ContributionAdmin(Contribution, AdminSite())

        self.organization = OrganizationFactory(default_payment_provider="stripe")

        self.contrib_score_2 = ContributionFactory(
            status=Contribution.FLAGGED[0],
            bad_actor_score=2,
            organization=self.organization,
            payment_provider_used="Stripe",
        )
        self.contrib_score_4 = ContributionFactory(
            status=Contribution.FLAGGED[0],
            bad_actor_score=4,
            organization=self.organization,
            payment_provider_used="Stripe",
        )

    def _make_listview_request(self):
        return self.factory.get(reverse("admin:contributions_contribution_changelist"))

    @patch("apps.contributions.payment_managers.StripePaymentManager.complete_payment")
    def test_accept_flagged_contribution(self, mock_complete_payment):
        request = self._make_listview_request()
        setup_request(self.user, request)
        queryset = Contribution.objects.all()
        self.contribution_admin.accept_flagged_contribution(request, queryset)
        self.assertEqual(mock_complete_payment.call_count, len(queryset))
        mock_complete_payment.assert_called_with(reject=False)

    @patch("apps.contributions.payment_managers.StripePaymentManager.complete_payment")
    def test_reject_flagged_contribution(self, mock_complete_payment):
        request = self._make_listview_request()
        setup_request(self.user, request)
        queryset = Contribution.objects.all()
        self.contribution_admin.reject_flagged_contribution(request, queryset)
        self.assertEqual(mock_complete_payment.call_count, len(queryset))
        mock_complete_payment.assert_called_with(reject=True)

    def test_reject_non_flagged_fails(self):
        request = self._make_listview_request()
        contribution = ContributionFactory(bad_actor_score=5, status=Contribution.PAID[0])
        queryset = Contribution.objects.filter(pk=contribution.pk)
        self.assertRaises(MessageFailure, self.contribution_admin.accept_flagged_contribution, request, queryset)

    def test_bad_actor_score_filter(self):
        target_score = 2
        ba_score_filter = BadActorScoreFilter(None, {"bad_actor_score": target_score}, Contribution, ContributionAdmin)
        filtered_contribs = ba_score_filter.queryset(None, Contribution.objects.all())
        self.assertIn(self.contrib_score_2, filtered_contribs)
        self.assertNotIn(self.contrib_score_4, filtered_contribs)

    def test_bad_actor_score_filter_all(self):
        ba_score_filter = BadActorScoreFilter(None, {}, Contribution, ContributionAdmin)
        all_contribs = Contribution.objects.all()
        filtered_contribs = ba_score_filter.queryset(None, all_contribs)
        self.assertEqual(len(filtered_contribs), len(all_contribs))
        self.assertIn(self.contrib_score_2, filtered_contribs)
        self.assertIn(self.contrib_score_4, filtered_contribs)
