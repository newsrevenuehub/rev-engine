import json
from unittest import mock

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.http import Http404
from django.test import RequestFactory, override_settings

import pytest
import pytest_cases
import stripe
from addict import Dict as AttrDict
from rest_framework import status
from rest_framework.request import Request
from rest_framework.reverse import reverse
from rest_framework.test import APIClient, APITestCase
from reversion.models import Version
from stripe.oauth_error import InvalidGrantError as StripeInvalidGrantError
from stripe.stripe_object import StripeObject
from waffle import get_waffle_flag_model

from apps.common.constants import CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME
from apps.common.tests.test_resources import AbstractTestCase
from apps.contributions import views as contributions_views
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionQuerySet,
    ContributionStatus,
    Contributor,
)
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.serializers import ContributionSerializer, SubscriptionsSerializer
from apps.contributions.tasks import (
    email_contribution_csv_export_to_user,
    task_pull_serialized_stripe_contributions_to_cache,
)
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.contributions.tests.test_serializers import (
    mock_get_bad_actor,
    mock_stripe_call_with_error,
)
from apps.organizations.tests.factories import (
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory
from apps.users.choices import Roles
from apps.users.tests.factories import create_test_user


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


@override_settings(STRIPE_OAUTH_SCOPE=expected_oauth_scope)
class StripeOAuthTest(AbstractTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.set_up_domain_model()

    def _make_request(self, code=None, scope=None, revenue_program_id=None):
        self.client.force_authenticate(user=self.org_user)
        url = reverse("stripe-oauth")
        complete_url = f"{url}?{settings.ORG_SLUG_PARAM}={self.org1.slug}"
        body = {}
        if revenue_program_id:
            body["revenue_program_id"] = revenue_program_id
        if code:
            body["code"] = code
        if scope:
            body["scope"] = scope
        return self.client.post(complete_url, body)

    @mock.patch("apps.contributions.views.task_verify_apple_domain")
    @mock.patch("stripe.OAuth.token")
    def test_response_when_missing_params(self, stripe_oauth_token, task_verify_apple_domain):
        # Missing code
        response = self._make_request(code=None, scope=expected_oauth_scope, revenue_program_id=self.org1_rp1.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn("missing_params", response.data)
        stripe_oauth_token.assert_not_called()

        # Missing scope
        response = self._make_request(code="12345", scope=None, revenue_program_id=self.org1_rp1.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn("missing_params", response.data)
        stripe_oauth_token.assert_not_called()

        # Missing revenue_program_id
        response = self._make_request(code="12345", scope=expected_oauth_scope, revenue_program_id=None)
        self.assertEqual(response.status_code, 400)
        self.assertIn("missing_params", response.data)
        stripe_oauth_token.assert_not_called()

        # Missing code, scope and revenue_program_id
        response = self._make_request(code=None, scope=None, revenue_program_id=None)
        self.assertEqual(response.status_code, 400)
        self.assertIn("missing_params", response.data)
        stripe_oauth_token.assert_not_called()
        assert not task_verify_apple_domain.delay.called

    @mock.patch("apps.contributions.views.task_verify_apple_domain")
    @mock.patch("stripe.OAuth.token")
    def test_response_when_scope_param_mismatch(self, stripe_oauth_token, task_verify_apple_domain):
        """
        We verify that the "scope" parameter provided by the frontend matches the scope we expect
        """
        response = self._make_request(code="1234", scope="not_expected_scope", revenue_program_id=self.org1_rp1.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn("scope_mismatch", response.data)
        stripe_oauth_token.assert_not_called()
        assert not task_verify_apple_domain.delay.called

    @mock.patch("apps.contributions.views.task_verify_apple_domain")
    @mock.patch("stripe.OAuth.token")
    def test_response_when_invalid_code(self, stripe_oauth_token, task_verify_apple_domain):
        stripe_oauth_token.side_effect = StripeInvalidGrantError(code="error_code", description="error_description")
        response = self._make_request(code="1234", scope=expected_oauth_scope, revenue_program_id=self.org1_rp1.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn("invalid_code", response.data)
        stripe_oauth_token.assert_called_with(code="1234", grant_type="authorization_code")
        assert not task_verify_apple_domain.delay.called

    @mock.patch("apps.contributions.views.task_verify_apple_domain")
    @mock.patch("stripe.OAuth.token")
    def test_response_success(self, stripe_oauth_token, task_verify_apple_domain):
        expected_stripe_account_id = "my_test_account_id"
        expected_refresh_token = "my_test_refresh_token"
        stripe_oauth_token.return_value = MockOAuthResponse(
            stripe_user_id=expected_stripe_account_id, refresh_token=expected_refresh_token
        )
        assert Version.objects.get_for_object(self.org1_rp1.payment_provider).count() == 0
        response = self._make_request(code="1234", scope=expected_oauth_scope, revenue_program_id=self.org1_rp1.id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "success")
        stripe_oauth_token.assert_called_with(code="1234", grant_type="authorization_code")
        # Org should have new values based on OAuth response
        self.org1_rp1.payment_provider.refresh_from_db()
        self.assertEqual(self.org1_rp1.payment_provider.stripe_account_id, expected_stripe_account_id)
        self.assertEqual(self.org1_rp1.payment_provider.stripe_oauth_refresh_token, expected_refresh_token)
        assert Version.objects.get_for_object(self.org1_rp1.payment_provider).count() == 1
        task_verify_apple_domain.delay.assert_called_with(revenue_program_slug=self.org1_rp1.slug)

    @mock.patch("apps.contributions.views.task_verify_apple_domain")
    @mock.patch("stripe.OAuth.token")
    def test_create_payment_provider_if_not_exists(self, stripe_oauth_token, task_verify_apple_domain):
        expected_stripe_account_id = "new_stripe_account_id"
        refresh_token = "my_test_refresh_token"
        stripe_oauth_token.return_value = MockOAuthResponse(
            stripe_user_id=expected_stripe_account_id, refresh_token=refresh_token
        )
        self.org1_rp2.payment_provider = None
        self._make_request(code="1234", scope=expected_oauth_scope, revenue_program_id=self.org1_rp2.id)
        self.org1_rp2.refresh_from_db()
        self.assertEqual(self.org1_rp2.payment_provider.stripe_account_id, expected_stripe_account_id)
        assert Version.objects.get_for_object(self.org1_rp1.payment_provider).count() == 1
        task_verify_apple_domain.delay.assert_called_with(revenue_program_slug=self.org1_rp2.slug)


@pytest.mark.django_db
class TestContributionsViewSet:
    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("superuser"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("hub_admin_user"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("org_user_free_plan"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("rp_user"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    @pytest.mark.parametrize(
        "method,generate_url_fn,data",
        (
            ("post", lambda contribution: reverse("contribution-list"), {}),
            ("put", lambda contribution: reverse("contribution-detail", args=(contribution.id,)), {}),
            ("patch", lambda contribution: reverse("contribution-detail", args=(contribution.id,)), {}),
            ("delete", lambda contribution: reverse("contribution-detail", args=(contribution.id,)), None),
        ),
    )
    def test_unpermitted_methods(
        self, user, expected_status, method, generate_url_fn, data, api_client, one_time_contribution, monkeypatch
    ):
        """Show that users cannot make requests to endpoint using unpermitted methods"""
        if user:
            api_client.force_authenticate(user)
        kwargs = {}
        if data:
            kwargs["data"] = {}
        assert (
            getattr(api_client, method)(generate_url_fn(one_time_contribution), **kwargs).status_code == expected_status
        )

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_retrieve_when_expected_non_contributor_user(self, user, api_client, mocker):
        """Show that expected users can retrieve only permitted organizations

        Contributor users are not handled in this test because setup is too different
        """
        spy = mocker.spy(ContributionQuerySet, "filtered_by_role_assignment")
        api_client.force_authenticate(user)
        new_rp = RevenueProgramFactory(organization=OrganizationFactory(name="new-org"), name="new rp")
        if user.is_superuser or user.roleassignment.role_type == Roles.HUB_ADMIN:
            ContributionFactory(**{"one_time": True, "donation_page__revenue_program": new_rp})
            ContributionFactory(**{"annual_subscription": True, "donation_page__revenue_program": new_rp})
            ContributionFactory(**{"monthly_subscription": True, "donation_page__revenue_program": new_rp})
            query = Contribution.objects.all()
            unpermitted = Contribution.objects.none()
        else:
            # this ensures that we'll have both owned and unowned contributions for org and rp admins
            for kwargs in [
                {"donation_page__revenue_program": new_rp},
                {"donation_page__revenue_program": user.roleassignment.revenue_programs.first()},
            ]:
                ContributionFactory(**({"one_time": True} | kwargs))
                ContributionFactory(**({"annual_subscription": True} | kwargs))
                ContributionFactory(**({"monthly_subscription": True} | kwargs))
            query = Contribution.objects.filtered_by_role_assignment(user.roleassignment)
            unpermitted = Contribution.objects.exclude(id__in=query.values_list("id", flat=True))

        assert query.count() > 0
        if user.is_superuser or user.roleassignment.role_type == Roles.HUB_ADMIN:
            assert unpermitted.count() == 0
        else:
            assert unpermitted.count() > 0
        for id in query.values_list("id", flat=True):
            response = api_client.get(reverse("contribution-detail", args=(id,)))
            assert response.status_code == status.HTTP_200_OK
            assert response.json() == json.loads(
                json.dumps(
                    ContributionSerializer(Contribution.objects.get(id=response.json()["id"])).data,
                    cls=DjangoJSONEncoder,
                )
            )
        for id in unpermitted.values_list("id", flat=True):
            response = api_client.get(reverse("contribution-detail", args=(id,)))
            assert response.status_code == status.HTTP_404_NOT_FOUND
        assert spy.call_count == 0 if user.is_superuser else Contribution.objects.count()

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("user_no_role_assignment"),
            None,
        ),
    )
    @pytest_cases.parametrize(
        "_contribution",
        (
            pytest_cases.fixture_ref("one_time_contribution"),
            pytest_cases.fixture_ref("annual_contribution"),
            pytest_cases.fixture_ref("monthly_contribution"),
        ),
    )
    def test_retrieve_when_unauthorized_user(self, user, api_client, _contribution):
        """Show behavior when an unauthorized user trise to retrieve a contribution"""
        if user:
            api_client.force_authenticate(user)
        response = api_client.get(reverse("contribution-detail", args=(_contribution.id,)))
        assert response.status_code == status.HTTP_403_FORBIDDEN if user else status.HTTP_401_UNAUTHORIZED

    @pytest_cases.parametrize(
        "user",
        (
            # pytest_cases.fixture_ref("org_user_free_plan"),
            # pytest_cases.fixture_ref("rp_user"),
            # pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_list_when_expected_non_contributor_user(self, user, api_client, mocker, revenue_program):
        """Show that expected users can list only permitted contributions

        NB: We test for contributor user elsewhere, as that requires quite different setup than other
        expected users
        """
        api_client.force_authenticate(user)
        # superuser and hub admin can retrieve all:
        if user.is_superuser or user.roleassignment.role_type == Roles.HUB_ADMIN:
            ContributionFactory.create_batch(size=2)
            query = (
                Contribution.objects.all() if user.is_superuser else Contribution.objects.having_org_viewable_status()
            )
            unpermitted = Contribution.objects.none()
            assert query.count()
        # org and rp admins should see owned and not unowned contributions
        else:
            assert revenue_program not in user.roleassignment.revenue_programs.all()
            assert user.roleassignment.revenue_programs.first() is not None
            ContributionFactory(
                one_time=True,
                donation_page=DonationPageFactory(revenue_program=user.roleassignment.revenue_programs.first()),
            )
            ContributionFactory(one_time=True, donation_page=DonationPageFactory(revenue_program=revenue_program))
            user.roleassignment.refresh_from_db()
            query = Contribution.objects.filtered_by_role_assignment(user.roleassignment)
            unpermitted = Contribution.objects.exclude(id__in=query.values_list("id", flat=True))
            assert unpermitted.count()
            assert query.count()
        spy = mocker.spy(ContributionQuerySet, "filtered_by_role_assignment")
        response = api_client.get(reverse("contribution-list"))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()["results"]) == query.count()
        assert set([x["id"] for x in response.json()["results"]]) == set(list(query.values_list("id", flat=True)))
        assert not any(
            x in unpermitted.values_list("id", flat=True) for x in [y["id"] for y in response.json()["results"]]
        )
        assert spy.call_count == 0 if user.is_superuser else 1

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_list_when_unauthorized_user(self, user, expected_status, api_client):
        """Show behavior when unauthorized user tries to list contributions"""
        if user:
            api_client.force_authenticate(user)
        assert api_client.get(reverse("contribution-list")).status_code == expected_status

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_excludes_statuses_correctly_for_expected_non_contributor_users(
        self,
        user,
        flagged_contribution,
        rejected_contribution,
        canceled_contribution,
        refunded_contribution,
        successful_contribution,
        processing_contribution,
        api_client,
    ):
        """Only superusers and hub admins should see contributions that have status of flagged or rejected"""
        seen = [
            successful_contribution,
            canceled_contribution,
            refunded_contribution,
        ]
        if user.is_superuser:
            seen.extend(
                [
                    flagged_contribution,
                    rejected_contribution,
                    processing_contribution,
                ]
            )
        if not (user.is_superuser or user.roleassignment.role_type == Roles.HUB_ADMIN):
            # ensure all contributions are owned by user so we're narrowly viewing behavior around status inclusion/exclusion
            DonationPage.objects.update(revenue_program=user.roleassignment.revenue_programs.first())
        api_client.force_authenticate(user)
        response = api_client.get(reverse("contribution-list"))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()["results"]) == len(seen)
        assert set([x["id"] for x in response.json()["results"]]) == set([x.id for x in seen])

    @pytest_cases.parametrize(
        "user", (pytest_cases.fixture_ref("superuser"), pytest_cases.fixture_ref("hub_admin_user"))
    )
    @pytest.mark.parametrize(
        "contribution_status", (ContributionStatus.FLAGGED, ContributionStatus.REJECTED, ContributionStatus.PROCESSING)
    )
    def test_filter_contributions_based_on_status(
        self,
        user,
        contribution_status,
        flagged_contribution,
        rejected_contribution,
        canceled_contribution,
        refunded_contribution,
        successful_contribution,
        processing_contribution,
        api_client,
    ):
        """Superusers and hub admins can filter out flagged and rejected contributions"""
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
            assert set([x["id"] for x in response.json()["results"]]) == set([x.id for x in expected])


@pytest.mark.django_db
class TestContributionViewSetForContributorUser:
    """Test the ContributionsViewSet's behavior when a contributor user is interacting with relevant endpoints"""

    def test_list_when_contributions_in_cache(
        self, contributor_user, mocker, api_client, revenue_program, pi_as_portal_contribution_factory
    ):
        """When there are contributions in cache, those should be returned by the request"""
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
        """When there are not contributions in the cache, background task to retrieve and cache should be called"""
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
    """Test contribution viewset functionality around triggering emailed csv exports"""

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("admin_user"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("org_user_multiple_rps"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_when_expected_user(self, user, api_client, mocker, revenue_program, settings):
        """Show expected users get back expected results in CSV"""
        settings.CELERY_ALWAYS_EAGER = True
        api_client.force_authenticate(user)
        if user.is_staff or user.roleassignment.role_type == Roles.HUB_ADMIN:
            ContributionFactory(one_time=True)
            ContributionFactory(one_time=True, flagged=True)
            ContributionFactory(one_time=True, rejected=True)
            ContributionFactory(one_time=True, canceled=True)
            ContributionFactory(one_time=True, refunded=True)
            ContributionFactory(one_time=True, processing=True)

        else:
            assert revenue_program not in user.roleassignment.revenue_programs.all()
            unowned_page = DonationPageFactory(revenue_program=revenue_program)
            owned_page = DonationPageFactory(revenue_program=user.roleassignment.revenue_programs.first())
            ContributionFactory(one_time=True, donation_page=owned_page)
            ContributionFactory(one_time=True, flagged=True, donation_page=owned_page)
            ContributionFactory(one_time=True, rejected=True, donation_page=owned_page)
            ContributionFactory(one_time=True, canceled=True, donation_page=owned_page)
            ContributionFactory(one_time=True, refunded=True, donation_page=owned_page)
            ContributionFactory(one_time=True, processing=True, donation_page=owned_page)
            ContributionFactory(one_time=True)
            ContributionFactory(one_time=True, flagged=True, donation_page=unowned_page)
            ContributionFactory(one_time=True, rejected=True, donation_page=unowned_page)
            ContributionFactory(one_time=True, canceled=True, donation_page=unowned_page)
            ContributionFactory(one_time=True, refunded=True, donation_page=unowned_page)
            ContributionFactory(one_time=True, processing=True, donation_page=unowned_page)

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

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("superuser"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_when_unauthorized_user(self, user, expected_status, api_client):
        """Show behavior when unauthorized users attempt to access"""
        if user:
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
        assert mock_sub_cache.called_once_with(email, this_rp.payment_provider.stripe_account_id)

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
        assert mock_sub_cache.called_once_with(email, revenue_program.payment_provider.stripe_account_id)
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
        mock_pi_retrieve = mocker.patch("stripe.PaymentIntent.retrieve", return_value=(mock_pi := mocker.Mock()))
        mock_update_subs_in_cache = mocker.patch(
            "apps.contributions.views.SubscriptionsViewSet.update_subscription_and_pi_in_cache"
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
        mock_pi_retrieve.assert_called_once_with(
            mock_modified_sub.latest_invoice.payment_intent,
            stripe_account=revenue_program.payment_provider.stripe_account_id,
            expand=["payment_method", "invoice.subscription.default_payment_method"],
        )
        mock_update_subs_in_cache.assert_called_once_with(
            contributor_user.email.lower(),
            revenue_program.payment_provider.stripe_account_id,
            mock_modified_sub,
            mock_pi,
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

    def test_partial_update_when_error_retrieving_payment_intent(
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
        mock_pi_retrieve = mocker.patch(
            "stripe.PaymentIntent.retrieve", side_effect=stripe.error.StripeError("ruh roh")
        )
        logger_spy = mocker.spy(contributions_views.logger, "exception")
        api_client.force_authenticate(contributor_user)
        response = api_client.patch(
            reverse("subscription-detail", args=(subscription.id,)),
            {"revenue_program_slug": revenue_program.slug, "payment_method_id": payment_method_id},
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_pi_retrieve.assert_called_once()
        logger_spy.assert_called_once_with(
            "stripe.PaymentIntent.retrieve returned a StripeError when re-retrieving pi %s after update",
            mock_modified_sub.latest_invoice.payment_intent,
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

    def test_destroy_when_error_re_retrieving_payment_intent(
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
        mock_pi_retrieve = mocker.patch(
            "stripe.PaymentIntent.retrieve", side_effect=stripe.error.StripeError("ruh roh")
        )
        logger_spy = mocker.spy(contributions_views.logger, "exception")
        api_client.force_authenticate(contributor_user)
        response = api_client.delete(
            reverse("subscription-detail", args=(subscription.id,)), data={"revenue_program_slug": revenue_program.slug}
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_pi_retrieve.assert_called_once()
        logger_spy.assert_called_once_with(
            "stripe.PaymentIntent.retrieve returned a StripeError after canceling subscription when re-retrieving PI %s",
            modified_sub.latest_invoice.payment_intent.id,
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
        modified_sub.latest_invoice.payment_intent.id = (pi_id := "pi_XXX")
        mock_sub_delete = mocker.patch("stripe.Subscription.delete")
        mock_update_sub_cache = mocker.patch(
            "apps.contributions.views.SubscriptionsViewSet.update_subscription_and_pi_in_cache"
        )
        mock_pi_retrieve = mocker.patch("stripe.PaymentIntent.retrieve", return_value=(mock_pi := mocker.Mock()))
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
        mock_pi_retrieve.assert_called_once_with(
            pi_id,
            stripe_account=revenue_program.payment_provider.stripe_account_id,
            expand=["payment_method", "invoice.subscription.default_payment_method"],
        )
        mock_update_sub_cache.assert_called_once_with(
            contributor_user.email.lower(),
            revenue_program.payment_provider.stripe_account_id,
            modified_sub,
            mock_pi,
        )


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
        (True, False, None, "hub_user", status.HTTP_200_OK),
        (True, False, None, "org_user", status.HTTP_200_OK),
        (True, False, None, "rp_user", status.HTTP_200_OK),
        (False, True, None, "superuser", status.HTTP_200_OK),
        (False, True, None, "hub_user", status.HTTP_403_FORBIDDEN),
        (False, True, None, "org_user", status.HTTP_403_FORBIDDEN),
        (False, True, None, "rp_user", status.HTTP_403_FORBIDDEN),
        (False, False, "hub_user", "hub_user", status.HTTP_200_OK),
        (False, False, "hub_user", "org_user", status.HTTP_403_FORBIDDEN),
        (False, False, "hub_user", "superuser", status.HTTP_403_FORBIDDEN),
    ],
)
@pytest.mark.django_db
def test_contributions_api_resource_feature_flagging(
    is_active_for_everyone,
    is_active_for_superusers,
    manually_added_user,
    user_under_test,
    expected_status_code,
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

    Since this test does not inherit from `RevEngineApiAbstractTestCase` or `AbstractTestCase`, in order to
    use the `set_up_domain_model` method, we instantiate an `AbstractTestCase` to call the method from, below.
    """
    test_helper = AbstractTestCase()
    test_helper.set_up_domain_model()
    flag_model = get_waffle_flag_model()
    contributions_access_flag = flag_model.objects.get(name=CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME)
    contributions_access_flag.everyone = is_active_for_everyone
    contributions_access_flag.superusers = is_active_for_superusers
    if manually_added_user:
        contributions_access_flag.users.add(getattr(test_helper, manually_added_user))
    contributions_access_flag.save()
    client = APIClient()
    client.force_authenticate(getattr(test_helper, user_under_test))
    response = client.get(reverse("contribution-list"))
    assert response.status_code == expected_status_code


@pytest.mark.django_db
def test_feature_flagging_when_flag_not_found():
    """Should raise ApiConfigurationError if view is accessed and flag can't be found

    See docstring in `test_contributions_api_resource_feature_flagging` above for more context on the
    design of this test.
    """
    test_helper = AbstractTestCase()
    test_helper.set_up_domain_model()
    flag_model = get_waffle_flag_model()
    contributions_access_flag = flag_model.objects.get(name=CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME)
    contributions_access_flag.delete()
    client = APIClient()
    client.force_authenticate(getattr(test_helper, "superuser"))
    response = client.get(reverse("contribution-list"))
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert response.json().get("detail", None) == "There was a problem with the API"


@mock.patch("apps.contributions.models.Contribution.process_flagged_payment")
class ProcessFlaggedContributionTest(APITestCase):
    def setUp(self):
        self.user = create_test_user(role_assignment_data={"role_type": Roles.HUB_ADMIN})
        self.subscription_id = "test-subscription-id"
        self.stripe_account_id = "testing-stripe-account-id"
        self.org = OrganizationFactory()

        self.contributor = ContributorFactory()

        payment_provider = PaymentProviderFactory(stripe_account_id=self.stripe_account_id)
        revenue_program = RevenueProgramFactory(organization=self.org, payment_provider=payment_provider)
        # TODO: DEV-3026
        with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            self.contribution = ContributionFactory(
                contributor=self.contributor,
                donation_page=DonationPageFactory(revenue_program=revenue_program),
                provider_subscription_id=self.subscription_id,
            )
            self.other_contribution = ContributionFactory()

    def _make_request(self, contribution_pk=None, request_args={}):
        url = reverse("contribution-process-flagged", args=[contribution_pk])
        self.client.force_authenticate(user=self.user)
        return self.client.post(url, request_args)

    def test_response_when_missing_required_param(self, mock_process_flagged):
        response = self._make_request(contribution_pk=self.contribution.pk)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Missing required data")
        mock_process_flagged.assert_not_called()

    def test_response_when_no_such_contribution(self, mock_process_flagged):
        nonexistent_pk = 10000001
        # First, let's make sure there isn't a contributoin with this pk.
        self.assertIsNone(Contribution.objects.filter(pk=nonexistent_pk).first())
        response = self._make_request(contribution_pk=nonexistent_pk, request_args={"reject": True})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "Could not find contribution")
        mock_process_flagged.assert_not_called()

    def test_response_when_payment_provider_error(self, mock_process_flagged):
        error_message = "my error message"
        mock_process_flagged.side_effect = PaymentProviderError(error_message)
        response = self._make_request(contribution_pk=self.contribution.pk, request_args={"reject": True})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["detail"], error_message)

    def test_response_when_successful_reject(self, mock_process_flagged):
        response = self._make_request(contribution_pk=self.contribution.pk, request_args={"reject": True})
        self.assertEqual(response.status_code, 200)
        mock_process_flagged.assert_called_with(reject="True")

        # assert about revision and update fields

    def test_response_when_successful_accept(self, mock_process_flagged):
        response = self._make_request(contribution_pk=self.contribution.pk, request_args={"reject": False})
        self.assertEqual(response.status_code, 200)
        mock_process_flagged.assert_called_with(reject="False")
        # assert about revision and update fields


@pytest.fixture
def valid_data(donation_page):
    return {
        "donor_selected_amount": 123.01,
        "amount": 120.0,
        "agreed_to_Pay_fees": True,
        "interval": "one_time",
        "first_name": "Bill",
        "last_name": "Smith",
        "email": "bill@smith.com",
        "phone": "123",
        "mailing_street": "123 Glenwood Avenue",
        "mailing_complement": "Ap 1",
        "mailing_city": "Raleigh",
        "mailing_state": "North Carolina",
        "mailing_postal_code": "27603",
        "mailing_country": "United States",
        "reason_for_giving": "Other",
        "reason_other": "None of ya...",
        "tribute_type": "",
        "page": donation_page.id,
        "captcha_token": "HFbTRmfk1CPXUxMwRTQx5CQlV",
    }


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
        "interval,subscription_id",
        (
            (ContributionInterval.ONE_TIME, None),
            (
                ContributionInterval.MONTHLY,
                SUBSCRIPTION_ID,
            ),
            (
                ContributionInterval.YEARLY,
                SUBSCRIPTION_ID,
            ),
        ),
    )
    def test_create_happy_path(
        self,
        valid_data,
        monkeypatch,
        stripe_create_subscription_response,
        stripe_create_payment_intent_response,
        stripe_create_customer_response,
        interval,
        subscription_id,
        mocker,
    ):
        """Minimal test of the happy path

        Note that this test is kept intentionally thin because the serializers used for this view
        are extensively tested elsewhere.
        """
        mock_create_customer = mock.Mock()
        mock_create_customer.return_value = AttrDict(stripe_create_customer_response)
        monkeypatch.setattr("stripe.Customer.create", mock_create_customer)
        mock_create_subscription = mock.Mock()
        mock_create_subscription.return_value = AttrDict(stripe_create_subscription_response)
        monkeypatch.setattr("stripe.Subscription.create", mock_create_subscription)
        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        mock_create_payment_intent = mock.Mock()
        mock_create_payment_intent.return_value = AttrDict(stripe_create_payment_intent_response)
        monkeypatch.setattr("stripe.PaymentIntent.create", mock_create_payment_intent)

        contributor_count = Contributor.objects.count()
        contribution_count = Contribution.objects.count()
        data = valid_data | {"interval": interval}
        url = reverse("payment-list")

        save_spy = mocker.spy(Contribution, "save")
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert set(["email_hash", "client_secret", "uuid"]) == set(response.json().keys())
        assert Contributor.objects.count() == contributor_count + 1
        assert Contribution.objects.count() == contribution_count + 1
        contribution = Contribution.objects.get(uuid=response.json()["uuid"])
        assert contribution.interval == interval
        assert contribution.provider_subscription_id == subscription_id
        assert contribution.amount == int(data["amount"] * 100)
        save_spy.assert_called_once()

    def test_when_called_with_unexpected_interval(self, valid_data):
        invalid_interval = "this-is-not-legit"
        assert invalid_interval not in ContributionInterval.choices
        data = valid_data | {"interval": invalid_interval}
        url = reverse("payment-list")
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"interval": "The provided value for interval is not permitted"}

    def test_when_no_csrf(self):
        """Show that view is inaccessible if no CSRF token is included in request.

        NB: DRF's APIClient disables CSRF protection by default, so here we have to explicitly
        configure the client to enforce CSRF checks.
        """
        client = APIClient(enforce_csrf_checks=True)
        url = reverse("payment-list")
        response = client.post(url, {})
        assert response.status_code == status.HTTP_403_FORBIDDEN
        # TODO - figure out how to do csrf protection but return JSON when no token

    @pytest.mark.parametrize(
        "interval,payment_intent_id,subscription_id",
        (
            (ContributionInterval.ONE_TIME, PI_ID, None),
            (ContributionInterval.MONTHLY, None, SUBSCRIPTION_ID),
            (ContributionInterval.YEARLY, None, SUBSCRIPTION_ID),
        ),
    )
    def test_destroy_happy_path(
        self,
        interval,
        payment_intent_id,
        subscription_id,
        monkeypatch,
    ):
        contribution = ContributionFactory(
            interval=interval,
            provider_payment_id=payment_intent_id,
            provider_subscription_id=subscription_id,
            status=ContributionStatus.PROCESSING,
        )
        url = reverse("payment-detail", kwargs={"uuid": str(contribution.uuid)})

        mock_cancel = mock.Mock()
        monkeypatch.setattr("apps.contributions.models.Contribution.cancel", mock_cancel)
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        contribution.refresh_from_db()
        mock_cancel.assert_called_once()

        # test revision and update fields

    @pytest.mark.parametrize(
        "contribution_status",
        (
            ContributionStatus.PAID,
            ContributionStatus.CANCELED,
            ContributionStatus.FAILED,
            ContributionStatus.REJECTED,
            ContributionStatus.REFUNDED,
        ),
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
        "contribution_type,contribution_status",
        (
            ("one_time", ContributionStatus.PROCESSING),
            ("monthly_subscription", ContributionStatus.FLAGGED),
            ("one_time", ContributionStatus.PROCESSING),
            ("monthly_subscription", ContributionStatus.FLAGGED),
        ),
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


@pytest.fixture()
def payment_method_attached_request_data():
    with open("apps/contributions/tests/fixtures/payment-method-attached-webhook.json") as fl:
        return json.load(fl)


@pytest.mark.django_db
class TestStripeWebhooksView:
    def test_payment_method_attached_happy_path(self, client, monkeypatch, payment_method_attached_request_data):
        monkeypatch.setattr(
            stripe.Webhook, "construct_event", lambda *args, **kwargs: AttrDict(payment_method_attached_request_data)
        )
        monkeypatch.setattr(
            Contribution,
            "fetch_stripe_payment_method",
            lambda *args, **kwargs: payment_method_attached_request_data,
        )
        contribution = ContributionFactory(
            status=ContributionStatus.PROCESSING,
            interval=ContributionInterval.MONTHLY,
            provider_customer_id=payment_method_attached_request_data["data"]["object"]["customer"],
            provider_payment_method_id=None,
        )
        header = {"HTTP_STRIPE_SIGNATURE": "testing"}
        response = client.post(reverse("stripe-webhooks-contributions"), payment_method_attached_request_data, **header)
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        assert contribution.provider_payment_method_id == payment_method_attached_request_data["data"]["object"]["id"]

    def test_payment_method_attached_when_contribution_not_found(
        self, client, monkeypatch, payment_method_attached_request_data
    ):
        count = Contribution.objects.count()
        assert not Contribution.objects.filter(
            provider_customer_id=payment_method_attached_request_data["data"]["object"]["customer"]
        )
        monkeypatch.setattr(
            stripe.Webhook, "construct_event", lambda *args, **kwargs: AttrDict(payment_method_attached_request_data)
        )
        header = {"HTTP_STRIPE_SIGNATURE": "testing"}
        response = client.post(reverse("stripe-webhooks-contributions"), payment_method_attached_request_data, **header)
        assert response.status_code == status.HTTP_200_OK
        assert Contribution.objects.count() == count
