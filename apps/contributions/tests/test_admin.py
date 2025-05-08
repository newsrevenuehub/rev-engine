import json
from datetime import timedelta
from pathlib import Path

from django.contrib.admin.sites import AdminSite
from django.urls import reverse
from django.utils import timezone

import pytest
from bs4 import BeautifulSoup as bs4
from rest_framework.test import APIClient
from reversion_compare.admin import CompareVersionAdmin

import apps
from apps.contributions.admin import ContributionAdmin, QuarantineQueue
from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
    PaymentFactory,
)
from apps.users.models import User


@pytest.mark.django_db
class TestQuarantineAdmin:

    @pytest.fixture
    def flagged_one_time_contribution(self):
        return ContributionFactory(
            one_time=True,
            flagged=True,
            bad_actor_response={
                "items": [
                    {"label": "name", "value": "John Doe"},
                    {"label": "address", "value": "123 Main St"},
                ]
            },
            contribution_metadata={"reason_for_giving": "some reason"},
        )

    @pytest.fixture
    def flagged_recurring_contribution(self):
        return ContributionFactory(
            monthly_subscription=True,
            flagged=True,
            last_payment_date=timezone.now() - timedelta(days=30),
            bad_actor_response={"items": []},
            contribution_metadata={"reason_for_giving": "some  other reason"},
            provider_customer_id=None,
            # doing this so have one with flagged date and one not
            flagged_date=None,
        )

    @pytest.fixture(autouse=True)
    def _stripe_customer_retrieve(self, mocker):
        mocker.patch("stripe.Customer.retrieve", return_value=mocker.Mock(address=mocker.Mock(postal_code="12345")))

    @pytest.mark.parametrize("process_error", [True, False])
    @pytest.mark.parametrize("has_bad_actor_response", [True, False])
    @pytest.mark.parametrize("no_longer_flagged", [True, False])
    def test_accept_flagged_contribution(
        self,
        flagged_one_time_contribution,
        flagged_recurring_contribution,
        client,
        admin_user,
        mocker,
        process_error,
        has_bad_actor_response,
        no_longer_flagged,
    ):
        if no_longer_flagged:
            flagged_one_time_contribution.status = ContributionStatus.PAID
            flagged_one_time_contribution.save()
        if not has_bad_actor_response:
            for x in [flagged_one_time_contribution, flagged_recurring_contribution]:
                x.bad_actor_response = None
                x.save()
        if process_error:
            mocker.patch(
                "apps.contributions.models.Contribution.process_flagged_payment",
                side_effect=apps.contributions.payment_managers.PaymentProviderError(error_msg := "uh oh"),
            )
        else:
            mock_pi_retrieve = mocker.patch("stripe.PaymentIntent.retrieve")
            mock_si_retrieve = mocker.patch("stripe.SetupIntent.retrieve", return_value=mocker.Mock(metadata={}))
            mock_subscription_create = mocker.patch(
                "stripe.Subscription.create",
                return_value=mocker.Mock(
                    id=(sub_id := "sub_id_123"),
                    latest_invoice=mocker.Mock(payment_intent=mocker.Mock(id=(pi_id := "pi_id"))),
                ),
            )
            mock_pm_retrieve = mocker.patch("stripe.PaymentMethod.retrieve")
        client.force_login(admin_user)
        response = client.post(
            reverse("admin:contributions_quarantine_changelist"),
            {
                "action": "accept_flagged_contribution",
                "_selected_action": [
                    flagged_one_time_contribution.pk,
                    flagged_recurring_contribution.pk,
                ],
            },
            follow=True,
        )
        assert response.status_code == 200
        if process_error:
            assert error_msg in response.content.decode()
        else:
            # assert about success in body
            flagged_one_time_contribution.refresh_from_db()
            flagged_recurring_contribution.refresh_from_db()
            assert flagged_one_time_contribution.status == ContributionStatus.PAID
            assert flagged_recurring_contribution.status == ContributionStatus.PAID
            assert flagged_recurring_contribution.provider_subscription_id == sub_id
            assert flagged_recurring_contribution.provider_payment_id == pi_id
            assert mock_pi_retrieve.call_count == (1 if not no_longer_flagged else 0)
            assert mock_si_retrieve.call_count == 1
            assert mock_pm_retrieve.call_count == 1
            assert mock_subscription_create.call_count == 1

    @pytest.mark.parametrize("process_error", [True, False])
    def test_reject_flagged_contribution(
        self, process_error, flagged_one_time_contribution, flagged_recurring_contribution, client, admin_user, mocker
    ):
        if process_error:
            mocker.patch(
                "apps.contributions.models.Contribution.process_flagged_payment",
                side_effect=apps.contributions.payment_managers.PaymentProviderError(error_msg := "uh oh"),
            )
        else:
            mock_pi_retrieve = mocker.patch("stripe.PaymentIntent.retrieve")
            mock_si_retrieve = mocker.patch("stripe.SetupIntent.retrieve", return_value=mocker.Mock(metadata={}))
            mock_pm_retrieve = mocker.patch("stripe.PaymentMethod.retrieve")
        client.force_login(admin_user)
        response = client.post(
            reverse("admin:contributions_quarantine_changelist"),
            {
                "action": "reject_flagged_contribution",
                "_selected_action": [
                    flagged_one_time_contribution.pk,
                    flagged_recurring_contribution.pk,
                ],
            },
            follow=True,
        )
        assert response.status_code == 200
        if process_error:
            assert error_msg in response.content.decode()
        else:
            flagged_one_time_contribution.refresh_from_db()
            flagged_recurring_contribution.refresh_from_db()
            assert flagged_one_time_contribution.status == ContributionStatus.REJECTED
            assert flagged_recurring_contribution.status == ContributionStatus.REJECTED
            assert mock_pi_retrieve.call_count == 1
            assert mock_pi_retrieve.return_value.cancel.call_count == 1
            assert mock_si_retrieve.call_count == 1
            assert mock_pm_retrieve.call_count == 1
            assert mock_pm_retrieve.return_value.detach.call_count == 1

    def test_get_page_stands_up(
        self, client, admin_user, flagged_one_time_contribution, flagged_recurring_contribution
    ):
        client.force_login(admin_user)
        response = client.get(reverse("admin:contributions_quarantine_changelist"), follow=True)
        assert response.status_code == 200
        for x in [flagged_one_time_contribution, flagged_recurring_contribution]:
            assert x.contribution_metadata["reason_for_giving"] in response.content.decode()

    def test__process_flagged_payment_edge_case(self, mocker):
        admin = QuarantineQueue(Contribution, AdminSite())
        admin._process_flagged_payment(
            request=mocker.Mock(),
            queryset=[ContributionFactory(status=ContributionStatus.PAID)],
        )


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
    @pytest.fixture
    def payment(self):
        return PaymentFactory()

    def test_list_view(self, payment, client, admin_user):
        response = client.get(reverse("admin:contributions_payment_changelist"), follow=True)
        assert response.status_code == 200

    def test_detail_view(self, payment, client, admin_user):
        response = client.get(reverse("admin:contributions_payment_change", args=[payment.pk]), follow=True)
        assert response.status_code == 200


@pytest.mark.django_db
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

    @pytest.mark.usefixtures("monthly_contribution")
    def test_list_view_has_quarantine_status_field(self, client: APIClient, admin_user: User):
        client.force_login(admin_user)
        response = client.get(reverse("admin:contributions_contribution_changelist"), follow=True)
        assert response.status_code == 200
        soup = bs4(response.content, "html.parser")
        assert soup.find("th", {"class": "column-quarantine_status"}) is not None

    @pytest.fixture
    def admin(self):
        return ContributionAdmin(Contribution, AdminSite())

    def test_admin_search(self, client, admin_user):
        client.force_login(admin_user)
        response = client.get(reverse("admin:contributions_contribution_changelist"), {"q": "search_term"}, follow=True)
        assert response.status_code == 200
        assert "search_term" in response.content.decode()

    def test_first_payment_date_display(self, client, admin_user):
        contribution = ContributionFactory()
        PaymentFactory(contribution=contribution, transaction_time=timezone.now())
        client.force_login(admin_user)
        response = client.get(reverse("admin:contributions_contribution_changelist"), follow=True)
        assert response.status_code == 200
        assert "First Payment Date" in response.content.decode()

    def test_provider_payment_link(self, admin):
        contribution = ContributionFactory(provider_payment_id="pi_1234")
        assert (
            admin.provider_payment_link(contribution) == f"<a href='"
            f"https://dashboard.stripe.com/test/connect/accounts/{contribution.stripe_account_id}/payments/"
            f"{contribution.provider_payment_id}' target='_blank'>{contribution.provider_payment_id}</a>"
        )

    def test_provider_subscription_link(self, admin):
        contribution = ContributionFactory(provider_subscription_id="sub_1234")
        assert (
            admin.provider_subscription_link(contribution) == f"<a href='"
            f"https://dashboard.stripe.com/test/connect/accounts/{contribution.stripe_account_id}/subscriptions/"
            f"{contribution.provider_subscription_id}' target='_blank'>{contribution.provider_subscription_id}</a>"
        )

    def test_provider_customer_link(self, admin):
        contribution = ContributionFactory(provider_customer_id="cus_1234")
        assert (
            admin.provider_customer_link(contribution) == f"<a href='"
            f"https://dashboard.stripe.com/test/connect/accounts/{contribution.stripe_account_id}/customers/"
            f"{contribution.provider_customer_id}' target='_blank'>{contribution.provider_customer_id}</a>"
        )

    def test_links_not_available(self, admin):
        contribution = ContributionFactory(
            provider_customer_id=None, provider_subscription_id=None, provider_payment_id=None
        )
        assert admin.provider_customer_link(contribution) == "-"
        assert admin.provider_payment_link(contribution) == "-"
        assert admin.provider_subscription_link(contribution) == "-"

    def test_bad_actor_response_pretty(self, admin):
        with Path("apps/contributions/tests/fixtures/bad-actor-response.json").open() as f:
            contribution = ContributionFactory(bad_actor_response=json.load(f))
        output = admin.bad_actor_response_pretty(contribution)
        assert isinstance(output, str)
        assert len(output)

    def test_provider_payment_method_details_pretty(self, admin):
        with Path("apps/contributions/tests/fixtures/provider-payment-method-details.json").open() as f:
            contribution = ContributionFactory(provider_payment_method_details=json.load(f))
        output = admin.provider_payment_method_details_pretty(contribution)
        assert isinstance(output, str)
        assert len(output)

    def test_will_create_revisions_from_admin_actions(self, admin, *args, **kwargs):
        """We treat CompareVersionAdmin as a blackbox that should be depended on to consistently produce.

        revisions when admin users create, save, and delete from the admin. In other parts of the app, we
        do more to ensure that revisions are created, but in the admin, we should be able to rely on
        CompareVersionAdmin to do the right thing.
        """
        assert isinstance(admin, CompareVersionAdmin)
