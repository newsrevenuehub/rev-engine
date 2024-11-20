import datetime
import json
from pathlib import Path
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Q
from django.http import Http404
from django.test import RequestFactory

import dateparser
import pytest
import stripe
from addict import Dict as AttrDict
from rest_framework import status
from rest_framework.request import Request
from rest_framework.reverse import reverse
from rest_framework.test import APIClient
from reversion.models import Version
from stripe.oauth_error import InvalidGrantError as StripeInvalidGrantError
from stripe.stripe_object import StripeObject
from waffle import get_waffle_flag_model

from apps.common.constants import CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME
from apps.contributions import views as contributions_views
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionQuerySet,
    ContributionStatus,
    Contributor,
    Payment,
)
from apps.contributions.serializers import (
    PORTAL_CONTRIBUTION_DETAIL_SERIALIZER_DB_FIELDS,
    ContributionSerializer,
    SubscriptionsSerializer,
)
from apps.contributions.tasks import (
    email_contribution_csv_export_to_user,
    task_pull_serialized_stripe_contributions_to_cache,
)
from apps.contributions.tests import RedisMock
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
    PaymentFactory,
)
from apps.contributions.tests.test_serializers import (
    mock_stripe_call_with_error,
)
from apps.organizations.tests.factories import (
    OrganizationFactory,
    RevenueProgramFactory,
)
from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory
from apps.users.choices import Roles
from apps.users.tests.factories import UserFactory


TEST_STRIPE_ACCOUNT_ID = "testing_123"


class MockStripeAccount(StripeObject):
    def __init__(self, *args, **kwargs):
        self.id = TEST_STRIPE_ACCOUNT_ID


MOCK_ACCOUNT_LINKS = {"test": "test"}


class MockOAuthResponse(StripeObject):
    def __init__(self, *args, **kwargs):
        self.stripe_user_id = kwargs.get("stripe_user_id")
        self.refresh_token = kwargs.get("refresh_token")


expected_oauth_scope = "my_test_scope"


@pytest.mark.django_db
class TestStripeOAuth:
    @pytest.fixture(autouse=True)
    def _setttings(self, settings):
        settings.STRIPE_OAUTH_SCOPE = expected_oauth_scope

    def _make_request(self, client, user, code=None, scope=None, org=None, revenue_program=None):
        client.force_authenticate(user=user)
        url = reverse("stripe-oauth")
        complete_url = f"{url}?{settings.ORG_SLUG_PARAM}={org.slug}"
        body = {}
        if revenue_program:
            body["revenue_program_id"] = revenue_program.id
        if code:
            body["code"] = code
        if scope:
            body["scope"] = scope

        return client.post(complete_url, body)

    def test_response_when_missing_params(self, mocker, org_user_free_plan, api_client):
        stripe_oauth_token = mocker.patch("stripe.OAuth.token")
        task_verify_apple_domain = mocker.patch("apps.contributions.views.task_verify_apple_domain")
        # Missing code
        response = self._make_request(
            api_client,
            org_user_free_plan,
            code=None,
            scope=expected_oauth_scope,
            org=org_user_free_plan.roleassignment.organization,
            revenue_program=org_user_free_plan.roleassignment.revenue_programs.first(),
        )
        assert response.status_code == 400
        assert "missing_params" in response.data
        stripe_oauth_token.assert_not_called()

        # Missing scope
        response = self._make_request(
            api_client,
            org_user_free_plan,
            code="12345",
            scope=None,
            org=org_user_free_plan.roleassignment.organization,
            revenue_program=org_user_free_plan.roleassignment.revenue_programs.first(),
        )
        assert response.status_code == 400
        assert "missing_params" in response.data
        stripe_oauth_token.assert_not_called()

        # Missing revenue_program_id
        response = self._make_request(
            api_client,
            org_user_free_plan,
            code="12345",
            scope=expected_oauth_scope,
            org=org_user_free_plan.roleassignment.organization,
            revenue_program=None,
        )
        assert response.status_code == 400
        assert "missing_params" in response.data
        stripe_oauth_token.assert_not_called()

        # Missing code, scope and revenue_program_id
        response = self._make_request(
            api_client,
            org_user_free_plan,
            code=None,
            scope=None,
            org=org_user_free_plan.roleassignment.organization,
            revenue_program=None,
        )
        assert response.status_code == 400
        assert "missing_params" in response.data
        stripe_oauth_token.assert_not_called()
        assert not task_verify_apple_domain.delay.called

    def test_response_when_scope_param_mismatch(self, mocker, org_user_free_plan, api_client):
        """We verify that the "scope" parameter provided by the frontend matches the scope we expect."""
        stripe_oauth_token = mocker.patch("stripe.OAuth.token")
        task_verify_apple_domain = mocker.patch("apps.contributions.views.task_verify_apple_domain")
        response = self._make_request(
            api_client,
            org_user_free_plan,
            code="1234",
            scope="not_expected_scope",
            org=org_user_free_plan.roleassignment.organization,
            revenue_program=org_user_free_plan.roleassignment.revenue_programs.first(),
        )
        assert response.status_code == 400
        assert "scope_mismatch" in response.data
        stripe_oauth_token.assert_not_called()
        assert not task_verify_apple_domain.delay.called

    def test_response_when_invalid_code(self, mocker, api_client, org_user_free_plan):
        stripe_oauth_token = mocker.patch(
            "stripe.OAuth.token",
            side_effect=StripeInvalidGrantError(code="error_code", description="error_description"),
        )
        task_verify_apple_domain = mocker.patch("apps.contributions.views.task_verify_apple_domain")
        response = self._make_request(
            api_client,
            org_user_free_plan,
            code="1234",
            scope=expected_oauth_scope,
            org=org_user_free_plan.roleassignment.organization,
            revenue_program=org_user_free_plan.roleassignment.revenue_programs.first(),
        )
        assert response.status_code == 400
        assert "invalid_code" in response.data
        stripe_oauth_token.assert_called_with(code="1234", grant_type="authorization_code")
        assert not task_verify_apple_domain.delay.called

    def test_response_success(self, mocker, api_client, org_user_free_plan):
        task_verify_apple_domain = mocker.patch("apps.contributions.views.task_verify_apple_domain")
        stripe_oauth_token = mocker.patch(
            "stripe.OAuth.token", return_value=MockOAuthResponse(stripe_user_id="test", refresh_token="test")
        )
        rp = org_user_free_plan.roleassignment.revenue_programs.first()
        expected_stripe_account_id = "my_test_account_id"
        expected_refresh_token = "my_test_refresh_token"
        stripe_oauth_token.return_value = MockOAuthResponse(
            stripe_user_id=expected_stripe_account_id, refresh_token=expected_refresh_token
        )
        assert Version.objects.get_for_object(rp).count() == 0
        response = self._make_request(
            api_client,
            org_user_free_plan,
            code="1234",
            scope=expected_oauth_scope,
            org=rp.organization,
            revenue_program=rp,
        )
        assert response.status_code == 200
        assert response.data["detail"] == "success"
        stripe_oauth_token.assert_called_with(code="1234", grant_type="authorization_code")
        # Org should have new values based on OAuth response
        rp.refresh_from_db()
        assert rp.stripe_account_id == expected_stripe_account_id
        assert rp.payment_provider.stripe_oauth_refresh_token == expected_refresh_token
        assert Version.objects.get_for_object(rp.payment_provider).count() == 1
        task_verify_apple_domain.delay.assert_called_with(revenue_program_slug=rp.slug)

    def test_create_payment_provider_if_not_exists(self, mocker, org_user_free_plan, api_client):
        stripe_oauth_token = mocker.patch("stripe.OAuth.token")
        task_verify_apple_domain = mocker.patch("apps.contributions.views.task_verify_apple_domain")
        expected_stripe_account_id = "new_stripe_account_id"
        refresh_token = "my_test_refresh_token"
        stripe_oauth_token.return_value = MockOAuthResponse(
            stripe_user_id=expected_stripe_account_id, refresh_token=refresh_token
        )
        rp = org_user_free_plan.roleassignment.revenue_programs.first()
        rp.payment_provider = None
        rp.save()
        self._make_request(
            api_client,
            org_user_free_plan,
            code="1234",
            scope=expected_oauth_scope,
            org=rp.organization,
            revenue_program=rp,
        )
        rp.refresh_from_db()
        assert (provider := rp.payment_provider) is not None
        assert provider.stripe_account_id == expected_stripe_account_id
        assert Version.objects.get_for_object(provider).count() == 1
        task_verify_apple_domain.delay.assert_called_with(revenue_program_slug=rp.slug)


@pytest.mark.django_db
@pytest.mark.usefixtures("_clear_cache")
@pytest.mark.usefixtures("default_feature_flags")
class TestContributionsViewSet:
    @pytest.fixture(params=["superuser", "hub_admin_user", "org_user_free_plan", "rp_user"])
    def non_contributor_user(self, request):
        return request.getfixturevalue(request.param)

    def test_retrieve_when_expected_non_contributor_user(self, non_contributor_user, api_client, mocker):
        """Show that expected users can retrieve only permitted organizations.

        Contributor users are not handled in this test because setup is too different
        """
        spy = mocker.spy(ContributionQuerySet, "filtered_by_role_assignment")
        api_client.force_authenticate(non_contributor_user)
        new_rp = RevenueProgramFactory(organization=OrganizationFactory(name="new-org"), name="new rp")
        if non_contributor_user.is_superuser or non_contributor_user.roleassignment.role_type == Roles.HUB_ADMIN:
            ContributionFactory(status=ContributionStatus.PAID, one_time=True, donation_page__revenue_program=new_rp)
            ContributionFactory(
                status=ContributionStatus.PAID, annual_subscription=True, donation_page__revenue_program=new_rp
            )
            ContributionFactory(
                status=ContributionStatus.PAID, monthly_subscription=True, donation_page__revenue_program=new_rp
            )
            query = Contribution.objects.all()
            unpermitted = Contribution.objects.none()
        else:
            # this ensures that we'll have both owned and unowned contributions for org and rp admins
            for kwargs in [
                {"donation_page__revenue_program": new_rp},
                {"donation_page__revenue_program": non_contributor_user.roleassignment.revenue_programs.first()},
            ]:
                ContributionFactory(**({"status": ContributionStatus.PAID, "one_time": True} | kwargs))
                ContributionFactory(**({"status": ContributionStatus.PAID, "annual_subscription": True} | kwargs))
                ContributionFactory(**({"status": ContributionStatus.PAID, "monthly_subscription": True} | kwargs))
            query = Contribution.objects.filtered_by_role_assignment(non_contributor_user.roleassignment)
            unpermitted = Contribution.objects.exclude(id__in=query.values_list("id", flat=True))

        assert query.count() > 0
        if non_contributor_user.is_superuser or non_contributor_user.roleassignment.role_type == Roles.HUB_ADMIN:
            assert unpermitted.count() == 0
        else:
            assert unpermitted.count() > 0
        for id_ in query.values_list("id", flat=True):
            response = api_client.get(reverse("contribution-detail", args=(id_,)))
            assert response.status_code == status.HTTP_200_OK
            assert response.json() == json.loads(
                json.dumps(
                    ContributionSerializer(Contribution.objects.get(id=response.json()["id"])).data,
                    cls=DjangoJSONEncoder,
                )
            )
        for id_ in unpermitted.values_list("id", flat=True):
            response = api_client.get(reverse("contribution-detail", args=(id_,)))
            assert response.status_code == status.HTTP_404_NOT_FOUND
        assert spy.call_count == 0 if non_contributor_user.is_superuser else Contribution.objects.count()

    @pytest.fixture(params=["one_time_contribution", "annual_contribution", "monthly_contribution"])
    def contribution(self, request):
        return request.getfixturevalue(request.param)

    @pytest.fixture(params=["user_no_role_assignment", None])
    def unauthorized_user(self, request):
        return request.getfixturevalue(request.param) if request.param else None

    def test_retrieve_when_unauthorized_user(self, api_client, contribution, unauthorized_user):
        """Show behavior when an unauthorized user tries to retrieve a contribution."""
        api_client.force_authenticate(unauthorized_user)
        response = api_client.get(reverse("contribution-detail", args=(contribution.id,)))
        assert response.status_code == status.HTTP_403_FORBIDDEN if unauthorized_user else status.HTTP_401_UNAUTHORIZED

    def test_list_when_expected_non_contributor_user(self, non_contributor_user, api_client, mocker, revenue_program):
        """Show that expected users can list only permitted contributions.

        NB: We test for contributor user elsewhere, as that requires quite different setup than other
        expected users
        """
        api_client.force_authenticate(non_contributor_user)
        # superuser and hub admin can retrieve all:
        if non_contributor_user.is_superuser or non_contributor_user.roleassignment.role_type == Roles.HUB_ADMIN:
            ContributionFactory.create_batch(size=2, status=ContributionStatus.PAID)
            query = (
                Contribution.objects.all()
                if non_contributor_user.is_superuser
                else Contribution.objects.having_org_viewable_status()
            )
            unpermitted = Contribution.objects.none()
            assert query.count()
        # org and rp admins should see owned and not unowned contributions
        else:
            assert revenue_program not in non_contributor_user.roleassignment.revenue_programs.all()
            assert non_contributor_user.roleassignment.revenue_programs.first() is not None
            ContributionFactory(
                one_time=True,
                donation_page=DonationPageFactory(
                    revenue_program=non_contributor_user.roleassignment.revenue_programs.first()
                ),
                status=ContributionStatus.PAID,
            )
            ContributionFactory(
                one_time=True,
                donation_page=DonationPageFactory(revenue_program=revenue_program),
                status=ContributionStatus.PAID,
            )
            non_contributor_user.roleassignment.refresh_from_db()
            query = Contribution.objects.filtered_by_role_assignment(non_contributor_user.roleassignment)
            unpermitted = Contribution.objects.exclude(id__in=query.values_list("id", flat=True))
            assert unpermitted.count()
            assert query.count()
        spy = mocker.spy(ContributionQuerySet, "filtered_by_role_assignment")
        response = api_client.get(reverse("contribution-list"))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()["results"]) == query.count()
        assert {x["id"] for x in response.json()["results"]} == set(query.values_list("id", flat=True))
        assert not any(
            x in unpermitted.values_list("id", flat=True) for x in [y["id"] for y in response.json()["results"]]
        )
        assert spy.call_count == 0 if non_contributor_user.is_superuser else 1

    def test_list_when_unauthorized_user(self, unauthorized_user, api_client):
        """Show behavior when unauthorized user tries to list contributions."""
        api_client.force_authenticate(unauthorized_user)
        assert (
            api_client.get(reverse("contribution-list")).status_code == status.HTTP_403_FORBIDDEN
            if unauthorized_user
            else status.HTTP_401_UNAUTHORIZED
        )

    def test_excludes_statuses_correctly_for_expected_non_contributor_users(
        self,
        non_contributor_user,
        flagged_contribution,
        rejected_contribution,
        canceled_contribution,
        refunded_contribution,
        successful_contribution,
        processing_contribution,
        api_client,
    ):
        """Only superusers and hub admins should see contributions that have status of flagged or rejected."""
        seen = [
            successful_contribution,
            canceled_contribution,
            refunded_contribution,
        ]
        if non_contributor_user.is_superuser:
            seen.extend(
                [
                    flagged_contribution,
                    rejected_contribution,
                    processing_contribution,
                ]
            )
        if not (non_contributor_user.is_superuser or non_contributor_user.roleassignment.role_type == Roles.HUB_ADMIN):
            # ensure all contributions are owned by user so we're narrowly viewing behavior around status inclusion/exclusion
            DonationPage.objects.update(revenue_program=non_contributor_user.roleassignment.revenue_programs.first())
        api_client.force_authenticate(non_contributor_user)
        response = api_client.get(reverse("contribution-list"))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()["results"]) == len(seen)
        assert {x["id"] for x in response.json()["results"]} == {x.id for x in seen}

    @pytest.fixture(params=["superuser", "hub_admin_user"])
    def filter_user(self, request):
        return request.getfixturevalue(request.param)

    @pytest.mark.parametrize(
        "contribution_status",
        [
            ContributionStatus.FAILED,
            ContributionStatus.FLAGGED,
            ContributionStatus.PROCESSING,
            ContributionStatus.REJECTED,
        ],
    )
    def test_filter_contributions_based_on_status(
        self,
        filter_user,
        contribution_status,
        flagged_contribution,
        rejected_contribution,
        canceled_contribution,
        refunded_contribution,
        successful_contribution,
        processing_contribution,
        api_client,
    ):
        """Superusers and hub admins can filter out flagged and rejected contributions."""
        user = filter_user
        api_client.force_authenticate(user)
        qp = f"status__not={contribution_status.value}"
        can_see = [
            canceled_contribution,
            refunded_contribution,
            successful_contribution,
        ]
        if user.is_superuser:
            can_see.extend(
                [
                    flagged_contribution,
                    rejected_contribution,
                    processing_contribution,
                ]
            )
        if contribution_status in [x.status for x in can_see]:
            expected = [x for x in can_see if x.status != contribution_status]
            assert Contribution.objects.count() == len(expected) + 1
            response = api_client.get(f"{reverse('contribution-list')}?{qp}")
            assert response.status_code == status.HTTP_200_OK
            assert len(response.json()["results"]) == len(expected)
            assert {x["id"] for x in response.json()["results"]} == {x.id for x in expected}


@pytest.mark.django_db
class TestContributionViewSetForContributorUser:
    """Test the ContributionsViewSet's behavior when a contributor user is interacting with relevant endpoints."""

    def test_list_when_contributions_in_cache(
        self, contributor_user, mocker, api_client, revenue_program, pi_as_portal_contribution_factory
    ):
        """When there are contributions in cache, those should be returned by the request."""
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.ContributionsCacheProvider.load",
            return_value=[
                (
                    expected := pi_as_portal_contribution_factory.get(
                        revenue_program=revenue_program.slug, status=ContributionStatus.PAID
                    )
                ),
                pi_as_portal_contribution_factory.get(
                    revenue_program=revenue_program.slug, status=ContributionStatus.PAID, payment_type=None
                ),
                pi_as_portal_contribution_factory.get(revenue_program="different-rp", status=ContributionStatus.PAID),
                pi_as_portal_contribution_factory.get(
                    revenue_program=revenue_program.slug, status=ContributionStatus.PROCESSING
                ),
                pi_as_portal_contribution_factory.get(
                    revenue_program=revenue_program.slug, status=ContributionStatus.CANCELED
                ),
                pi_as_portal_contribution_factory.get(
                    revenue_program=revenue_program.slug, status=ContributionStatus.REFUNDED
                ),
                pi_as_portal_contribution_factory.get(
                    revenue_program=revenue_program.slug, status=ContributionStatus.FLAGGED
                ),
                pi_as_portal_contribution_factory.get(
                    revenue_program=revenue_program.slug, status=ContributionStatus.REJECTED
                ),
            ],
        )
        spy = mocker.spy(task_pull_serialized_stripe_contributions_to_cache, "delay")
        api_client.force_authenticate(contributor_user)
        response = api_client.get(reverse("contribution-list"), {"rp": revenue_program.slug})
        assert response.status_code == status.HTTP_200_OK
        assert spy.call_count == 0
        assert response.json()["count"] == 1
        assert response.json()["results"][0]["id"] == expected.id

    def test_list_when_contributions_not_in_cache(
        self, contributor_user, monkeypatch, mocker, api_client, revenue_program
    ):
        """When there are not contributions in the cache, background task to retrieve and cache should be called."""
        monkeypatch.setattr(
            "apps.contributions.stripe_contributions_provider.ContributionsCacheProvider.load",
            lambda *args, **kwargs: [],
        )
        spy = mocker.spy(task_pull_serialized_stripe_contributions_to_cache, "delay")
        api_client.force_authenticate(contributor_user)
        response = api_client.get(reverse("contribution-list"), {"rp": revenue_program.slug})
        assert response.status_code == status.HTTP_200_OK
        assert spy.call_count == 1
        assert response.json()["count"] == 0
        assert response.json()["results"] == []


@pytest.mark.django_db
class TestContributionsViewSetExportCSV:
    """Test contribution viewset functionality around triggering emailed csv exports."""

    @pytest.fixture(
        params=[
            "admin_user",
            "hub_admin_user",
            "org_user_free_plan",
            "org_user_multiple_rps",
            "rp_user",
        ]
    )
    def user(self, request):
        return request.getfixturevalue(request.param)

    def test_when_expected_user(self, user, api_client, mocker, revenue_program, settings):
        """Show expected users get back expected results in CSV."""
        settings.CELERY_ALWAYS_EAGER = True
        api_client.force_authenticate(user)
        if user.is_staff or user.roleassignment.role_type == Roles.HUB_ADMIN:
            ContributionFactory(one_time=True, status=ContributionStatus.PAID)
            ContributionFactory(one_time=True, flagged=True)
            ContributionFactory(one_time=True, rejected=True)
            ContributionFactory(one_time=True, canceled=True)
            ContributionFactory(one_time=True, refunded=True)
            ContributionFactory(one_time=True, processing=True)

        else:
            assert revenue_program not in user.roleassignment.revenue_programs.all()
            unowned_page = DonationPageFactory(revenue_program=revenue_program)
            owned_page = DonationPageFactory(revenue_program=user.roleassignment.revenue_programs.first())
            ContributionFactory(status=ContributionStatus.PAID, one_time=True, donation_page=owned_page)
            ContributionFactory(status=ContributionStatus.PAID, one_time=True, flagged=True, donation_page=owned_page)
            ContributionFactory(status=ContributionStatus.PAID, one_time=True, rejected=True, donation_page=owned_page)
            ContributionFactory(status=ContributionStatus.PAID, one_time=True, canceled=True, donation_page=owned_page)
            ContributionFactory(status=ContributionStatus.PAID, one_time=True, refunded=True, donation_page=owned_page)
            ContributionFactory(
                status=ContributionStatus.PAID, one_time=True, processing=True, donation_page=owned_page
            )
            ContributionFactory(status=ContributionStatus.PAID, one_time=True)
            ContributionFactory(status=ContributionStatus.PAID, one_time=True, flagged=True, donation_page=unowned_page)
            ContributionFactory(
                status=ContributionStatus.PAID, one_time=True, rejected=True, donation_page=unowned_page
            )
            ContributionFactory(
                status=ContributionStatus.PAID, one_time=True, canceled=True, donation_page=unowned_page
            )
            ContributionFactory(
                status=ContributionStatus.PAID, one_time=True, refunded=True, donation_page=unowned_page
            )
            ContributionFactory(
                status=ContributionStatus.PAID, one_time=True, processing=True, donation_page=unowned_page
            )

        expected = (
            Contribution.objects.all()
            if user.is_staff
            else Contribution.objects.filtered_by_role_assignment(user.roleassignment)
        )
        not_expected = (
            Contribution.objects.none()
            if user.is_staff
            else Contribution.objects.exclude(id__in=[expected.values_list("id", flat=True)])
        )
        assert expected.count()
        assert (not_expected.count() == 0) if user.is_staff else (not_expected.count() > 0)
        filter_spy = mocker.spy(Contribution.objects, "filtered_by_role_assignment")
        email_export_spy = mocker.spy(email_contribution_csv_export_to_user, "delay")
        response = api_client.post(reverse("contribution-email-contributions"))
        assert response.status_code == status.HTTP_200_OK
        email_export_spy.assert_called_once()
        assert set(email_export_spy.call_args[0][0]) == set(expected.values_list("id", flat=True))
        assert email_export_spy.call_args[0][1] == user.email
        if (ra := user.get_role_assignment()) is not None:
            filter_spy.assert_called_once_with(ra)

    @pytest.fixture(
        params=[
            ("contributor_user", status.HTTP_403_FORBIDDEN),
            ("superuser", status.HTTP_405_METHOD_NOT_ALLOWED),
            (None, status.HTTP_401_UNAUTHORIZED),
        ]
    )
    def unauthorized_user_case(self, request):
        return request.getfixturevalue(request.param[0]) if request.param[0] else None, request.param[1]

    def test_when_unauthorized_user(self, unauthorized_user_case, api_client):
        """Show behavior when unauthorized users attempt to access."""
        user, expected_status = unauthorized_user_case
        api_client.force_authenticate(user)
        assert api_client.get(reverse("contribution-email-contributions")).status_code == expected_status


@pytest.fixture
def loaded_cached_subscription_factory(revenue_program, subscription_factory, subscription_data_factory):
    class Factory:
        def get(self, rp_slug=None) -> AttrDict:
            subscription_data = subscription_data_factory.get()
            subscription_data["metadata"]["revenue_program_slug"] = rp_slug or revenue_program.slug
            subscription = subscription_factory.get(**subscription_data)
            serialized = SubscriptionsSerializer(instance=subscription).data
            serialized["stripe_account_id"] = revenue_program.payment_provider.stripe_account_id
            return AttrDict(**serialized)

    return Factory()


@pytest.mark.django_db
class TestSubscriptionViewSet:
    def test__fetch_subscriptions_when_rp_not_found(self, revenue_program, mocker):
        rp_slug = revenue_program.slug
        revenue_program.delete()
        factory = RequestFactory()
        request = factory.get(reverse("subscription-list"), data={"revenue_program_slug": rp_slug})
        request = Request(request)
        request.user = mocker.Mock(email="foo@bar.com")
        logger_spy = mocker.spy(contributions_views.logger, "warning")
        with pytest.raises(Http404):
            contributions_views.SubscriptionsViewSet._fetch_subscriptions(request)
        logger_spy.assert_called_once_with("Revenue program not found for slug %s", rp_slug)

    def test__fetch_subscriptions_when_subscriptions_in_cache(
        self, loaded_cached_subscription_factory, revenue_program, mocker
    ):
        this_rp = RevenueProgramFactory()
        assert this_rp.slug != revenue_program.slug
        my_sub_for_this_rp = loaded_cached_subscription_factory.get(rp_slug=this_rp.slug)
        my_sub_for_other_rp = loaded_cached_subscription_factory.get(rp_slug=revenue_program.slug)

        factory = RequestFactory()
        request = factory.get(reverse("subscription-list"), data={"revenue_program_slug": this_rp.slug})
        request = Request(request)
        request.user = mocker.Mock(email=(email := "foo@bar.com"))
        mock_sub_cache = mocker.patch("apps.contributions.views.SubscriptionsCacheProvider")
        mock_sub_cache.return_value.load.return_value = [my_sub_for_this_rp, my_sub_for_other_rp]

        subscriptions = contributions_views.SubscriptionsViewSet._fetch_subscriptions(request)
        assert len(subscriptions) == 1
        assert subscriptions[0].id == my_sub_for_other_rp.id
        mock_sub_cache.return_value.load.assert_called_once()
        mock_sub_cache.assert_called_once_with(email, this_rp.payment_provider.stripe_account_id)

    def test__fetch_subscriptions_when_no_subscriptions_in_cache(
        self, loaded_cached_subscription_factory, revenue_program, mocker
    ):
        subscription = loaded_cached_subscription_factory.get()
        factory = RequestFactory()
        request = factory.get(reverse("subscription-list"), data={"revenue_program_slug": revenue_program.slug})
        request = Request(request)
        request.user = mocker.Mock(email=(email := "foo@bar.com"))
        mock_sub_cache = mocker.patch("apps.contributions.views.SubscriptionsCacheProvider")
        # if cache is empty, `_fetch_subscriptions` makes synchronous call to load cache adn returns results
        mock_sub_cache.return_value.load.side_effect = [[], [subscription]]
        mock_pull_to_cache = mocker.patch("apps.contributions.views.task_pull_serialized_stripe_contributions_to_cache")

        subscriptions = contributions_views.SubscriptionsViewSet._fetch_subscriptions(request)

        assert len(subscriptions) == 1
        assert subscriptions[0].id == subscription.id
        assert mock_sub_cache.return_value.load.call_count == 2
        mock_sub_cache.assert_called_once_with(email, revenue_program.payment_provider.stripe_account_id)
        mock_pull_to_cache.assert_called_once_with(email, revenue_program.payment_provider.stripe_account_id)

    def test_retrieve_when_subscription_in_cache(
        self, mocker, api_client, contributor_user, loaded_cached_subscription_factory
    ):
        subscription = loaded_cached_subscription_factory.get()
        mock_fetch_subs = mocker.patch(
            "apps.contributions.views.SubscriptionsViewSet._fetch_subscriptions", return_value=[subscription]
        )
        api_client.force_authenticate(contributor_user)
        response = api_client.get(
            reverse("subscription-detail", args=(subscription.id,)),
            {"revenue_program_slug": subscription.revenue_program_slug},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == str(subscription.id)
        mock_fetch_subs.assert_called_once()

    def test_retrieve_when_subscription_not_in_cache(self, api_client, contributor_user, revenue_program, mocker):
        mock_fetch_subs = mocker.patch(
            "apps.contributions.views.SubscriptionsViewSet._fetch_subscriptions", return_value=[]
        )
        api_client.force_authenticate(contributor_user)
        response = api_client.get(
            reverse("subscription-detail", args=("some-id",)),
            {"revenue_program_slug": revenue_program.slug},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        mock_fetch_subs.assert_called_once()

    def test_list(self, api_client, contributor_user, revenue_program, mocker, loaded_cached_subscription_factory):
        mocker.patch(
            "apps.contributions.views.SubscriptionsViewSet._fetch_subscriptions",
            return_value=[(subscription := loaded_cached_subscription_factory.get())],
        )
        api_client.force_authenticate(contributor_user)
        response = api_client.get(reverse("subscription-list"), {"revenue_program_slug": revenue_program.slug})
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == [json.loads(json.dumps(subscription, cls=DjangoJSONEncoder))]

    def test_partial_update_when_unsupported_field(self, api_client, contributor_user, revenue_program):
        api_client.force_authenticate(contributor_user)
        response = api_client.patch(
            reverse("subscription-detail", args=("some-id",)),
            {"revenue_program_slug": revenue_program.slug, "payment_method_id": "something", "foo": "bar"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"detail": "Request contains unsupported fields"}

    def test_partial_update_when_not_own_subscription(
        self, api_client, contributor_user, revenue_program, mocker, subscription_factory
    ):
        customer = stripe.Customer.construct_from({"email": "not-my-email@hacker.com"}, "some-id")
        subscription = subscription_factory.get(customer=customer)
        assert contributor_user.email != customer.email
        mocker.patch("stripe.Subscription.retrieve", return_value=subscription)
        logger_spy = mocker.spy(contributions_views.logger, "warning")
        api_client.force_authenticate(contributor_user)
        response = api_client.patch(
            reverse("subscription-detail", args=(subscription.id,)),
            {"revenue_program_slug": revenue_program.slug, "payment_method_id": "something"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        logger_spy.assert_called_once_with(
            "User %s attempted to update unowned subscription %s", contributor_user.email, subscription.id
        )

    def test_partial_update_happy_path(
        self, mocker, api_client, contributor_user, subscription_factory, revenue_program
    ):
        subscription = subscription_factory.get()
        subscription.metadata["revenue_program_slug"] = revenue_program.slug
        subscription.customer = stripe.Customer.construct_from(
            {"email": contributor_user.email, "id": "cust_XXX"}, "some-id"
        )
        payment_method_id = "some-new-id"
        mock_sub_retrieve = mocker.patch("stripe.Subscription.retrieve", return_value=subscription)
        mock_payment_method_attach = mocker.patch("stripe.PaymentMethod.attach")
        mock_subscription_modify = mocker.patch(
            "stripe.Subscription.modify", return_value=(mock_modified_sub := mocker.Mock())
        )
        mock_modified_sub.latest_invoice.payment_intent = "pi_XXX"
        mock_re_retrieve_and_update_cache = mocker.patch(
            "apps.contributions.views.SubscriptionsViewSet._re_retrieve_pi_and_insert_pi_and_sub_into_cache"
        )
        api_client.force_authenticate(contributor_user)
        response = api_client.patch(
            reverse("subscription-detail", args=(subscription.id,)),
            {"revenue_program_slug": revenue_program.slug, "payment_method_id": payment_method_id},
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_sub_retrieve.assert_called_once_with(
            subscription.id, stripe_account=revenue_program.payment_provider.stripe_account_id, expand=["customer"]
        )
        mock_payment_method_attach.assert_called_once_with(
            payment_method_id,
            customer=subscription.customer.id,
            stripe_account=revenue_program.payment_provider.stripe_account_id,
        )
        mock_subscription_modify.assert_called_once_with(
            subscription.id,
            default_payment_method=payment_method_id,
            stripe_account=revenue_program.payment_provider.stripe_account_id,
            expand=["default_payment_method", "latest_invoice"],
        )
        mock_re_retrieve_and_update_cache.assert_called_once_with(
            subscription=mock_modified_sub,
            email=contributor_user.email,
            stripe_account_id=revenue_program.payment_provider.stripe_account_id,
        )

    def test_partial_update_when_error_retrieving_subscription(
        self, revenue_program, mocker, api_client, contributor_user
    ):
        mock_sub_retrieve = mocker.patch(
            "stripe.Subscription.retrieve", side_effect=stripe.error.StripeError("ruh roh")
        )
        logger_spy = mocker.spy(contributions_views.logger, "exception")
        api_client.force_authenticate(contributor_user)
        response = api_client.patch(
            reverse("subscription-detail", args=((sub_id := "some-id"),)),
            {"revenue_program_slug": revenue_program.slug, "payment_method_id": "some-id"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        mock_sub_retrieve.assert_called_once_with(
            sub_id, stripe_account=revenue_program.payment_provider.stripe_account_id, expand=["customer"]
        )
        logger_spy.assert_called_once_with("stripe.Subscription.retrieve returned a StripeError")

    def test_partial_update_when_error_attaching_payment_method(
        self, revenue_program, mocker, api_client, contributor_user, subscription_factory
    ):
        subscription = subscription_factory.get()
        subscription.metadata["revenue_program_slug"] = revenue_program.slug
        subscription.customer = stripe.Customer.construct_from(
            {"email": contributor_user.email, "id": "cust_XXX"}, "some-id"
        )
        payment_method_id = "some-new-id"
        mocker.patch("stripe.Subscription.retrieve", return_value=subscription)
        mock_payment_method_attach = mocker.patch(
            "stripe.PaymentMethod.attach", side_effect=stripe.error.StripeError("ruh roh")
        )
        logger_spy = mocker.spy(contributions_views.logger, "exception")
        api_client.force_authenticate(contributor_user)
        response = api_client.patch(
            reverse("subscription-detail", args=(subscription.id,)),
            {"revenue_program_slug": revenue_program.slug, "payment_method_id": payment_method_id},
        )
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        mock_payment_method_attach.assert_called_once_with(
            payment_method_id,
            customer=subscription.customer.id,
            stripe_account=revenue_program.payment_provider.stripe_account_id,
        )
        logger_spy.assert_called_once_with("stripe.PaymentMethod.attach returned a StripeError")

    def test_partial_update_when_error_modifying_subscription(
        self, revenue_program, mocker, api_client, contributor_user, subscription_factory
    ):
        subscription = subscription_factory.get()
        subscription.metadata["revenue_program_slug"] = revenue_program.slug
        subscription.customer = stripe.Customer.construct_from(
            {"email": contributor_user.email, "id": "cust_XXX"}, "some-id"
        )
        payment_method_id = "some-new-id"
        mocker.patch("stripe.Subscription.retrieve", return_value=subscription)
        mocker.patch("stripe.PaymentMethod.attach")
        logger_spy = mocker.spy(contributions_views.logger, "exception")
        mock_sub_modify = mocker.patch("stripe.Subscription.modify", side_effect=stripe.error.StripeError("ruh roh"))
        api_client.force_authenticate(contributor_user)
        response = api_client.patch(
            reverse("subscription-detail", args=(subscription.id,)),
            {"revenue_program_slug": revenue_program.slug, "payment_method_id": payment_method_id},
        )
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        mock_sub_modify.assert_called_once()
        logger_spy.assert_called_once_with(
            "stripe.Subscription.modify returned a StripeError when modifying subscription %s", subscription.id
        )

    def test_partial_update_when_error_on__re_retrieve_pi_and_insert_pi_and_sub_into_cache(
        self, mocker, api_client, contributor_user, subscription_factory, revenue_program
    ):
        subscription = subscription_factory.get()
        subscription.metadata["revenue_program_slug"] = revenue_program.slug
        subscription.customer = stripe.Customer.construct_from(
            {"email": contributor_user.email, "id": "cust_XXX"}, "some-id"
        )
        payment_method_id = "some-new-id"
        mocker.patch("stripe.Subscription.retrieve", return_value=subscription)
        mocker.patch("stripe.PaymentMethod.attach")
        mocker.patch("stripe.Subscription.modify", return_value=(mock_modified_sub := mocker.Mock()))
        mock_modified_sub.latest_invoice.payment_intent = "pi_XXX"
        mock_re_retrieve_and_update_cache = mocker.patch(
            "apps.contributions.views.SubscriptionsViewSet._re_retrieve_pi_and_insert_pi_and_sub_into_cache",
            side_effect=stripe.error.StripeError("ruh roh"),
        )
        logger_spy = mocker.spy(contributions_views.logger, "exception")
        api_client.force_authenticate(contributor_user)
        response = api_client.patch(
            reverse("subscription-detail", args=(subscription.id,)),
            {"revenue_program_slug": revenue_program.slug, "payment_method_id": payment_method_id},
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_re_retrieve_and_update_cache.assert_called_once()
        logger_spy.assert_called_once_with(
            "stripe.PaymentIntent.retrieve returned a StripeError when re-retrieving pi related to subscription %s after update",
            mock_modified_sub.id,
        )

    def test_update_subscription_and_pi_in_cache(
        self,
        pi_for_active_subscription_factory,
        subscription_factory,
        mocker,
    ):
        pi_cache_init_spy = mocker.spy((con_cache := contributions_views.ContributionsCacheProvider), "__init__")
        sub_cache_init_spy = mocker.spy((sub_cache := contributions_views.SubscriptionsCacheProvider), "__init__")
        mocker.patch.object(
            con_cache,
            "cache",
            new_callable=mocker.PropertyMock,
        )
        mocker.patch.object(
            sub_cache,
            "cache",
            new_callable=mocker.PropertyMock,
        )
        mock_pi_upsert = mocker.patch.object(con_cache, "upsert")
        mock_sub_upsert = mocker.patch.object(sub_cache, "upsert")
        payment_intent = pi_for_active_subscription_factory.get()
        subscription = subscription_factory.get()
        contributions_views.SubscriptionsViewSet.update_subscription_and_pi_in_cache(
            (email := "foo@bar.com"), (stripe_account_id := "some-id"), subscription, payment_intent
        )
        pi_cache_init_spy.assert_called_once_with(mocker.ANY, email, stripe_account_id)
        sub_cache_init_spy.assert_called_once_with(mocker.ANY, email, stripe_account_id)
        mock_pi_upsert.assert_called_once_with([payment_intent])
        mock_sub_upsert.assert_called_once_with([subscription])

    def test_destroy_when_subscription_not_found(self, mocker, contributor_user, api_client, revenue_program):
        mocker.patch("stripe.Subscription.retrieve", side_effect=stripe.error.StripeError("ruh roh"))
        logger_spy = mocker.spy(contributions_views.logger, "exception")
        api_client.force_authenticate(contributor_user)
        response = api_client.delete(
            reverse("subscription-detail", args=("some-id",)),
            {"revenue_program_slug": revenue_program.slug},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        logger_spy.assert_called_once_with("stripe.Subscription.retrieve returned a StripeError")

    def test_destroy_when_subscription_not_mine(
        self, mocker, contributor_user, api_client, revenue_program, subscription_factory
    ):
        subscription = subscription_factory.get()
        subscription.customer = stripe.Customer.construct_from(
            {"email": (other_email := "someone@else.com")}, "some-id"
        )
        mocker.patch("stripe.Subscription.retrieve", return_value=subscription)
        assert other_email != contributor_user.email
        logger_spy = mocker.spy(contributions_views.logger, "warning")
        api_client.force_authenticate(contributor_user)
        response = api_client.delete(
            reverse("subscription-detail", args=(subscription.id,)),
            data={"revenue_program_slug": revenue_program.slug},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        logger_spy.assert_called_once_with(
            "User %s attempted to delete unowned subscription %s", contributor_user.email, subscription.id
        )

    def test_destroy_when_error_deleting_subscription(
        self, mocker, contributor_user, api_client, revenue_program, subscription_factory
    ):
        subscription = subscription_factory.get()
        subscription.customer = stripe.Customer.construct_from(
            {"email": contributor_user.email, "id": "cus_XXXX"}, "some-id"
        )
        mocker.patch("stripe.Subscription.retrieve", return_value=subscription)
        mock_sub_delete = mocker.patch("stripe.Subscription.delete", side_effect=stripe.error.StripeError("ruh roh"))
        logger_spy = mocker.spy(contributions_views.logger, "exception")
        api_client.force_authenticate(contributor_user)
        response = api_client.delete(
            reverse("subscription-detail", args=(subscription.id,)), data={"revenue_program_slug": revenue_program.slug}
        )
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        mock_sub_delete.assert_called_once_with(
            subscription.id, stripe_account=revenue_program.payment_provider.stripe_account_id
        )
        logger_spy.assert_called_once_with("stripe.Subscription.delete returned a StripeError")

    def test_destroy_when_error_re_retrieving_subscription(
        self, mocker, contributor_user, api_client, revenue_program, subscription_factory
    ):
        subscription = subscription_factory.get()
        subscription.customer = stripe.Customer.construct_from(
            {"email": contributor_user.email, "id": "cus_XXXX"}, "some-id"
        )
        # subscription.Retrieve gets called twice in this method, once to check if subscription is owned by requester, second time
        # to retrieve updated state in order to update cache
        mock_sub_retrieve = mocker.patch(
            "stripe.Subscription.retrieve",
            side_effect=[
                subscription,
                stripe.error.StripeError("ruh roh"),
            ],
        )
        mocker.patch("stripe.Subscription.delete")
        logger_spy = mocker.spy(contributions_views.logger, "exception")
        api_client.force_authenticate(contributor_user)
        response = api_client.delete(
            reverse("subscription-detail", args=(subscription.id,)), data={"revenue_program_slug": revenue_program.slug}
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert mock_sub_retrieve.call_count == 2
        logger_spy.assert_called_once_with(
            "stripe.Subscription.retrieve returned a StripeError after canceling subscription %s",
            subscription.id,
        )

    def test_destroy_when_error_on__re_retrieve_pi_and_insert_pi_and_sub_into_cache(
        self, mocker, contributor_user, api_client, revenue_program, subscription_factory
    ):
        subscription = subscription_factory.get()
        subscription.customer = stripe.Customer.construct_from(
            {"email": contributor_user.email, "id": "cus_XXXX"}, "some-id"
        )
        # subscription.Retrieve gets called twice in this method, once to check if subscription is owned by requester, second time
        # to retrieve updated state in order to update cache
        mocker.patch(
            "stripe.Subscription.retrieve",
            side_effect=[
                subscription,
                (modified_sub := mocker.Mock()),
            ],
        )
        modified_sub.latest_invoice.payment_intent.id = "pi_XXX"
        mocker.patch("stripe.Subscription.delete")
        mock_re_retrieve_pi_and_update_cache = mocker.patch(
            "apps.contributions.views.SubscriptionsViewSet._re_retrieve_pi_and_insert_pi_and_sub_into_cache",
            side_effect=stripe.error.StripeError("ruh roh"),
        )
        logger_spy = mocker.spy(contributions_views.logger, "exception")
        api_client.force_authenticate(contributor_user)
        response = api_client.delete(
            reverse("subscription-detail", args=(subscription.id,)), data={"revenue_program_slug": revenue_program.slug}
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_re_retrieve_pi_and_update_cache.assert_called_once()
        logger_spy.assert_called_once_with(
            "stripe.PaymentIntent.retrieve returned a StripeError after canceling subscription when working on subscription %s",
            subscription.id,
        )

    def test_destroy_happy_path(self, mocker, contributor_user, api_client, revenue_program, subscription_factory):
        subscription = subscription_factory.get()
        subscription.customer = stripe.Customer.construct_from(
            {"email": contributor_user.email, "id": "cus_XXXX"}, "some-id"
        )
        # subscription.Retrieve gets called twice in this method, once to check if subscription is owned by requester, second time
        # to retrieve updated state in order to update cache
        mock_sub_retrieve = mocker.patch(
            "stripe.Subscription.retrieve",
            side_effect=[
                subscription,
                (modified_sub := mocker.Mock()),
            ],
        )
        modified_sub.latest_invoice.payment_intent.id = "pi_XXX"
        mock_sub_delete = mocker.patch("stripe.Subscription.delete")
        mock_re_retrieve_pi_and_update_cache = mocker.patch(
            "apps.contributions.views.SubscriptionsViewSet._re_retrieve_pi_and_insert_pi_and_sub_into_cache",
        )
        api_client.force_authenticate(contributor_user)
        response = api_client.delete(
            reverse("subscription-detail", args=(subscription.id,)), data={"revenue_program_slug": revenue_program.slug}
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert mock_sub_retrieve.call_count == 2
        mock_sub_retrieve.assert_has_calls(
            [
                mocker.call(
                    subscription.id,
                    stripe_account=revenue_program.payment_provider.stripe_account_id,
                    expand=["customer"],
                ),
                mocker.call(
                    subscription.id,
                    stripe_account=revenue_program.payment_provider.stripe_account_id,
                    expand=[
                        "default_payment_method",
                        "latest_invoice.payment_intent",
                    ],
                ),
            ]
        )
        mock_sub_delete.assert_called_once_with(
            subscription.id, stripe_account=revenue_program.payment_provider.stripe_account_id
        )
        mock_re_retrieve_pi_and_update_cache.assert_called_once_with(
            subscription=modified_sub,
            email=contributor_user.email,
            stripe_account_id=revenue_program.payment_provider.stripe_account_id,
        )

    @pytest.mark.parametrize(
        "has_pi",
        [True, False],
    )
    def test__re_retrieve_pi_and_insert_pi_and_sub_into_cache(
        self,
        has_pi,
        subscription_factory,
        pi_for_active_subscription_factory,
        mocker,
        revenue_program,
    ):
        pi_id = "pi_XXX"
        email_id = "foo@bar.com"
        subscription = subscription_factory.get(latest_invoice={"payment_intent": pi_id} if has_pi else None)
        mock_pi_retrieve = mocker.patch(
            "stripe.PaymentIntent.retrieve",
            return_value=(pi_for_active_subscription_factory.get(id=pi_id)),
        )
        mock_redis_pis = RedisMock()
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.ContributionsCacheProvider.cache",
            mock_redis_pis,
        )
        mock_redis_subs = RedisMock()
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.SubscriptionsCacheProvider.cache",
            mock_redis_subs,
        )
        contributions_views.SubscriptionsViewSet._re_retrieve_pi_and_insert_pi_and_sub_into_cache(
            subscription, email_id, revenue_program.payment_provider.stripe_account_id
        )
        cached_pis = json.loads(
            mock_redis_pis._data.get(f"{email_id}-payment-intents-{revenue_program.payment_provider.stripe_account_id}")
        )
        cached_subs = json.loads(
            mock_redis_subs._data.get(f"{email_id}-subscriptions-{revenue_program.payment_provider.stripe_account_id}")
        )
        assert len(cached_pis) == 1
        assert len(cached_subs) == 1
        assert cached_subs[subscription.id]["id"] == subscription.id
        if has_pi:
            mock_pi_retrieve.assert_called_once_with(
                pi_id,
                stripe_account=revenue_program.payment_provider.stripe_account_id,
                expand=["payment_method", "invoice.subscription.default_payment_method"],
            )
            assert cached_pis[pi_id]["id"] == pi_id if has_pi else None
        else:
            assert mock_pi_retrieve.called is False
            # because gets inserted in cache as a pi
            assert cached_pis.get(subscription.id)["id"] == subscription.id

    def test_update_uninvoiced_subscription_in_cache(self, mocker):
        mock_cache_provider = mocker.patch.object(contributions_views, "SubscriptionsCacheProvider", autospec=True)
        contributions_views.SubscriptionsViewSet.update_uninvoiced_subscription_in_cache(
            email=(email := "foo@bar.com"),
            stripe_account_id=(stripe_account_id := "some-id"),
            subscription=(subscription := mocker.Mock()),
        )
        mock_cache_provider.assert_called_once_with(email, stripe_account_id)
        mock_cache_provider.return_value.upsert.assert_called_once_with([subscription])


@pytest.mark.parametrize(
    (
        "is_active_for_everyone",
        "is_active_for_superusers",
        "manually_added_user",
        "user_under_test",
        "expected_status_code",
    ),
    [
        (True, False, None, "superuser", status.HTTP_200_OK),
        (True, False, None, "hub_admin_user", status.HTTP_200_OK),
        (True, False, None, "org_user_free_plan", status.HTTP_200_OK),
        (True, False, None, "rp_user", status.HTTP_200_OK),
        (False, True, None, "superuser", status.HTTP_200_OK),
        (False, True, None, "hub_admin_user", status.HTTP_403_FORBIDDEN),
        (False, True, None, "org_user_free_plan", status.HTTP_403_FORBIDDEN),
        (False, True, None, "rp_user", status.HTTP_403_FORBIDDEN),
        (False, False, "hub_admin_user", "hub_admin_user", status.HTTP_200_OK),
        (False, False, "hub_admin_user", "org_user_free_plan", status.HTTP_403_FORBIDDEN),
        (False, False, "hub_admin_user", "superuser", status.HTTP_403_FORBIDDEN),
    ],
)
@pytest.mark.django_db
@pytest.mark.usefixtures("default_feature_flags")
def test_contributions_api_resource_feature_flagging(
    is_active_for_everyone,
    is_active_for_superusers,
    manually_added_user,
    user_under_test,
    expected_status_code,
    request,
):
    """Demonstrate behavior of applying the `Flag` with name `CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME`...

    ...as defined in `apps.flags.constants`.

    This test focuses on the following user types: contributors, superusers, hub admins, org admins, and rp admins.

    Setting the flag's `everyone` to `True` should each of these user types through.

    Setting's the flag's `everyone` to `False` and `superusers` to `True` should allow only superusers through.

    We test this flag within the broader context of a view instead of narrowly unit testing the flag itself.
    This is because we want assurances about how the flag interacts with up and downstream permissioning in order to
    gate access at the API layer.

    We are testing this flag in a module-level function rather than in a test class method. This is because
    `pytest.parametrize` does not play nicely when applied to tests defined in classes subclassing from unittest
    (specifically, the parametrized function arguments do not make it to the function call).
    """
    flag_model = get_waffle_flag_model()
    contributions_access_flag = flag_model.objects.get(name=CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME)
    contributions_access_flag.everyone = is_active_for_everyone
    contributions_access_flag.superusers = is_active_for_superusers
    if manually_added_user:
        contributions_access_flag.users.add(request.getfixturevalue(manually_added_user))
    contributions_access_flag.save()
    client = APIClient()
    client.force_authenticate(request.getfixturevalue(user_under_test))
    response = client.get(reverse("contribution-list"))
    assert response.status_code == expected_status_code


@pytest.mark.django_db
def test_feature_flagging_when_flag_not_found(superuser):
    """Should raise ApiConfigurationError if view is accessed and flag can't be found.

    See docstring in `test_contributions_api_resource_feature_flagging` above for more context on the
    design of this test.
    """
    flag_model = get_waffle_flag_model()
    contributions_access_flag = flag_model.objects.get(name=CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME)
    contributions_access_flag.delete()
    client = APIClient()
    client.force_authenticate(superuser)
    response = client.get(reverse("contribution-list"))
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert response.json().get("detail", None) == "There was a problem with the API"


@pytest.fixture
def stripe_create_customer_response():
    return {"id": "customer-id"}


PI_ID = "stripe_id_123"
PI_CLIENT_SECRET = "stripe_secret_abcde123"


@pytest.fixture
def stripe_create_payment_intent_response(stripe_create_customer_response):
    return {"id": PI_ID, "client_secret": PI_CLIENT_SECRET, "customer": stripe_create_customer_response["id"]}


SUBSCRIPTION_ID = "stripe_id_456"
SUBSCRIPTION_CLIENT_SECRET = "stripe_secret_fghij456"


@pytest.fixture
def stripe_create_subscription_response(stripe_create_customer_response):
    return {
        "id": SUBSCRIPTION_ID,
        "latest_invoice": {"payment_intent": {"client_secret": SUBSCRIPTION_CLIENT_SECRET, "id": "pi_fakefakefake"}},
        "customer": stripe_create_customer_response["id"],
    }


@pytest.mark.django_db
class TestPaymentViewset:
    client = APIClient()
    # this is added because bad actor serializer needs referer
    client.credentials(HTTP_REFERER="https://www.foo.com")

    @pytest.mark.parametrize(
        ("interval", "subscription_id"),
        [
            (ContributionInterval.ONE_TIME, None),
            (
                ContributionInterval.MONTHLY,
                SUBSCRIPTION_ID,
            ),
            (
                ContributionInterval.YEARLY,
                SUBSCRIPTION_ID,
            ),
        ],
    )
    def test_create_happy_path(
        self,
        minimally_valid_contribution_form_data,
        stripe_create_subscription_response,
        stripe_create_payment_intent_response,
        stripe_create_customer_response,
        interval,
        subscription_id,
        mocker,
    ):
        """Minimal test of the happy path.

        Note that this test is kept intentionally thin because the serializers used for this view
        are extensively tested elsewhere.
        """
        mock_create_customer = mocker.Mock()
        mock_create_customer.return_value = AttrDict(stripe_create_customer_response)
        mocker.patch("stripe.Customer.create", mock_create_customer)
        mock_create_subscription = mocker.Mock()
        mock_create_subscription.return_value = AttrDict(stripe_create_subscription_response)
        mocker.patch("stripe.Subscription.create", mock_create_subscription)
        mock_create_payment_intent = mocker.Mock()
        mock_create_payment_intent.return_value = AttrDict(stripe_create_payment_intent_response)
        mocker.patch("stripe.PaymentIntent.create", mock_create_payment_intent)
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()
        data = minimally_valid_contribution_form_data | {"interval": interval}
        url = reverse("payment-list")

        save_spy = mocker.spy(Contribution, "save")
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert {"email_hash", "client_secret", "uuid"} == set(response.json().keys())
        assert Contributor.objects.count() == contributor_count + 1
        assert Contribution.objects.count() == contribution_count + 1
        contribution = Contribution.objects.get(uuid=response.json()["uuid"])
        assert contribution.interval == interval
        assert contribution.provider_subscription_id == subscription_id
        assert contribution.amount == int(data["amount"]) * 100
        save_spy.assert_called_once()

    def test_when_called_with_unexpected_interval(self, minimally_valid_contribution_form_data):
        invalid_interval = "this-is-not-legit"
        assert invalid_interval not in ContributionInterval.choices
        data = minimally_valid_contribution_form_data | {"interval": invalid_interval}
        url = reverse("payment-list")
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"interval": "The provided value for interval is not permitted"}

    def test_when_called_with_no_interval(self, minimally_valid_contribution_form_data):
        del minimally_valid_contribution_form_data["interval"]
        response = self.client.post(reverse("payment-list"), minimally_valid_contribution_form_data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"interval": "The interval field is required"}

    def test_when_no_csrf(self):
        """Show that view is inaccessible if no CSRF token is included in request.

        NB: DRF's APIClient disables CSRF protection by default, so here we have to explicitly
        configure the client to enforce CSRF checks.
        """
        client = APIClient(enforce_csrf_checks=True)
        url = reverse("payment-list")
        response = client.post(url, {})
        assert response.status_code == status.HTTP_403_FORBIDDEN
        # TODO @BW: figure out how to do csrf protection but return JSON when no token
        # https://news-revenue-hub.atlassian.net/browse/DEV-2335

    @pytest.mark.parametrize(
        ("interval", "payment_intent_id", "subscription_id"),
        [
            (ContributionInterval.ONE_TIME, PI_ID, None),
            (ContributionInterval.MONTHLY, None, SUBSCRIPTION_ID),
            (ContributionInterval.YEARLY, None, SUBSCRIPTION_ID),
        ],
    )
    def test_destroy_happy_path(self, interval, payment_intent_id, subscription_id, monkeypatch, mocker):
        contribution = ContributionFactory(
            interval=interval,
            provider_payment_id=payment_intent_id,
            provider_subscription_id=subscription_id,
            status=ContributionStatus.PROCESSING,
        )
        url = reverse("payment-detail", kwargs={"uuid": str(contribution.uuid)})

        mock_cancel = mocker.Mock()
        monkeypatch.setattr("apps.contributions.models.Contribution.cancel", mock_cancel)
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        contribution.refresh_from_db()
        mock_cancel.assert_called_once()

        # test revision and update fields

    @pytest.mark.parametrize(
        "contribution_status",
        [
            ContributionStatus.PAID,
            ContributionStatus.CANCELED,
            ContributionStatus.FAILED,
            ContributionStatus.REJECTED,
            ContributionStatus.REFUNDED,
        ],
    )
    def test_destroy_when_contribution_status_unexpected(
        self,
        contribution_status,
    ):
        contribution = ContributionFactory(status=contribution_status, one_time=True)
        url = reverse("payment-detail", kwargs={"uuid": str(contribution.uuid)})
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_409_CONFLICT

    def test_destroy_when_contribution_interval_unexpected(self):
        interval = "foo"
        assert interval not in ContributionInterval.choices
        contribution = ContributionFactory(one_time=True, interval=interval, status=ContributionStatus.PROCESSING)
        url = reverse("payment-detail", kwargs={"uuid": str(contribution.uuid)})
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @pytest.mark.parametrize(
        ("contribution_type", "contribution_status"),
        [
            ("one_time", ContributionStatus.PROCESSING),
            ("monthly_subscription", ContributionStatus.PROCESSING),
            ("one_time", ContributionStatus.FLAGGED),
            ("monthly_subscription", ContributionStatus.FLAGGED),
        ],
    )
    def test_destroy_when_stripe_error(self, contribution_type, contribution_status, monkeypatch):
        monkeypatch.setattr("stripe.PaymentIntent.cancel", mock_stripe_call_with_error)
        monkeypatch.setattr("stripe.Subscription.delete", mock_stripe_call_with_error)
        monkeypatch.setattr("stripe.PaymentMethod.retrieve", mock_stripe_call_with_error)
        contribution = ContributionFactory(
            **{
                contribution_type: True,
                "status": contribution_status,
            }
        )
        url = reverse("payment-detail", kwargs={"uuid": str(contribution.uuid)})
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json() == {"detail": "Something went wrong"}


@pytest.fixture
def payment_method_attached_request_data():
    with Path("apps/contributions/tests/fixtures/payment-method-attached-webhook.json").open() as f:
        return json.load(f)


class TestProcessStripeWebhook:
    """Additional tests.

    We primarily test contributions-related webhook endpoints in `apps.contributions.tests.test_webhooks_integration`,
    which spans both the view layer and the task layer.

    There are a handful of paths through the process stripe webhook view that are best tested in isolation, so we
    do that here. But in general, let's strive to test at integration level for business logic around contributions-related
    webhooks.
    """

    def test_happy_path(self, api_client, mocker):
        mocker.patch("stripe.Webhook.construct_event", return_value=(event := mocker.Mock()))
        mock_process_task = mocker.patch("apps.contributions.views.process_stripe_webhook_task.delay")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        response = api_client.post(reverse("stripe-webhooks-contributions"), data={}, **header)
        assert response.status_code == status.HTTP_200_OK
        mock_process_task.assert_called_once_with(raw_event_data=event)

    def test_when_value_error_on_construct_event(self, api_client, mocker):
        logger_spy = mocker.patch("apps.contributions.views.logger.warning")
        mocker.patch("stripe.Webhook.construct_event", side_effect=ValueError("ruh roh"))
        mock_process_task = mocker.patch("apps.contributions.views.process_stripe_webhook_task.delay")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        response = api_client.post(reverse("stripe-webhooks-contributions"), data={"foo": "bar"}, **header)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        mock_process_task.assert_not_called()
        logger_spy.assert_called_once_with("Invalid payload from Stripe webhook request")

    def test_when_signature_verification_error(self, api_client, mocker):
        logger_spy = mocker.patch("apps.contributions.views.logger.exception")
        mocker.patch(
            "stripe.Webhook.construct_event", side_effect=stripe.error.SignatureVerificationError("ruh roh", "sig")
        )
        mock_process_task = mocker.patch("apps.contributions.views.process_stripe_webhook_task.delay")
        header = {"HTTP_STRIPE_SIGNATURE": "testing", "content_type": "application/json"}
        response = api_client.post(reverse("stripe-webhooks-contributions"), data={"foo": "bar"}, **header)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        mock_process_task.assert_not_called()
        logger_spy.assert_called_once_with(
            "Invalid signature on Stripe webhook request. Is STRIPE_WEBHOOK_SECRET_CONTRIBUTIONS set correctly?"
        )


@pytest.mark.django_db
@pytest.mark.usefixtures("_clear_cache")
class TestPortalContributorsViewSet:
    @pytest.fixture
    def one_time_contribution(self, revenue_program, portal_contributor, mocker, faker):
        contribution = ContributionFactory(
            interval=ContributionInterval.ONE_TIME,
            status=ContributionStatus.PAID,
            donation_page__revenue_program=revenue_program,
            contributor=portal_contributor,
            provider_payment_id=faker.pystr_format(string_format="pi_??????"),
            provider_customer_id=faker.pystr_format(string_format="cus_??????"),
            provider_payment_method_id=faker.pystr_format(string_format="pm_??????"),
        )
        PaymentFactory(
            contribution=contribution,
            amount_refunded=0,
            gross_amount_paid=contribution.amount,
            net_amount_paid=contribution.amount - 100,
        )
        return contribution

    @pytest.fixture
    def stripe_customer_factory(self, stripe_customer_default_source_expanded):
        def _stripe_customer_expanded_factory(customer_id, customer_email):
            return stripe.Customer.construct_from(
                stripe_customer_default_source_expanded
                | {
                    "id": customer_id,
                    "email": customer_email,
                },
                "some-id",
            )

        return _stripe_customer_expanded_factory

    @pytest.fixture
    def monthly_contribution(
        self,
        revenue_program,
        portal_contributor,
        faker,
        stripe_subscription,
    ):
        then = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)
        contribution = ContributionFactory(
            interval=ContributionInterval.MONTHLY,
            status=ContributionStatus.PAID,
            created=then,
            donation_page__revenue_program=revenue_program,
            contributor=portal_contributor,
            provider_payment_id=faker.pystr_format(string_format="pi_??????"),
            provider_customer_id=faker.pystr_format(string_format="cus_??????"),
            provider_subscription_id=faker.pystr_format(string_format="sub_??????"),
            provider_payment_method_id=faker.pystr_format(string_format="pm_??????"),
        )
        for x in (then, then + datetime.timedelta(days=30)):
            PaymentFactory(
                created=x,
                contribution=contribution,
                amount_refunded=0,
                gross_amount_paid=contribution.amount,
                net_amount_paid=contribution.amount - 100,
            )
        return contribution

    @pytest.fixture
    def yearly_contribution(
        self,
        revenue_program,
        portal_contributor,
        faker,
        stripe_subscription,
    ):
        then = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=365)
        contribution = ContributionFactory(
            interval=ContributionInterval.YEARLY,
            status=ContributionStatus.PAID,
            created=then,
            donation_page__revenue_program=revenue_program,
            contributor=portal_contributor,
            provider_payment_id=faker.pystr_format(string_format="pi_??????"),
            provider_customer_id=faker.pystr_format(string_format="cus_??????"),
            provider_subscription_id=faker.pystr_format(string_format="sub_??????"),
            provider_payment_method_id=faker.pystr_format(string_format="pm_??????"),
        )
        for x in (then, then + datetime.timedelta(days=365)):
            PaymentFactory(
                created=x,
                contribution=contribution,
                amount_refunded=0,
                gross_amount_paid=contribution.amount,
                net_amount_paid=contribution.amount - 100,
            )
        return contribution

    @pytest.fixture
    def portal_contributor(self):
        return ContributorFactory()

    @pytest.fixture
    def portal_contributor_with_multiple_contributions(
        self,
        portal_contributor,
        yearly_contribution,
        monthly_contribution,
        one_time_contribution,
        stripe_customer_factory,
        mocker,
        stripe_subscription,
    ):
        cust_id = monthly_contribution.provider_customer_id
        one_time_contribution.provider_customer_id = cust_id
        one_time_contribution.save()
        yearly_contribution.provider_customer_id = cust_id
        yearly_contribution.save()

        mock_customer_retrieve = mocker.patch(
            "stripe.Customer.retrieve",
            return_value=stripe_customer_factory(customer_id=cust_id, customer_email=portal_contributor.email),
        )
        stripe_subscription.customer.email = portal_contributor.email

        mock_subscription_retrieve = mocker.patch("stripe.Subscription.retrieve", return_value=stripe_subscription)
        mock_subscription_modify = mocker.patch("stripe.Subscription.modify")
        mocker.patch("stripe.PaymentMethod.retrieve", return_value=stripe.PaymentMethod.construct_from({}, "some-id"))
        mocker.patch(
            "apps.contributions.models.Contribution.is_modifiable", return_value=True, new_callable=mocker.PropertyMock
        )
        mocker.patch(
            "apps.contributions.models.Contribution.is_cancelable", return_value=True, new_callable=mocker.PropertyMock
        )
        return (
            monthly_contribution.contributor,
            mock_customer_retrieve,
            mock_subscription_retrieve,
            mock_subscription_modify,
        )

    @pytest.fixture
    def portal_contributor_with_multiple_contributions_over_multiple_rps(
        self, portal_contributor_with_multiple_contributions, stripe_subscription, faker
    ):
        contributor, _, _, _ = portal_contributor_with_multiple_contributions
        rp2 = RevenueProgramFactory()
        ContributionFactory(
            interval=ContributionInterval.MONTHLY,
            status=ContributionStatus.PAID,
            donation_page__revenue_program=rp2,
            contributor=contributor,
            provider_payment_id=faker.pystr_format(string_format="pi_??????"),
            provider_customer_id=faker.pystr_format(string_format="cus_??????"),
            provider_subscription_id=faker.pystr_format(string_format="sub_??????"),
            provider_payment_method_id=faker.pystr_format(string_format="pm_??????"),
        )
        return contributor

    def test_contributor_impact(self, portal_contributor_with_multiple_contributions, api_client):
        contributor: Contributor = portal_contributor_with_multiple_contributions[0]
        api_client.force_authenticate(contributor)
        response = api_client.get(reverse("portal-contributor-impact", args=(contributor.id,)))
        assert response.status_code == status.HTTP_200_OK
        assert response.json().keys() == {"total", "total_paid", "total_refunded"}

    @pytest.mark.parametrize("user_fixture", ["superuser", "portal_contributor_with_multiple_contributions"])
    def test_contributions_list_happy_path(
        self, user_fixture, portal_contributor_with_multiple_contributions, request, api_client
    ):
        """Test the happy path for the contributions list endpoint.

        Note that our tests show that this endpoint can be accessed both by a contributor (implicitly, when it's their own)
        or by a hub_admin
        """
        user = (
            request.getfixturevalue(user_fixture)
            if user_fixture == "hub_admin"
            else portal_contributor_with_multiple_contributions[0]
        )
        api_client.force_authenticate(user)
        response = api_client.get(
            reverse(
                "portal-contributor-contributions-list", args=(portal_contributor_with_multiple_contributions[0].id,)
            )
        )
        assert response.status_code == status.HTTP_200_OK
        assert set(response.json().keys()) == {"count", "next", "previous", "results"}
        assert len(response.json()["results"]) == 3
        assert {x["id"] for x in response.json()["results"]} == set(
            portal_contributor_with_multiple_contributions[0].contribution_set.all().values_list("id", flat=True)
        )
        for x in response.json()["results"]:
            contribution = Contribution.objects.get(id=x["id"])
            payment = Payment.objects.filter(contribution_id=contribution.id).order_by("transaction_time").first()
            parse_date = lambda value: dateparser.parse(value).replace(tzinfo=ZoneInfo("UTC"))
            assert x["amount"] == contribution.amount
            assert x["card_brand"] == contribution.card_brand
            assert x["card_last_4"] == contribution.card_last_4
            assert x["card_expiration_date"] == contribution.card_expiration_date
            assert parse_date(x["created"]) == contribution.created
            assert parse_date(x["first_payment_date"]) == payment.transaction_time
            assert x["is_cancelable"] == contribution.is_cancelable
            assert x["is_modifiable"] == contribution.is_modifiable
            assert parse_date(x["last_payment_date"]) == contribution._last_payment_date
            if contribution.interval == ContributionInterval.ONE_TIME:
                assert x["next_payment_date"] is None
            else:
                assert parse_date(x["next_payment_date"]) == contribution.next_payment_date
            assert x["payment_type"] == contribution.payment_type
            assert x["revenue_program"] == contribution.donation_page.revenue_program.id
            assert x["status"] == contribution.status

    def test_contributions_list_filter_by_status(self, api_client, portal_contributor_with_multiple_contributions):
        contributor = portal_contributor_with_multiple_contributions[0]
        api_client.force_authenticate(contributor)
        (excluded := contributor.contribution_set.first()).status = ContributionStatus.FAILED
        excluded.save()
        response = api_client.get(
            reverse("portal-contributor-contributions-list", args=(contributor.id,))
            + f"?status={ContributionStatus.PAID}"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()["results"]) == 2
        assert (
            response.json()["results"][0]["id"]
            == contributor.contribution_set.filter(status=ContributionStatus.PAID).last().id
        )
        assert (
            response.json()["results"][1]["id"]
            == contributor.contribution_set.filter(status=ContributionStatus.PAID).first().id
        )

    def test_contributions_list_filter_by_rp(
        self, api_client, portal_contributor_with_multiple_contributions_over_multiple_rps
    ):
        contributor = portal_contributor_with_multiple_contributions_over_multiple_rps
        # "Set" initial list to get unique revenue programs, than transform back to "list" for indexing
        rps = list(
            set(contributor.contribution_set.values_list("donation_page__revenue_program", flat=True).distinct())
        )
        assert len(rps) > 1
        api_client.force_authenticate(contributor)

        def assert_result(response, result_id):
            assert response.status_code == status.HTTP_200_OK
            assert len(response.json()["results"])
            assert {x["revenue_program"] for x in response.json()["results"]} == {result_id}

        response = api_client.get(
            reverse("portal-contributor-contributions-list", args=(contributor.id,)) + f"?revenue_program={rps[0]}"
        )
        assert_result(response, rps[0])
        response = api_client.get(
            reverse("portal-contributor-contributions-list", args=(contributor.id,)) + f"?revenue_program={rps[1]}"
        )
        assert_result(response, rps[1])

    @pytest.mark.parametrize(
        "ordering",
        [
            "amount",
            "created",
            "status",
        ],
    )
    @pytest.mark.parametrize("descending", [True, False])
    def test_contributions_list_ordering_behavior(
        self, portal_contributor_with_multiple_contributions, descending, ordering, api_client
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        amount = 1000
        # guarantee we have orderable values on amount
        for index, x in enumerate(Contribution.objects.all()):
            x.amount = amount
            amount += 1000
            match index:
                case 0:
                    x.status = ContributionStatus.PAID.label
                case 1:
                    x.status = ContributionStatus.FAILED.label
                case 2:
                    x.status = ContributionStatus.FLAGGED.label
            x.payment_set.all().update(gross_amount_paid=x.amount, net_amount_paid=x.amount - 100)
            x.save()
        api_client.force_authenticate(contributor)
        response = api_client.get(
            reverse("portal-contributor-contributions-list", args=(contributor.id,))
            + f"?ordering={'-' if descending else ''}{ordering}"
        )
        assert response.status_code == status.HTTP_200_OK
        if descending:
            assert response.json()["results"][0][ordering] > response.json()["results"][1][ordering]
        else:
            assert response.json()["results"][0][ordering] < response.json()["results"][1][ordering]

    @pytest.mark.parametrize(
        "ordering",
        [
            "status,-created",
            "amount,-created",
        ],
    )
    @pytest.mark.parametrize("descending", [True, False])
    def test_contributions_list_ordering_multiple_fields_behavior(
        self, portal_contributor_with_multiple_contributions, descending, ordering, api_client
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        amount = 1000
        # guarantee we have orderable values on amount
        page = DonationPageFactory()
        for index, x in enumerate(Contribution.objects.all()):
            x.amount = amount
            amount += 1000
            match index:
                case 0:
                    x.status = ContributionStatus.PAID.label
                case 1:
                    x.status = ContributionStatus.FAILED.label
                case 2:
                    x.status = ContributionStatus.FLAGGED.label
            x.payment_set.all().update(gross_amount_paid=x.amount, net_amount_paid=x.amount - 100)
            # Create identical contribution with different date (test second field ordering by date)
            Contribution.objects.create(amount=x.amount, status=x.status, contributor=contributor, donation_page=page)
            x.save()
        api_client.force_authenticate(contributor)
        response = api_client.get(
            reverse("portal-contributor-contributions-list", args=(contributor.id,))
            + f"?ordering={'-' if descending else ''}{ordering}"
        )
        assert response.status_code == status.HTTP_200_OK
        [first, second] = ordering.split(",")

        if descending:
            # First and second results have the same value
            assert response.json()["results"][0][first] == response.json()["results"][1][first]
            # Second must be ordered in relation to the third
            assert response.json()["results"][1][first] > response.json()["results"][2][first]
        else:
            # First and second results have the same value
            assert response.json()["results"][0][first] == response.json()["results"][1][first]
            # Second must be ordered in relation to the third
            assert response.json()["results"][1][first] < response.json()["results"][2][first]

        if second.startswith("-"):
            # Results are ordered based on the second ordered field
            assert response.json()["results"][0][second[1:]] > response.json()["results"][1][second[1:]]
        else:
            assert response.json()["results"][0][second] < response.json()["results"][1][second]

    def test_contributions_list_pagination_behavior(
        self, api_client, mocker, stripe_customer_default_source_expanded, stripe_payment_method
    ):
        mocker.patch(
            "stripe.Customer.retrieve",
            stripe.Customer.construct_from(stripe_customer_default_source_expanded, "some-id"),
        )
        mocker.patch(
            "stripe.PaymentMethod.retrieve",
            return_value=stripe.PaymentMethod.construct_from(stripe_payment_method, "some-id"),
        )
        contributor = ContributorFactory()
        page = DonationPageFactory()
        ContributionFactory.create_batch(
            100, contributor=contributor, donation_page=page, status=ContributionStatus.PAID
        )
        api_client.force_authenticate(contributor)
        response = api_client.get(reverse("portal-contributor-contributions-list", args=(contributor.id,)))
        assert response.status_code == status.HTTP_200_OK
        assert response.json().keys() == {"count", "next", "previous", "results"}
        response = api_client.get(response.json()["next"])
        assert response.status_code == status.HTTP_200_OK

    @pytest.fixture(params=["superuser", "hub_admin_user", "org_user_free_plan", "rp_user"])
    def non_contributor_user(self, request):
        return request.getfixturevalue(request.param)

    @pytest.fixture(params=["superuser", "org_user_free_plan", "rp_user"])
    def unpermitted_user_for_contributions_list(self, request):
        return request.getfixturevalue(request.param)

    def test_contributions_list_when_im_not_contributor_user_type(
        self, api_client, unpermitted_user_for_contributions_list, portal_contributor_with_multiple_contributions
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        api_client.force_authenticate(unpermitted_user_for_contributions_list)
        response = api_client.get(reverse("portal-contributor-contributions-list", args=(contributor.id,)))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_contributions_list_when_im_not_owning_contributor(
        self, api_client, portal_contributor_with_multiple_contributions
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        other_contributor = ContributorFactory()
        api_client.force_authenticate(other_contributor)
        response = api_client.get(reverse("portal-contributor-contributions-list", args=(contributor.id,)))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.parametrize(
        "status",
        [
            ContributionStatus.FLAGGED,
            ContributionStatus.PROCESSING,
            ContributionStatus.REJECTED,
        ],
    )
    def test_contributions_list_hides_statuses(
        self,
        status,
        api_client,
        yearly_contribution,
        monthly_contribution,
        one_time_contribution,
        portal_contributor_with_multiple_contributions,
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        one_time_contribution.status = status
        one_time_contribution.save()
        api_client.force_authenticate(contributor)
        response = api_client.get(reverse("portal-contributor-contributions-list", args=(contributor.id,)))
        assert len(response.json()["results"]) == 2
        assert response.json()["results"][0]["id"] == yearly_contribution.id
        assert response.json()["results"][1]["id"] == monthly_contribution.id

    def test_contribution_detail_get_happy_path(
        self,
        api_client,
        portal_contributor_with_multiple_contributions,
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        api_client.force_authenticate(contributor)
        for x in contributor.contribution_set.all():
            response = api_client.get(
                reverse(
                    "portal-contributor-contribution-detail",
                    args=(
                        contributor.id,
                        x.id,
                    ),
                )
            )
            assert response.status_code == status.HTTP_200_OK
            for k in PORTAL_CONTRIBUTION_DETAIL_SERIALIZER_DB_FIELDS:
                match k:
                    case "payments":
                        assert len(response.json()[k]) == x.payment_set.count()
                        for y in response.json()[k]:
                            payment = Payment.objects.get(id=y["id"])
                            for z in (
                                "gross_amount_paid",
                                "net_amount_paid",
                                "created",
                                "transaction_time",
                                "amount_refunded",
                            ):
                                compared_val = y[z]
                                if z in ("created", "transaction_time"):
                                    compared_val = dateparser.parse(compared_val).replace(tzinfo=ZoneInfo("UTC"))
                                assert getattr(payment, z) == compared_val

                    case "revenue_program":
                        assert response.json()[k] == x.donation_page.revenue_program.id

                    case "created" | "last_payment_date":
                        compare_val = dateparser.parse(response.json()[k]).replace(tzinfo=ZoneInfo("UTC"))
                        assert compare_val == getattr(x, k if k != "last_payment_date" else "_last_payment_date")
                    case "first_payment_date":
                        assert response.json()[k]
                    case "next_payment_date":
                        compare_val = (
                            dateparser.parse(response.json()[k]).replace(tzinfo=ZoneInfo("UTC"))
                            if x.interval != ContributionInterval.ONE_TIME
                            else None
                        )
                        assert compare_val == getattr(x, k)

                    case _:
                        assert response.json()[k] == getattr(x, k)

    def test_contribution_detail_get_when_im_not_contributor(
        self, portal_contributor_with_multiple_contributions, non_contributor_user, api_client, mocker
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        api_client.force_authenticate(non_contributor_user)
        response = api_client.get(
            reverse(
                "portal-contributor-contribution-detail",
                args=(
                    contributor.id,
                    contributor.contribution_set.first().id,
                ),
            ),
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_contribution_detail_get_when_contribution_not_found(
        self, api_client, portal_contributor_with_multiple_contributions
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        deleted = contributor.contribution_set.first()
        deleted_id = deleted.id
        deleted.delete()
        api_client.force_authenticate(contributor)
        response = api_client.get(
            reverse(
                "portal-contributor-contribution-detail",
                args=(
                    contributor.id,
                    deleted_id,
                ),
            )
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Contribution not found"}

    def test_contribution_detail_get_when_not_own_contribution(
        self, api_client, portal_contributor_with_multiple_contributions
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        not_mine = ContributionFactory()
        api_client.force_authenticate(contributor)
        response = api_client.get(
            reverse(
                "portal-contributor-contribution-detail",
                args=(
                    contributor.id,
                    not_mine.id,
                ),
            )
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Contribution not found"}

    @pytest.mark.parametrize(
        "interval",
        [
            ContributionInterval.ONE_TIME,
            ContributionInterval.MONTHLY,
            ContributionInterval.YEARLY,
        ],
    )
    def test_contribution_send_receipt(
        self,
        interval,
        api_client,
        portal_contributor_with_multiple_contributions,
        mocker,
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        contribution = contributor.contribution_set.filter(interval=interval).first()
        mock_send_receipt = mocker.patch("apps.contributions.models.Contribution.handle_thank_you_email")
        api_client.force_authenticate(contributor)
        response = api_client.post(
            reverse("portal-contributor-contribution-receipt", args=(contributor.id, contribution.id))
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_send_receipt.assert_called_once()

    @pytest.mark.parametrize(
        ("contribution_status", "send_receipt"),
        [
            (ContributionStatus.PAID, True),
            (ContributionStatus.CANCELED, True),
            (ContributionStatus.REFUNDED, True),
            (ContributionStatus.FAILED, True),
            # Should return 404 Not Found error on all HIDDEN_STATUSES
            (ContributionStatus.PROCESSING, False),
            (ContributionStatus.FLAGGED, False),
            (ContributionStatus.REJECTED, False),
        ],
    )
    def test_contribution_send_receipt_on_status(
        self,
        contribution_status,
        send_receipt,
        api_client,
        portal_contributor_with_multiple_contributions,
        mocker,
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        contribution = contributor.contribution_set.first()
        contribution.status = contribution_status
        contribution.save()
        mock_send_receipt = mocker.patch("apps.contributions.models.Contribution.handle_thank_you_email")
        api_client.force_authenticate(contributor)
        response = api_client.post(
            reverse("portal-contributor-contribution-receipt", args=(contributor.id, contribution.id))
        )
        if send_receipt:
            assert response.status_code == status.HTTP_204_NO_CONTENT
            mock_send_receipt.assert_called_once()
        else:
            assert response.status_code == status.HTTP_404_NOT_FOUND
            assert response.json() == {"detail": "Contribution not found"}
            mock_send_receipt.assert_not_called()

    def test_contribution_send_receipt_when_im_not_contributor(
        self, portal_contributor_with_multiple_contributions, non_contributor_user, api_client, mocker
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        api_client.force_authenticate(non_contributor_user)
        response = api_client.post(
            reverse(
                "portal-contributor-contribution-receipt",
                args=(
                    contributor.id,
                    contributor.contribution_set.first().id,
                ),
            ),
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_contribution_send_receipt_when_contribution_not_found(
        self, api_client, portal_contributor_with_multiple_contributions
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        deleted = contributor.contribution_set.first()
        deleted_id = deleted.id
        deleted.delete()
        api_client.force_authenticate(contributor)
        response = api_client.post(
            reverse(
                "portal-contributor-contribution-receipt",
                args=(
                    contributor.id,
                    deleted_id,
                ),
            ),
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Contribution not found"}

    def test_contribution_send_receipt_when_not_own_contribution(
        self, api_client, portal_contributor_with_multiple_contributions
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        not_mine = ContributionFactory()
        api_client.force_authenticate(contributor)
        response = api_client.post(
            reverse(
                "portal-contributor-contribution-receipt",
                args=(
                    contributor.id,
                    not_mine.id,
                ),
            ),
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Contribution not found"}

    @pytest.mark.parametrize("http_method", ["delete", "get", "patch"])
    @pytest.mark.parametrize(
        "contribution_status",
        [
            ContributionStatus.FLAGGED,
            ContributionStatus.PROCESSING,
            ContributionStatus.REJECTED,
        ],
    )
    def test_contributions_detail_when_hidden_status(
        self,
        http_method,
        contribution_status,
        api_client,
        one_time_contribution,
        portal_contributor_with_multiple_contributions,
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        one_time_contribution.status = contribution_status
        one_time_contribution.save()
        api_client.force_authenticate(contributor)
        response = getattr(api_client, http_method)(
            reverse("portal-contributor-contribution-detail", args=(contributor.id, one_time_contribution.id))
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Contribution not found"}

    @pytest.mark.parametrize("request_data", [{}, {"provider_payment_method_id": "pm_123"}])
    def test_contribution_detail_patch_happy_path(
        self,
        request_data,
        api_client,
        portal_contributor_with_multiple_contributions,
        mocker,
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        contribution = contributor.contribution_set.exclude(interval=ContributionInterval.ONE_TIME).last()
        mock_pm_attach = mocker.patch("stripe.PaymentMethod.attach")
        mock_update_sub = mocker.patch("stripe.Subscription.modify")
        api_client.force_authenticate(contributor)
        response = api_client.patch(
            reverse(
                "portal-contributor-contribution-detail",
                args=(
                    contributor.id,
                    contribution.id,
                ),
            ),
            data=request_data,
        )
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        if pm_id := request_data.get("provider_payment_method_id"):
            assert contribution.provider_payment_method_id == pm_id
            mock_pm_attach.assert_called_once_with(
                pm_id, customer=contribution.provider_customer_id, stripe_account=contribution.stripe_account_id
            )
            mock_update_sub.assert_called_once_with(
                contribution.provider_subscription_id,
                default_payment_method=pm_id,
                stripe_account=contribution.stripe_account_id,
            )
        else:
            mock_pm_attach.assert_not_called()
            mock_update_sub.assert_not_called()

    @pytest.mark.parametrize("request_data", [{}, {"amount": 100}])
    def test_contribution_detail_patch_amount(
        self,
        request_data,
        api_client,
        portal_contributor_with_multiple_contributions,
        mocker,
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        contribution = contributor.contribution_set.exclude(interval=ContributionInterval.ONE_TIME).last()
        mock_sub_item_list = mocker.patch(
            "stripe.SubscriptionItem.list",
            return_value={
                "data": [
                    {
                        "id": "si_123",
                        "price": {
                            "currency": "usd",
                            "product": "prod_123",
                            "recurring": {
                                "interval": "month",
                            },
                        },
                    }
                ]
            },
        )
        mock_update_sub = mocker.patch("stripe.Subscription.modify")
        api_client.force_authenticate(contributor)
        response = api_client.patch(
            reverse(
                "portal-contributor-contribution-detail",
                args=(
                    contributor.id,
                    contribution.id,
                ),
            ),
            data=request_data,
        )
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        if amount := request_data.get("amount"):
            assert contribution.amount == amount
            assert contribution.contribution_metadata["donor_selected_amount"] == amount
            mock_update_sub.assert_called()
        else:
            mock_sub_item_list.assert_not_called()
            mock_update_sub.assert_not_called()

    def test_contribution_detail_patch_when_not_own_contribution(
        self, api_client, portal_contributor_with_multiple_contributions
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        not_mine = ContributionFactory()
        api_client.force_authenticate(contributor)
        response = api_client.patch(
            reverse(
                "portal-contributor-contribution-detail",
                args=(
                    contributor.id,
                    not_mine.id,
                ),
            )
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Contribution not found"}

    @pytest.fixture
    def patch_data_setting_pm_id_to_empty_string(self):
        return {"provider_payment_method_id": ""}

    def test_contribution_detail_patch_when_try_to_set_pm_id_to_empty_string(
        self, api_client, portal_contributor_with_multiple_contributions, patch_data_setting_pm_id_to_empty_string
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        contribution = contributor.contribution_set.exclude(interval=ContributionInterval.ONE_TIME).last()
        last_modified = contribution.modified
        api_client.force_authenticate(contributor)
        response = api_client.patch(
            reverse(
                "portal-contributor-contribution-detail",
                args=(
                    contributor.id,
                    contribution.id,
                ),
            ),
            data=patch_data_setting_pm_id_to_empty_string,
        )
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.modified == last_modified

    def test_contribution_detail_patch_when_stripe_error(
        self, api_client, portal_contributor_with_multiple_contributions, mocker
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        contribution = contributor.contribution_set.exclude(interval=ContributionInterval.ONE_TIME).last()
        mock_pm_attach = mocker.patch("stripe.PaymentMethod.attach", side_effect=stripe.error.StripeError("ruh roh"))
        api_client.force_authenticate(contributor)
        response = api_client.patch(
            reverse(
                "portal-contributor-contribution-detail",
                args=(
                    contributor.id,
                    contribution.id,
                ),
            ),
            data={"provider_payment_method_id": "pm_888"},
        )
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json() == {"detail": "Problem updating contribution"}
        mock_pm_attach.assert_called_once()

    def test_contribution_detail_delete_happy_path(
        self, api_client, portal_contributor_with_multiple_contributions, mocker
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        mock_delete_sub = mocker.patch("stripe.Subscription.delete")
        api_client.force_authenticate(contributor)
        contribution = contributor.contribution_set.filter(~Q(interval=ContributionInterval.ONE_TIME)).first()
        response = api_client.delete(
            reverse("portal-contributor-contribution-detail", args=(contributor.id, contribution.id))
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_delete_sub.assert_called_once_with(
            contribution.provider_subscription_id,
            stripe_account=contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
        )

    def test_contribution_detail_delete_when_stripe_error(
        self, api_client, portal_contributor_with_multiple_contributions, mocker
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        mocker.patch("stripe.Subscription.delete", side_effect=stripe.error.StripeError("ruh roh"))
        api_client.force_authenticate(contributor)
        contribution = contributor.contribution_set.filter(~Q(interval=ContributionInterval.ONE_TIME)).first()
        response = api_client.delete(
            reverse("portal-contributor-contribution-detail", args=(contributor.id, contribution.id))
        )
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json() == {"detail": "Problem canceling contribution"}

    def test_contribution_detail_delete_when_not_contributor(
        self, api_client, portal_contributor_with_multiple_contributions, non_contributor_user
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        contribution = contributor.contribution_set.filter(~Q(interval=ContributionInterval.ONE_TIME)).first()
        api_client.force_authenticate(non_contributor_user)
        response = api_client.delete(
            reverse("portal-contributor-contribution-detail", args=(contributor.id, contribution.id))
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_contribution_detail_delete_when_not_my_contribution(
        self, api_client, portal_contributor_with_multiple_contributions
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        contribution = ContributionFactory()
        api_client.force_authenticate(contributor)
        response = api_client.delete(
            reverse("portal-contributor-contribution-detail", args=(contributor.id, contribution.id))
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_contribution_detail_delete_when_contribution_not_found(
        self, api_client, portal_contributor_with_multiple_contributions
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        api_client.force_authenticate(contributor)
        contribution = contributor.contribution_set.filter(~Q(interval=ContributionInterval.ONE_TIME)).first()
        contribution_id = contribution.id
        contribution.delete()
        response = api_client.delete(
            reverse("portal-contributor-contribution-detail", args=(contributor.id, contribution_id))
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_contribution_detail_delete_when_subscription_not_cancelable(
        self, api_client, portal_contributor_with_multiple_contributions, mocker
    ):
        mocker.patch(
            "apps.contributions.models.Contribution.is_cancelable", return_value=False, new_callable=mocker.PropertyMock
        )
        contributor = portal_contributor_with_multiple_contributions[0]
        api_client.force_authenticate(contributor)
        contribution = contributor.contribution_set.filter(interval=ContributionInterval.ONE_TIME).first()
        response = api_client.delete(
            reverse("portal-contributor-contribution-detail", args=(contributor.id, contribution.id))
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"detail": "Cannot cancel contribution"}

    @pytest.mark.parametrize(
        ("method", "kwargs"),
        [("get", {}), ("patch", {"data": {"payment_method_id": "something"}}), ("delete", {})],
    )
    def test_views_when_contributor_not_found(
        self, method, kwargs, api_client, portal_contributor_with_multiple_contributions
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        contribution_id = contributor.contribution_set.filter(interval=ContributionInterval.ONE_TIME).first().id
        contributor_id = contributor.id
        api_client.force_authenticate(contributor)
        contributor.delete()
        response = getattr(api_client, method)(
            reverse("portal-contributor-contribution-detail", args=(contributor_id, contribution_id)),
            **kwargs,
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Contributor not found"}

    @pytest.mark.parametrize(
        ("method", "kwargs"),
        [("get", {}), ("patch", {"data": {"provider_payment_method_id": "something"}}), ("delete", {})],
    )
    def test_views_when_contribution_not_found(
        self, method, kwargs, api_client, portal_contributor_with_multiple_contributions
    ):
        contributor = portal_contributor_with_multiple_contributions[0]
        contribution = contributor.contribution_set.filter(interval=ContributionInterval.ONE_TIME).first()
        contribution_id = contribution.id
        contribution.delete()
        contributor_id = contributor.id

        api_client.force_authenticate(contributor)
        response = getattr(api_client, method)(
            reverse("portal-contributor-contribution-detail", args=(contributor_id, contribution_id)),
            **kwargs,
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Contribution not found"}

    def test_get_contributor_queryset(self, mocker):
        exclude_hidden_spy = mocker.spy(ContributionQuerySet, "exclude_hidden_statuses")
        exclude_paymentless_spy = mocker.spy(ContributionQuerySet, "exclude_paymentless_canceled")
        exclude_missing_stripe_sub_id = mocker.spy(
            ContributionQuerySet, "exclude_recurring_missing_provider_subscription_id"
        )
        exclude_dummy_payment_method_id = mocker.spy(ContributionQuerySet, "exclude_dummy_payment_method_id")
        contributions_views.PortalContributorsViewSet().get_contributor_queryset(contributor=ContributorFactory())
        exclude_hidden_spy.assert_called_once()
        exclude_paymentless_spy.assert_called_once()
        exclude_missing_stripe_sub_id.assert_called_once()
        exclude_dummy_payment_method_id.assert_called_once()


@pytest.mark.django_db
class TestSwitchboardContributionsViewSet:

    @pytest.fixture
    def switchboard_user(self, settings):
        settings.SWITCHBOARD_ACCOUNT_EMAIL = (email := "switchboard@foo.org")
        return UserFactory(email=email)

    @pytest.fixture
    def other_user(self):
        return UserFactory(is_superuser=True)

    @pytest.fixture
    def organization(self):
        return OrganizationFactory()

    @pytest.fixture
    def rp_1(self, organization):
        return RevenueProgramFactory(organization=organization)

    @pytest.fixture
    def rp_2(self, organization):
        return RevenueProgramFactory(organization=organization)

    @pytest.fixture
    def other_orgs_rp(self):
        return RevenueProgramFactory()

    @pytest.fixture
    def contribution_with_donation_page(self, rp_1):
        return ContributionFactory(donation_page__revenue_program=rp_1)

    @pytest.fixture
    def contribution_without_donation_page(self, rp_1):
        return ContributionFactory(donation_page=None, _revenue_program=rp_1)

    @pytest.fixture(params=["contribution_with_donation_page", "contribution_without_donation_page"])
    def contribution(self, request):
        return request.getfixturevalue(request.param)

    @pytest.mark.parametrize(
        "request_has_revenue_program",
        [
            True,
            False,
        ],
    )
    @pytest.mark.parametrize(
        "instance_has_donation_page",
        [
            True,
            False,
        ],
    )
    def test_update_revenue_program_happy_path(
        self,
        request_has_revenue_program,
        instance_has_donation_page,
        api_client,
        rp_2,
        rp_1,
        contribution,
        switchboard_user,
    ):
        body = {"revenue_program": rp_2.id} if request_has_revenue_program else {}
        if not instance_has_donation_page:
            contribution.donation_page = None
            contribution._revenue_program = rp_1
            contribution.save()
        api_client.force_authenticate(switchboard_user)
        response = api_client.patch(reverse("switchboard-contribution-detail", args=(contribution.id,)), data=body)
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        if request_has_revenue_program:
            assert contribution._revenue_program == rp_2

    def test_update_when_not_switchboard_user(self, api_client, other_user, contribution):
        api_client.force_authenticate(other_user)
        response = api_client.patch(reverse("switchboard-contribution-detail", args=(contribution.id,)))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_when_patching_rp_for_different_org(self, api_client, switchboard_user, contribution, other_orgs_rp):
        api_client.force_authenticate(switchboard_user)
        assert contribution.revenue_program.organization != other_orgs_rp.organization
        response = api_client.patch(
            reverse("switchboard-contribution-detail", args=(contribution.id,)),
            data={"revenue_program": other_orgs_rp.id},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {
            "revenue_program": ["Cannot assign contribution to a revenue program from a different organization"]
        }
