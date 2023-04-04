import json
from csv import DictReader
from unittest import mock

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.test import override_settings

import pytest
import pytest_cases
import stripe
from addict import Dict as AttrDict
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APIClient, APITestCase
from reversion.models import Version
from stripe.error import StripeError
from stripe.oauth_error import InvalidGrantError as StripeInvalidGrantError
from stripe.stripe_object import StripeObject
from waffle import get_waffle_flag_model

from apps.common.constants import CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME
from apps.common.tests.test_resources import AbstractTestCase
from apps.contributions import tasks
from apps.contributions import views as contributions_views
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionQuerySet,
    ContributionStatus,
    Contributor,
)
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.serializers import (
    ContributionSerializer,
    PaymentProviderContributionSerializer,
)
from apps.contributions.tasks import task_pull_serialized_stripe_contributions_to_cache
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
    StripeSubscriptionFactory,
)
from apps.contributions.tests.test_serializers import (
    mock_get_bad_actor,
    mock_stripe_call_with_error,
)
from apps.emails.tasks import send_templated_email_with_attachment
from apps.organizations.tests.factories import (
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
    StripePaymentIntentFactory,
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


@pytest.fixture
def flagged_contribution():
    with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        return ContributionFactory(one_time=True, flagged=True)


@pytest.fixture
def rejected_contribution():
    with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        return ContributionFactory(monthly_subscription=True, rejected=True)


@pytest.fixture
def canceled_contribution():
    with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        return ContributionFactory(monthly_subscription=True, canceled=True)


@pytest.fixture
def refunded_contribution():
    with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        return ContributionFactory(one_time=True, refunded=True)


@pytest.fixture
def successful_contribution():
    with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        return ContributionFactory(one_time=True)


@pytest.fixture
def processing_contribution():
    with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        return ContributionFactory(processing=True)


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

    @mock.patch("stripe.OAuth.token")
    def test_response_when_missing_params(self, stripe_oauth_token):
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

    @mock.patch("stripe.OAuth.token")
    def test_response_when_scope_param_mismatch(self, stripe_oauth_token):
        """
        We verify that the "scope" parameter provided by the frontend matches the scope we expect
        """
        response = self._make_request(code="1234", scope="not_expected_scope", revenue_program_id=self.org1_rp1.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn("scope_mismatch", response.data)
        stripe_oauth_token.assert_not_called()

    @mock.patch("stripe.OAuth.token")
    def test_response_when_invalid_code(self, stripe_oauth_token):
        stripe_oauth_token.side_effect = StripeInvalidGrantError(code="error_code", description="error_description")
        response = self._make_request(code="1234", scope=expected_oauth_scope, revenue_program_id=self.org1_rp1.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn("invalid_code", response.data)
        stripe_oauth_token.assert_called_with(code="1234", grant_type="authorization_code")

    @mock.patch("stripe.OAuth.token")
    def test_response_success(self, stripe_oauth_token):
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

    @mock.patch("stripe.OAuth.token")
    def test_create_payment_provider_if_not_exists(self, stripe_oauth_token):
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
            with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
                ContributionFactory(**{"one_time": True, "donation_page__revenue_program": new_rp})
                ContributionFactory(**{"annual_subscription": True, "donation_page__revenue_program": new_rp})
                ContributionFactory(**{"monthly_subscription": True, "donation_page__revenue_program": new_rp})
            query = Contribution.objects.all()
            unpermitted = Contribution.objects.none()
        else:
            with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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
            with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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
            with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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
            processing_contribution,
        ]
        if user.is_superuser:
            seen.extend([flagged_contribution, rejected_contribution])
        if not (user.is_superuser or user.roleassignment.role_type == Roles.HUB_ADMIN):
            # ensure all contributions are owned by user so we're narrowly viewing behavior around status inclusion/exclusion
            # with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            DonationPage.objects.update(revenue_program=user.roleassignment.revenue_programs.first())
        api_client.force_authenticate(user)
        response = api_client.get(reverse("contribution-list"))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()["results"]) == len(seen)
        assert set([x["id"] for x in response.json()["results"]]) == set([x.id for x in seen])

    @pytest_cases.parametrize(
        "user", (pytest_cases.fixture_ref("superuser"), pytest_cases.fixture_ref("hub_admin_user"))
    )
    def test_filters_out_flagged_and_rejected_contributions(
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
        """Superusers and hub admins can filter out flagged and rejected contributions"""
        api_client.force_authenticate(user)
        qp = "&".join(
            [f"status__not={i}" for i in [ContributionStatus.FLAGGED.value, ContributionStatus.REJECTED.value]]
        )
        expected = [refunded_contribution, canceled_contribution, successful_contribution, processing_contribution]
        unexpected = [flagged_contribution, rejected_contribution]
        assert Contribution.objects.count() == len(expected) + len(unexpected)
        response = api_client.get(f"{reverse('contribution-list')}?{qp}")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()["results"]) == len(expected)
        assert set([x["id"] for x in response.json()["results"]]) == set([x.id for x in expected])


@pytest.mark.django_db
class TestContributionViewSetForContributorUser:
    """Test the ContributionsViewSet's behavior when a contributor user is interacting with relevant endpoints"""

    def test_list_when_contributions_in_cache(
        self,
        contributor_user,
        monkeypatch,
        mocker,
        api_client,
        revenue_program,
    ):
        """When there are contributions in cache, those should be returned by the request"""
        contributions = [
            (seen := StripePaymentIntentFactory(revenue_program=revenue_program.slug)),
            StripePaymentIntentFactory(payment_type=None, revenue_program=revenue_program.slug),
        ]
        stripe_contributions = [PaymentProviderContributionSerializer(instance=i).data for i in contributions]
        monkeypatch.setattr(
            "apps.contributions.stripe_contributions_provider.ContributionsCacheProvider.load",
            lambda *args, **kwargs: stripe_contributions,
        )
        spy = mocker.spy(task_pull_serialized_stripe_contributions_to_cache, "delay")
        api_client.force_authenticate(contributor_user)
        response = api_client.get(reverse("contribution-list"), {"rp": revenue_program.slug})
        assert response.status_code == status.HTTP_200_OK
        assert spy.call_count == 0
        assert response.json()["count"] == 1
        assert response.json()["results"][0]["id"] == seen.id

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
    def test_when_expected_user(self, user, api_client, mocker, revenue_program):
        """Show expected users get back expected results in CSV"""
        api_client.force_authenticate(user)
        if user.is_staff or user.roleassignment.role_type == Roles.HUB_ADMIN:
            with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
                ContributionFactory(one_time=True)
                ContributionFactory(one_time=True, flagged=True)
                ContributionFactory(one_time=True, rejected=True)
                ContributionFactory(one_time=True, canceled=True)
                ContributionFactory(one_time=True, refunded=True)
                ContributionFactory(one_time=True, processing=True)

        else:
            with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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
        email_task_spy = mocker.spy(send_templated_email_with_attachment, "delay")
        response = api_client.post(reverse("contribution-email-contributions"))
        assert response.status_code == status.HTTP_200_OK
        assert filter_spy.call_count == 0 if user.is_staff else 1
        assert email_task_spy.call_count == 1
        assert email_task_spy.call_args_list[0][1]["to"] == user.email
        contributions_from_email_view = [
            row for row in DictReader(email_task_spy.call_args_list[0][1]["attachment"].splitlines())
        ]
        assert len(contributions_from_email_view) == expected.count()
        assert set(int(x["Contribution ID"]) for x in contributions_from_email_view) == set(
            x for x in expected.values_list("id", flat=True)
        )

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


@pytest.mark.django_db
class TestSubscriptionViewSet:
    def test_contributor_list_when_subscriptions_in_cache(
        self, api_client, contributor_user, revenue_program, monkeypatch, mocker
    ):
        monkeypatch.setattr(
            "apps.contributions.stripe_contributions_provider.SubscriptionsCacheProvider.load",
            lambda *args, **kwargs: [
                {"revenue_program_slug": revenue_program.slug, "id": 1},
                {"revenue_program_slug": revenue_program.slug, "id": 2},
                {"revenue_program_slug": RevenueProgramFactory().slug, "id": 3},
            ],
        )
        spy = mocker.spy(tasks, "task_pull_serialized_stripe_contributions_to_cache")
        api_client.force_authenticate(contributor_user)
        response = api_client.get(reverse("subscription-list"), {"revenue_program_slug": revenue_program.slug})
        assert response.status_code == status.HTTP_200_OK
        assert spy.call_count == 0
        # one for each the mocked items where `revenue_program_slug`'s value is `revenue_program.slug`
        assert len(response.json()) == 2
        assert set([x["id"] for x in response.json()]) == set([1, 2])

    def test_contributor_list_when_subscription_not_in_cache(
        self, monkeypatch, mocker, api_client, contributor_user, revenue_program
    ):
        monkeypatch.setattr(
            "apps.contributions.stripe_contributions_provider.SubscriptionsCacheProvider.load",
            lambda *args, **kwargs: [],
        )
        monkeypatch.setattr(
            "apps.contributions.views.task_pull_serialized_stripe_contributions_to_cache", lambda *args, **kwargs: None
        )
        spy = mocker.spy(contributions_views, "task_pull_serialized_stripe_contributions_to_cache")
        api_client.force_authenticate(contributor_user)
        response = api_client.get(reverse("subscription-list"), {"revenue_program_slug": revenue_program.slug})
        assert response.status_code == status.HTTP_200_OK
        assert spy.call_count == 1
        assert len(response.json()) == 0

    def test_retrieve_when_subscription_not_in_cache(
        self, monkeypatch, mocker, api_client, contributor_user, revenue_program
    ):
        """Show behavior when attempt to retrieve a subscription that's not in cache

        TODO: [DEV-3227] Here...
        """
        monkeypatch.setattr(
            "apps.contributions.stripe_contributions_provider.SubscriptionsCacheProvider.load",
            lambda *args, **kwargs: [],
        )
        monkeypatch.setattr(
            "apps.contributions.views.task_pull_serialized_stripe_contributions_to_cache",
            lambda *args, **kwargs: None,
        )
        spy = mocker.spy(contributions_views, "task_pull_serialized_stripe_contributions_to_cache")
        api_client.force_authenticate(contributor_user)
        response = api_client.get(
            reverse("subscription-detail", args=(1,)), {"revenue_program_slug": revenue_program.slug}
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert spy.call_count == 1

    def test_retrieve_when_subscription_in_cache(
        self, api_client, contributor_user, revenue_program, monkeypatch, mocker
    ):
        """ """
        monkeypatch.setattr(
            "apps.contributions.stripe_contributions_provider.SubscriptionsCacheProvider.load",
            lambda *args, **kwargs: [
                {"revenue_program_slug": revenue_program.slug, "id": str(revenue_program.id)},
            ],
        )
        spy = mocker.spy(tasks, "task_pull_serialized_stripe_contributions_to_cache")
        api_client.force_authenticate(contributor_user)
        response = api_client.get(
            reverse("subscription-detail", args=(revenue_program.id,)),
            {"revenue_program_slug": revenue_program.slug},
        )
        assert response.status_code == status.HTTP_200_OK
        assert spy.call_count == 0
        assert response.json()["id"] == str(revenue_program.id)


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


TEST_STRIPE_API_KEY = "test_stripe_api_key"


@override_settings(STRIPE_TEST_SECRET_KEY=TEST_STRIPE_API_KEY)
class UpdatePaymentMethodTest(APITestCase):
    def setUp(self):
        self.subscription_id = "test-subscription-id"
        self.stripe_account_id = "testing-stripe-account-id"
        self.customer_id = "testing-customer-id"
        self.org = OrganizationFactory()
        self.contributor = ContributorFactory()
        self.subscription = StripeSubscriptionFactory()

        payment_provider = PaymentProviderFactory(stripe_account_id=self.stripe_account_id)
        self.revenue_program = RevenueProgramFactory(organization=self.org, payment_provider=payment_provider)
        self.payment_method_id = "testing-payment-method-id"
        self.contributor.email = self.subscription.customer.email = "foo@bar.baz"

    def _make_request(self, subscription_id, data):
        self.client.force_authenticate(user=self.contributor)
        return self.client.patch(reverse("subscription-detail", kwargs={"pk": subscription_id}), data=data)

    @mock.patch("stripe.PaymentMethod.attach")
    @mock.patch("stripe.Subscription.modify")
    def test_failure_when_missing_payment_method_id(self, mock_modify, mock_attach):
        response = self._make_request(self.subscription_id, data={"foo": "bar"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Request contains unsupported fields")
        mock_modify.assert_not_called()
        mock_attach.assert_not_called()

    @mock.patch("stripe.Subscription.retrieve")
    @mock.patch("stripe.PaymentMethod.attach")
    @mock.patch("stripe.Subscription.modify")
    def test_failure_when_any_parameter_other_than_pm_id(self, mock_modify, mock_attach, mock_retrieve):
        response = self._make_request(
            subscription_id=self.subscription_id,
            data={
                "test_unknown_parameter": self.payment_method_id,
                "revenue_program_slug": self.revenue_program.slug,
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Request contains unsupported fields")
        mock_modify.assert_not_called()
        mock_attach.assert_not_called()

    @mock.patch("stripe.Subscription.retrieve")
    @mock.patch("stripe.PaymentMethod.attach")
    @mock.patch("stripe.Subscription.modify")
    def test_failure_when_emails_dont_match(self, mock_modify, mock_attach, mock_retrieve):
        self.contributor.email = "quux@baz.foo"
        response = self._make_request(
            subscription_id=self.subscription_id,
            data={
                "payment_method_id": self.payment_method_id,
                "revenue_program_slug": self.revenue_program.slug,
            },
        )
        assert response.status_code == 403
        assert response.data["detail"] == "Forbidden"
        assert not mock_modify.called
        assert not mock_attach.called

    @mock.patch("stripe.Subscription.retrieve")
    @mock.patch("stripe.PaymentMethod.attach", side_effect=StripeError)
    @mock.patch("stripe.Subscription.modify")
    def test_error_when_attach_payment_method(self, mock_modify, mock_attach, mock_retrieve):
        mock_retrieve.return_value = self.subscription
        response = self._make_request(
            subscription_id=self.subscription_id,
            data={
                "payment_method_id": self.payment_method_id,
                "revenue_program_slug": self.revenue_program.slug,
            },
        )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["detail"], "Error attaching payment method")

        mock_attach.assert_called_once_with(
            self.payment_method_id,
            customer=self.subscription.customer.id,
            stripe_account=self.stripe_account_id,
        )
        mock_modify.assert_not_called()

    @mock.patch("stripe.Subscription.retrieve")
    @mock.patch("stripe.PaymentMethod.attach")
    @mock.patch("stripe.Subscription.modify", side_effect=StripeError)
    def test_error_when_update_payment_method(self, mock_modify, mock_attach, mock_retrieve):
        mock_retrieve.return_value = self.subscription
        response = self._make_request(
            subscription_id=self.subscription_id,
            data={
                "payment_method_id": self.payment_method_id,
                "revenue_program_slug": self.revenue_program.slug,
            },
        )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["detail"], "Error updating Subscription")

        mock_attach.assert_called_once_with(
            self.payment_method_id,
            customer=self.subscription.customer.id,
            stripe_account=self.stripe_account_id,
        )

        mock_modify.assert_called_once_with(
            self.subscription_id,
            default_payment_method=self.payment_method_id,
            stripe_account=self.stripe_account_id,
        )

    @mock.patch("stripe.Subscription.retrieve")
    @mock.patch("stripe.PaymentMethod.attach")
    @mock.patch("stripe.Subscription.modify")
    def test_update_payment_method_success(self, mock_modify, mock_attach, mock_retrieve):
        mock_retrieve.return_value = self.subscription
        response = self._make_request(
            subscription_id=self.subscription_id,
            data={
                "payment_method_id": self.payment_method_id,
                "revenue_program_slug": self.revenue_program.slug,
            },
        )
        assert response.status_code == 204
        assert response.data["detail"] == "Success"

        mock_attach.assert_called_once_with(
            self.payment_method_id,
            customer=self.subscription.customer.id,
            stripe_account=self.stripe_account_id,
        )

        mock_modify.assert_called_once_with(
            self.subscription_id,
            default_payment_method=self.payment_method_id,
            stripe_account=self.stripe_account_id,
        )


@override_settings(STRIPE_TEST_SECRET_KEY=TEST_STRIPE_API_KEY)
class CancelRecurringPaymentTest(APITestCase):
    def setUp(self):
        self.subscription_id = "test-subscription-id"
        self.stripe_account_id = "testing-stripe-account-id"
        self.org = OrganizationFactory()
        self.revenue_program = RevenueProgramFactory(organization=self.org)
        self.payment_method_id = "testing-payment-method-id"
        self.subscription = StripeSubscriptionFactory()
        self.contributor = ContributorFactory()
        self.contributor.email = self.subscription.customer.email = "foo@bar.baz"

    def _make_request(self, subscription_id, revenue_program_slug):
        self.client.force_authenticate(user=self.contributor)
        return self.client.delete(
            reverse("subscription-detail", kwargs={"pk": subscription_id}),
            data={"revenue_program_slug": revenue_program_slug},
        )

    @mock.patch("stripe.Subscription.delete", side_effect=StripeError)
    @mock.patch("stripe.Subscription.retrieve")
    def test_error_when_subscription_delete(self, mock_retrieve, mock_delete):
        mock_retrieve.return_value = self.subscription
        response = self._make_request(self.subscription_id, self.revenue_program.slug)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["detail"], "Error")

    @mock.patch("stripe.Subscription.delete")
    @mock.patch("stripe.Subscription.retrieve")
    def test_delete_recurring_success(self, mock_retrieve, mock_delete):
        mock_retrieve.return_value = self.subscription
        response = self._make_request(self.subscription.id, self.revenue_program.slug)
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.data["detail"], "Success")

    @mock.patch("stripe.Subscription.retrieve")
    def test_delete_recurring_wrong_email(self, mock_retrieve):
        self.contributor.email = "wrong@email.com"
        response = self._make_request(self.subscription.id, self.revenue_program.slug)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["detail"], "Forbidden")
        mock_retrieve.assert_called_once()


@override_settings(STRIPE_TEST_SECRET_KEY=TEST_STRIPE_API_KEY)
class DeleteSubscriptionsTest(APITestCase):
    def setUp(self):
        self.stripe_account_id = "testing-stripe-account-id"
        self.org = OrganizationFactory()
        self.revenue_program = RevenueProgramFactory(organization=self.org)
        self.subscription_1 = StripeSubscriptionFactory()
        self.subscription_2 = StripeSubscriptionFactory()
        self.contributor = ContributorFactory()
        self.contributor.email = self.subscription_1.customer.email = "foo@bar.baz"

    def _make_request(self, subscription_id, revenue_program_slug):
        self.client.force_authenticate(user=self.contributor)
        return self.client.delete(
            reverse("subscription-detail", kwargs={"pk": subscription_id}),
            data={"revenue_program_slug": revenue_program_slug},
        )

    @mock.patch("stripe.Subscription.delete", side_effect=StripeError)
    @mock.patch("stripe.Subscription.retrieve")
    def test_error_when_subscription_delete(self, mock_retrieve, mock_delete):
        mock_retrieve.return_value = self.subscription_1
        response = self._make_request(self.subscription_1.id, self.revenue_program.slug)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["detail"], "Error")

    @mock.patch("stripe.Subscription.delete")
    @mock.patch("stripe.Subscription.retrieve")
    def test_delete_recurring_success(self, mock_retrieve, mock_delete):
        mock_retrieve.return_value = self.subscription_1
        response = self._make_request(self.subscription_1.id, self.revenue_program.slug)
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.data["detail"], "Success")

    @mock.patch("stripe.Subscription.retrieve")
    def test_delete_recurring_wrong_email(self, mock_retrieve):
        self.contributor.email = "wrong@email.com"
        response = self._make_request(self.subscription_1.id, self.revenue_program.slug)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["detail"], "Forbidden")
        mock_retrieve.assert_called_once()


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

    def test_response_when_successful_accept(self, mock_process_flagged):
        response = self._make_request(contribution_pk=self.contribution.pk, request_args={"reject": False})
        self.assertEqual(response.status_code, 200)
        mock_process_flagged.assert_called_with(reject="False")


@pytest.mark.django_db()
@pytest.fixture
def donation_page():
    return DonationPageFactory()


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
    ):
        """Minimal test of the happy path

        Note that this test is kept intentionally thin because the serializers used for this view
        are extensively tested elsewhere.
        """
        mock_create_customer = mock.Mock()
        mock_create_customer.return_value = stripe_create_customer_response
        monkeypatch.setattr("stripe.Customer.create", mock_create_customer)
        mock_create_subscription = mock.Mock()
        mock_create_subscription.return_value = stripe_create_subscription_response
        monkeypatch.setattr("stripe.Subscription.create", mock_create_subscription)
        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        mock_create_payment_intent = mock.Mock()
        mock_create_payment_intent.return_value = stripe_create_payment_intent_response
        monkeypatch.setattr("stripe.PaymentIntent.create", mock_create_payment_intent)

        contributor_count = Contributor.objects.count()
        contribution_count = Contribution.objects.count()
        data = valid_data | {"interval": interval}
        url = reverse("payment-list")
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert set(["email_hash", "client_secret", "uuid"]) == set(response.json().keys())
        assert Contributor.objects.count() == contributor_count + 1
        assert Contribution.objects.count() == contribution_count + 1
        contribution = Contribution.objects.get(uuid=response.json()["uuid"])
        assert contribution.interval == interval
        assert contribution.provider_subscription_id == subscription_id
        assert contribution.amount == int(data["amount"] * 100)

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
    @mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None)
    def test_destroy_happy_path(
        self,
        mock_fetch_stripe_payment_method,
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
        with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=False):
            contribution = ContributionFactory(status=contribution_status, one_time=True)
        url = reverse("payment-detail", kwargs={"uuid": str(contribution.uuid)})
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_409_CONFLICT

    def test_destroy_when_contribution_interval_unexpected(self):
        interval = "foo"
        assert interval not in ContributionInterval.choices
        with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=False):
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
        with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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
        response = client.post(reverse("stripe-webhooks"), payment_method_attached_request_data, **header)
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
        response = client.post(reverse("stripe-webhooks"), payment_method_attached_request_data, **header)
        assert response.status_code == status.HTTP_200_OK
        assert Contribution.objects.count() == count
