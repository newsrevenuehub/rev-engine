from unittest import mock

import django
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.messages.api import MessageFailure
from django.test import RequestFactory, TestCase
from django.urls import reverse

import pytest

import apps
from apps.common.tests.test_utils import setup_request
from apps.contributions.admin import BadActorScoreFilter, ContributionAdmin
from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.tests.factories import ContributionFactory
from apps.organizations.tests.factories import (
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
from apps.pages.tests.factories import DonationPageFactory


class ContributionAdminTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        user_model = get_user_model()
        self.user = user_model.objects.create_superuser(email="test@test.com", password="testing")
        self.contribution_admin = ContributionAdmin(Contribution, AdminSite())

        self.organization = OrganizationFactory()
        payment_provider = PaymentProviderFactory()
        revenue_program = RevenueProgramFactory(organization=self.organization, payment_provider=payment_provider)
        self.donation_page = DonationPageFactory(revenue_program=revenue_program)

        self.contrib_score_2 = ContributionFactory(
            status=ContributionStatus.FLAGGED,
            bad_actor_score=2,
            donation_page=self.donation_page,
            payment_provider_used="Stripe",
        )
        self.contrib_score_4 = ContributionFactory(
            status=ContributionStatus.FLAGGED,
            bad_actor_score=4,
            donation_page=self.donation_page,
            payment_provider_used="Stripe",
        )

    def _make_listview_request(self):
        return self.factory.get(reverse("admin:contributions_contribution_changelist"))

    @mock.patch("apps.contributions.payment_managers.StripePaymentManager.complete_payment")
    def test_accept_flagged_contribution(self, mock_complete_payment):
        self.contribution_admin.message_user = mock.Mock()
        request = self._make_listview_request()
        setup_request(self.user, request)
        queryset = Contribution.objects.all()
        self.contribution_admin.accept_flagged_contribution(request, queryset)
        self.assertEqual(mock_complete_payment.call_count, len(queryset))
        mock_complete_payment.assert_called_with(reject=False)
        assert django.contrib.messages.SUCCESS == self.contribution_admin.message_user.call_args.args[2]

    @mock.patch("apps.contributions.payment_managers.StripePaymentManager.complete_payment")
    def test_reject_flagged_contribution(self, mock_complete_payment):
        self.contribution_admin.message_user = mock.Mock()
        request = self._make_listview_request()
        setup_request(self.user, request)
        queryset = Contribution.objects.all()
        self.contribution_admin.reject_flagged_contribution(request, queryset)
        self.assertEqual(mock_complete_payment.call_count, len(queryset))
        mock_complete_payment.assert_called_with(reject=True)
        assert django.contrib.messages.SUCCESS == self.contribution_admin.message_user.call_args.args[2]

    @mock.patch("apps.contributions.payment_managers.StripePaymentManager.complete_payment")
    def test_failed_reject_flagged_contribution(self, mock_complete_payment):
        self.contribution_admin.message_user = mock.Mock()
        mock_complete_payment.side_effect = apps.contributions.payment_managers.PaymentProviderError
        request = self._make_listview_request()
        setup_request(self.user, request)
        queryset = Contribution.objects.all()
        self.contribution_admin.reject_flagged_contribution(request, queryset)
        assert django.contrib.messages.ERROR == self.contribution_admin.message_user.call_args.args[2]

    def test_reject_non_flagged_fails(self):
        request = self._make_listview_request()
        contribution = ContributionFactory(bad_actor_score=5, status=ContributionStatus.PAID)
        queryset = Contribution.objects.filter(pk=contribution.pk)
        with pytest.raises(MessageFailure):
            self.contribution_admin.accept_flagged_contribution(request, queryset)

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

    def test_provider_payment_link(self):
        for contribution in Contribution.objects.all():
            assert (
                self.contribution_admin.provider_payment_link(contribution) == f"<a href='"
                f"https://dashboard.stripe.com/test/connect/accounts/{contribution.stripe_account_id}/payments/{contribution.provider_payment_id}' target='_blank'>{contribution.provider_payment_id}</a>"
            )

    def test_provider_subscription_link(self):
        for contribution in Contribution.objects.all():
            assert (
                self.contribution_admin.provider_subscription_link(contribution) == f"<a href='"
                f"https://dashboard.stripe.com/test/connect/accounts/{contribution.stripe_account_id}/subscriptions/{contribution.provider_subscription_id}' target='_blank'>{contribution.provider_subscription_id}</a>"
            )

    def test_provider_customer_link(self):
        for contribution in Contribution.objects.all():
            assert (
                self.contribution_admin.provider_customer_link(contribution) == f"<a href='"
                f"https://dashboard.stripe.com/test/connect/accounts/{contribution.stripe_account_id}/customers/{contribution.provider_customer_id}' target='_blank'>{contribution.provider_customer_id}</a>"
            )
