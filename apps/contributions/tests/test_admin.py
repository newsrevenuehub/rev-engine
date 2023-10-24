import json
from unittest import mock

import django
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.messages.api import MessageFailure
from django.contrib.messages.storage.fallback import FallbackStorage
from django.test import RequestFactory, TestCase
from django.urls import reverse

import pytest
from bs4 import BeautifulSoup as bs4
from reversion_compare.admin import CompareVersionAdmin

import apps
from apps.common.tests.test_utils import setup_request
from apps.contributions.admin import ContributionAdmin
from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
    PaymentFactory,
)
from apps.organizations.tests.factories import (
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
from apps.pages.tests.factories import DonationPageFactory


@pytest.mark.django_db
class TestContributorAdmin:
    def test_views_stand_up(self, client, admin_user):
        contributor = ContributorFactory()
        client.force_login(admin_user)
        for x in [
            reverse("admin:contributions_contributor_changelist"),
            reverse("admin:contributions_contributor_add"),
        ]:
            assert client.get(x, follow=True).status_code == 200
        assert (
            client.get(
                reverse("admin:contributions_contributor_change", args=[contributor.pk]), follow=True
            ).status_code
            == 200
        )


@pytest.mark.django_db
class TestPaymentAdmin:
    @pytest.fixture()
    def payment(self):
        return PaymentFactory()

    def test_list_view(self, payment, client, admin_user):
        response = client.get(reverse("admin:contributions_payment_changelist"), follow=True)
        assert response.status_code == 200

    def test_detail_view(self, payment, client, admin_user):
        response = client.get(reverse("admin:contributions_payment_change", args=[payment.pk]), follow=True)
        assert response.status_code == 200

    def test_provider_charge_link(self, payment, client, admin_user):
        client.force_login(admin_user)
        response = client.get(reverse("admin:contributions_payment_change", args=[payment.pk]), follow=True)
        assert response.status_code == 200
        link = bs4(response.content, "html.parser").find("a", string=payment.stripe_charge_id)
        assert (
            link["href"]
            == f"https://dashboard.stripe.com/{payment.contribution.donation_page.revenue_program.payment_provider.stripe_account_id}/test/payments/{payment.stripe_charge_id}"
        )

    def test_provider_event_link(self, payment, client, admin_user):
        client.force_login(admin_user)
        response = client.get(reverse("admin:contributions_payment_change", args=[payment.pk]), follow=True)
        assert response.status_code == 200
        link = bs4(response.content, "html.parser").find("a", string=payment.stripe_event_id)
        assert (
            link["href"]
            == f"https://dashboard.stripe.com/{payment.contribution.donation_page.revenue_program.payment_provider.stripe_account_id}/test/events/{payment.stripe_event_id}"
        )


@mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None)
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
            # This is to squash a side effect in contribution.save
            # TODO: DEV-3026
            # set these to `None` because there is override of save in
            # contributions models file that causes stripe payment data to be fetched
            # in certain circumstances
            provider_payment_method_id=None,
        )
        self.contrib_score_4 = ContributionFactory(
            status=ContributionStatus.FLAGGED,
            bad_actor_score=4,
            donation_page=self.donation_page,
            payment_provider_used="Stripe",
            # This is to squash a side effect in contribution.save
            # TODO: DEV-3026
            # set these to `None` because there is override of save in
            # contributions models file that causes stripe payment data to be fetched
            # in certain circumstances
            provider_payment_method_id=None,
        )

    def _make_listview_request(self):
        return self.factory.get(reverse("admin:contributions_contribution_changelist"))

    @mock.patch("apps.contributions.payment_managers.StripePaymentManager.complete_payment")
    def test_accept_flagged_contribution(self, mock_complete_payment, mock_fetch_stripe_payment_method):
        self.contribution_admin.message_user = mock.Mock()
        request = self._make_listview_request()
        setup_request(self.user, request)
        queryset = Contribution.objects.all()

        self.contribution_admin.accept_flagged_contribution(request, queryset)
        self.assertEqual(mock_complete_payment.call_count, len(queryset))
        mock_complete_payment.assert_called_with(reject=False)
        assert django.contrib.messages.SUCCESS == self.contribution_admin.message_user.call_args.args[2]

    @mock.patch("apps.contributions.payment_managers.StripePaymentManager.complete_payment")
    def test_reject_flagged_contribution(self, mock_complete_payment, mock_fetch_stripe_payment_method):
        self.contribution_admin.message_user = mock.Mock()
        request = self._make_listview_request()
        setup_request(self.user, request)
        queryset = Contribution.objects.all()
        self.contribution_admin.reject_flagged_contribution(request, queryset)
        self.assertEqual(mock_complete_payment.call_count, len(queryset))
        mock_complete_payment.assert_called_with(reject=True)
        assert django.contrib.messages.SUCCESS == self.contribution_admin.message_user.call_args.args[2]

    @mock.patch("apps.contributions.payment_managers.StripePaymentManager.complete_payment")
    def test_failed_reject_flagged_contribution(self, mock_complete_payment, mock_fetch_stripe_payment_method):
        self.contribution_admin.message_user = mock.Mock()
        mock_complete_payment.side_effect = apps.contributions.payment_managers.PaymentProviderError
        request = self._make_listview_request()
        setup_request(self.user, request)
        queryset = Contribution.objects.all()
        self.contribution_admin.reject_flagged_contribution(request, queryset)
        assert django.contrib.messages.ERROR == self.contribution_admin.message_user.call_args.args[2]

    def test_reject_non_flagged_fails(self, mock_fetch_stripe_payment_method):
        request = self._make_listview_request()
        contribution = ContributionFactory(bad_actor_score=5, status=ContributionStatus.PAID)
        queryset = Contribution.objects.filter(pk=contribution.pk)
        with pytest.raises(MessageFailure):
            self.contribution_admin.accept_flagged_contribution(request, queryset)

    @mock.patch("apps.contributions.models.Contribution.process_flagged_payment")
    def test_accept_or_reject_after_paid_fails(self, process_flagged_payment, _):
        request = self._make_listview_request()
        contribution = ContributionFactory(bad_actor_score=5, status=ContributionStatus.PAID)
        queryset = Contribution.objects.filter(pk=contribution.pk)
        setattr(request, "session", "session")
        messages = FallbackStorage(request)
        setattr(request, "_messages", messages)
        self.contribution_admin.accept_flagged_contribution(request, queryset)
        self.contribution_admin.reject_flagged_contribution(request, queryset)
        assert not process_flagged_payment.called

    def test_provider_payment_link(self, mock_fetch_stripe_payment_method):
        contribution = ContributionFactory(provider_payment_id="pi_1234")
        assert (
            self.contribution_admin.provider_payment_link(contribution) == f"<a href='"
            f"https://dashboard.stripe.com/test/connect/accounts/{contribution.stripe_account_id}/payments/{contribution.provider_payment_id}' target='_blank'>{contribution.provider_payment_id}</a>"
        )

    def test_provider_subscription_link(self, mock_fetch_stripe_payment_method):
        contribution = ContributionFactory(provider_subscription_id="sub_1234")
        assert (
            self.contribution_admin.provider_subscription_link(contribution) == f"<a href='"
            f"https://dashboard.stripe.com/test/connect/accounts/{contribution.stripe_account_id}/subscriptions/{contribution.provider_subscription_id}' target='_blank'>{contribution.provider_subscription_id}</a>"
        )

    def test_provider_customer_link(self, mock_fetch_stripe_payment_method):
        contribution = ContributionFactory(provider_customer_id="cus_1234")
        assert (
            self.contribution_admin.provider_customer_link(contribution) == f"<a href='"
            f"https://dashboard.stripe.com/test/connect/accounts/{contribution.stripe_account_id}/customers/{contribution.provider_customer_id}' target='_blank'>{contribution.provider_customer_id}</a>"
        )

    def test_links_not_available(self, mock_fetch_stripe_payment_method):
        contribution = ContributionFactory(
            provider_customer_id=None, provider_subscription_id=None, provider_payment_id=None
        )
        assert self.contribution_admin.provider_customer_link(contribution) == "-"
        assert self.contribution_admin.provider_payment_link(contribution) == "-"
        assert self.contribution_admin.provider_subscription_link(contribution) == "-"

    def test_bad_actor_response_pretty(self, mock_fetch_stripe_payment_method):
        with open("apps/contributions/tests/fixtures/bad-actor-response.json") as fl:
            contribution = ContributionFactory(bad_actor_response=json.load(fl))
        output = self.contribution_admin.bad_actor_response_pretty(contribution)
        assert isinstance(output, str)
        assert len(output)

    def test_payment_provider_data_pretty(self, mock_fetch_stripe_payment_method):
        with open("apps/contributions/tests/fixtures/payment-provider-data-monthly-contribution.json") as fl:
            contribution = ContributionFactory(payment_provider_data=json.load(fl))
        output = self.contribution_admin.payment_provider_data_pretty(contribution)
        assert isinstance(output, str)
        assert len(output)

    def test_provider_payment_method_details_pretty(self, mock_fetch_stripe_payment_method):
        with open("apps/contributions/tests/fixtures/provider-payment-method-details.json") as fl:
            contribution = ContributionFactory(provider_payment_method_details=json.load(fl))
        output = self.contribution_admin.provider_payment_method_details_pretty(contribution)
        assert isinstance(output, str)
        assert len(output)

    def test_will_create_revisions_from_admin_actions(self, *args, **kwargs):
        """We treat CompareVersionAdmin as a blackbox that should be depended on to consistently produce

        revisions when admin users create, save, and delete from the admin. In other parts of the app, we
        do more to ensure that revisions are created, but in the admin, we should be able to rely on
        CompareVersionAdmin to do the right thing.
        """
        assert isinstance(self.contribution_admin, CompareVersionAdmin)
