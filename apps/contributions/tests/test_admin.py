import json
from pathlib import Path
from unittest import mock

import django
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.messages.api import MessageFailure
from django.contrib.messages.storage.fallback import FallbackStorage
from django.test import RequestFactory, TestCase
from django.urls import reverse

import pytest
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
from apps.organizations.models import PaymentProvider
from apps.organizations.tests.factories import (
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
from apps.pages.tests.factories import DonationPageFactory


@pytest.mark.django_db()
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


@pytest.mark.django_db()
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
            payment_provider_used=PaymentProvider.STRIPE_LABEL,
        )
        self.contrib_score_4 = ContributionFactory(
            status=ContributionStatus.FLAGGED,
            bad_actor_score=4,
            donation_page=self.donation_page,
            payment_provider_used=PaymentProvider.STRIPE_LABEL,
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
        assert mock_complete_payment.call_count == len(queryset)
        mock_complete_payment.assert_called_with(reject=False)
        assert self.contribution_admin.message_user.call_args.args[2] == django.contrib.messages.SUCCESS

    @mock.patch("apps.contributions.payment_managers.StripePaymentManager.complete_payment")
    def test_reject_flagged_contribution(self, mock_complete_payment):
        self.contribution_admin.message_user = mock.Mock()
        request = self._make_listview_request()
        setup_request(self.user, request)
        queryset = Contribution.objects.all()
        self.contribution_admin.reject_flagged_contribution(request, queryset)
        assert mock_complete_payment.call_count == len(queryset)
        mock_complete_payment.assert_called_with(reject=True)
        assert self.contribution_admin.message_user.call_args.args[2] == django.contrib.messages.SUCCESS

    @mock.patch("apps.contributions.payment_managers.StripePaymentManager.complete_payment")
    def test_failed_reject_flagged_contribution(self, mock_complete_payment):
        self.contribution_admin.message_user = mock.Mock()
        mock_complete_payment.side_effect = apps.contributions.payment_managers.PaymentProviderError
        request = self._make_listview_request()
        setup_request(self.user, request)
        queryset = Contribution.objects.all()
        self.contribution_admin.reject_flagged_contribution(request, queryset)
        assert self.contribution_admin.message_user.call_args.args[2] == django.contrib.messages.ERROR

    def test_reject_non_flagged_fails(self):
        request = self._make_listview_request()
        contribution = ContributionFactory(bad_actor_score=5, status=ContributionStatus.PAID)
        queryset = Contribution.objects.filter(pk=contribution.pk)
        with pytest.raises(MessageFailure):
            self.contribution_admin.accept_flagged_contribution(request, queryset)

    @mock.patch("apps.contributions.models.Contribution.process_flagged_payment")
    def test_accept_or_reject_after_paid_fails(self, process_flagged_payment):
        request = self._make_listview_request()
        contribution = ContributionFactory(bad_actor_score=5, status=ContributionStatus.PAID)
        queryset = Contribution.objects.filter(pk=contribution.pk)
        request.session = "session"
        messages = FallbackStorage(request)
        request._messages = messages
        self.contribution_admin.accept_flagged_contribution(request, queryset)
        self.contribution_admin.reject_flagged_contribution(request, queryset)
        assert not process_flagged_payment.called

    def test_provider_payment_link(self):
        contribution = ContributionFactory(provider_payment_id="pi_1234")
        assert (
            self.contribution_admin.provider_payment_link(contribution) == f"<a href='"
            f"https://dashboard.stripe.com/test/connect/accounts/{contribution.stripe_account_id}/payments/"
            f"{contribution.provider_payment_id}' target='_blank'>{contribution.provider_payment_id}</a>"
        )

    def test_provider_subscription_link(self):
        contribution = ContributionFactory(provider_subscription_id="sub_1234")
        assert (
            self.contribution_admin.provider_subscription_link(contribution) == f"<a href='"
            f"https://dashboard.stripe.com/test/connect/accounts/{contribution.stripe_account_id}/subscriptions/"
            f"{contribution.provider_subscription_id}' target='_blank'>{contribution.provider_subscription_id}</a>"
        )

    def test_provider_customer_link(self):
        contribution = ContributionFactory(provider_customer_id="cus_1234")
        assert (
            self.contribution_admin.provider_customer_link(contribution) == f"<a href='"
            f"https://dashboard.stripe.com/test/connect/accounts/{contribution.stripe_account_id}/customers/"
            f"{contribution.provider_customer_id}' target='_blank'>{contribution.provider_customer_id}</a>"
        )

    def test_links_not_available(self):
        contribution = ContributionFactory(
            provider_customer_id=None, provider_subscription_id=None, provider_payment_id=None
        )
        assert self.contribution_admin.provider_customer_link(contribution) == "-"
        assert self.contribution_admin.provider_payment_link(contribution) == "-"
        assert self.contribution_admin.provider_subscription_link(contribution) == "-"

    def test_bad_actor_response_pretty(self):
        with Path("apps/contributions/tests/fixtures/bad-actor-response.json").open() as f:
            contribution = ContributionFactory(bad_actor_response=json.load(f))
        output = self.contribution_admin.bad_actor_response_pretty(contribution)
        assert isinstance(output, str)
        assert len(output)

    def test_payment_provider_data_pretty(self):
        with Path("apps/contributions/tests/fixtures/payment-provider-data-monthly-contribution.json").open() as f:
            contribution = ContributionFactory(payment_provider_data=json.load(f))
        output = self.contribution_admin.payment_provider_data_pretty(contribution)
        assert isinstance(output, str)
        assert len(output)

    def test_provider_payment_method_details_pretty(self):
        with Path("apps/contributions/tests/fixtures/provider-payment-method-details.json").open() as f:
            contribution = ContributionFactory(provider_payment_method_details=json.load(f))
        output = self.contribution_admin.provider_payment_method_details_pretty(contribution)
        assert isinstance(output, str)
        assert len(output)

    def test_will_create_revisions_from_admin_actions(self, *args, **kwargs):
        """We treat CompareVersionAdmin as a blackbox that should be depended on to consistently produce.

        revisions when admin users create, save, and delete from the admin. In other parts of the app, we
        do more to ensure that revisions are created, but in the admin, we should be able to rely on
        CompareVersionAdmin to do the right thing.
        """
        assert isinstance(self.contribution_admin, CompareVersionAdmin)

    def test_contributor_name_when_present(self):
        contribution = ContributionFactory(bad_actor_response={"items": [{"label": "name", "value": "test-name"}]})
        assert self.contribution_admin.contributor_name(contribution) == "test-name"

    def test_contributor_name_when_not_present(self):
        contribution = ContributionFactory(bad_actor_response={"items": []})
        assert self.contribution_admin.contributor_name(contribution) == "unknown"

    def test_contributor_name_when_bad_actor_malformed(self):
        contribution = ContributionFactory(bad_actor_response={"bad": {}})
        assert self.contribution_admin.contributor_name(contribution) == "unknown"

    def test_contributor_name_when_bad_actor_items_malformed(self):
        contribution = ContributionFactory(bad_actor_response={"items": {}})
        assert self.contribution_admin.contributor_name(contribution) == "unknown"

    def test_contributor_name_when_bad_actor_null(self):
        contribution = ContributionFactory(bad_actor_response=None)
        assert self.contribution_admin.contributor_name(contribution) == "unknown"


# eventually we should move all tests from ContributionAdminTest above to this pytest-based test,
# but initially we're adding so we get minimal test coverage for inline payment admin on contribution model
@pytest.mark.django_db()
class TestContributionAdmin:
    def test_views_stand_up(self, client, admin_user):
        contribution = ContributionFactory()
        # we want to ensure the inlined payment admin works
        PaymentFactory(contribution=contribution)
        client.force_login(admin_user)
        for x in [
            reverse("admin:contributions_contribution_changelist"),
        ]:
            assert client.get(x, follow=True).status_code == 200
        assert (
            client.get(
                reverse("admin:contributions_contribution_change", args=[contribution.pk]), follow=True
            ).status_code
            == 200
        )
