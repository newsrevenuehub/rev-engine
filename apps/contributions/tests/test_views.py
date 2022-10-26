from unittest import mock

from django.conf import settings
from django.middleware import csrf
from django.test import override_settings

import pytest
from addict import Dict as AttrDict
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APIClient, APITestCase
from stripe.error import StripeError
from stripe.oauth_error import InvalidGrantError as StripeInvalidGrantError
from stripe.stripe_object import StripeObject
from waffle import get_waffle_flag_model

from apps.api.tests import RevEngineApiAbstractTestCase
from apps.api.tokens import ContributorRefreshToken
from apps.common.constants import CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME
from apps.common.tests.test_resources import AbstractTestCase
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
)
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.serializers import (
    PaymentProviderContributionSerializer,
    SubscriptionsSerializer,
)
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
    StripeSubscriptionFactory,
)
from apps.contributions.tests.test_serializers import mock_get_bad_actor
from apps.organizations.models import RevenueProgram
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
        response = self._make_request(code="1234", scope=expected_oauth_scope, revenue_program_id=self.org1_rp1.id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "success")
        stripe_oauth_token.assert_called_with(code="1234", grant_type="authorization_code")
        # Org should have new values based on OAuth response
        self.org1_rp1.payment_provider.refresh_from_db()
        self.assertEqual(self.org1_rp1.payment_provider.stripe_account_id, expected_stripe_account_id)
        self.assertEqual(self.org1_rp1.payment_provider.stripe_oauth_refresh_token, expected_refresh_token)

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


class MockStripeAccountEnabled(MockStripeAccount):
    def __init__(self, *args, **kwargs):
        self.charges_enabled = True


class MockStripeAccountNotEnabled(MockStripeAccount):
    def __init__(self, *args, **kwargs):
        self.charges_enabled = False


TEST_STRIPE_PRODUCT_ID = "my_test_product_id"


class MockStripeProduct(StripeObject):
    def __init__(self, *args, **kwargs):
        self.id = TEST_STRIPE_PRODUCT_ID


@mock.patch("stripe.Product.create", side_effect=MockStripeProduct)
class StripeConfirmTest(AbstractTestCase):
    def setUp(self):
        super().setUp()
        self.set_up_domain_model()
        self.url = f'{reverse("stripe-confirmation")}?{settings.ORG_SLUG_PARAM}={self.org1.slug}'

    def post_to_confirmation(
        self, stripe_account_id="", stripe_verified=None, stripe_product_id="", revenue_program_id=0
    ):
        self.payment_provider1.stripe_account_id = stripe_account_id
        self.payment_provider1.stripe_verified = True if stripe_verified else False
        self.payment_provider1.stripe_product_id = stripe_product_id
        self.payment_provider1.save()
        self.payment_provider1.refresh_from_db()
        self.client.force_authenticate(user=self.org_user)
        return self.client.post(self.url, data={"revenue_program_id": revenue_program_id})

    @mock.patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_confirm_already_verified(self, mock_account_retrieve, *args):
        """
        stripe_confirmation should return early if the org already has stripe_verified=True.
        """

        response = self.post_to_confirmation(
            stripe_verified=True,
            stripe_account_id="testing",
            stripe_product_id="test_product_id",
            revenue_program_id=self.org1_rp1.id,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "connected")
        # this should bail early, before Account.retrieve is called
        mock_account_retrieve.assert_not_called()

    @mock.patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_confirm_newly_verified(self, mock_account_retrieve, *args):
        """
        stripe_confirmation should set stripe_verified to True after confirming with Stripe.
        """
        self.payment_provider1.stripe_verified = False
        self.payment_provider1.save()
        response = self.post_to_confirmation(stripe_account_id="testing", revenue_program_id=self.org1_rp1.id)
        self.payment_provider1.refresh_from_db()
        self.assertTrue(self.payment_provider1.stripe_verified)
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "connected")

    @mock.patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_confirm_stripe_error_response(self, mock_account_retrieve, mock_product_create):
        mock_product_create.side_effect = StripeError
        response = self.post_to_confirmation(stripe_account_id="testing", revenue_program_id=self.org1_rp1.id)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["status"], "failed")

    @mock.patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_product_create_called_when_newly_verified(self, mock_account_retrieve, mock_product_create):
        self.post_to_confirmation(stripe_account_id="testing", revenue_program_id=self.org1_rp1.id)
        mock_account_retrieve.assert_called_once()
        # Newly confirmed accounts should go ahead and create a default product on for that org.
        mock_product_create.assert_called_once()
        self.payment_provider1.refresh_from_db()
        self.assertEqual(self.payment_provider1.stripe_product_id, TEST_STRIPE_PRODUCT_ID)

    @mock.patch("stripe.Account.retrieve", side_effect=MockStripeAccountNotEnabled)
    def test_confirm_connected_not_verified(self, mock_account_retrieve, *args):
        """
        If an organization has connected its account with NRE (has a stripe_account_id), but
        their Stripe account is not ready to recieve payments, they're in a special state.
        """
        self.payment_provider1.stripe_verified = False
        self.payment_provider1.save()
        response = self.post_to_confirmation(stripe_account_id="testing", revenue_program_id=self.org1_rp1.id)
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "restricted")
        # stripe_verified should still be false
        self.assertFalse(self.payment_provider1.stripe_verified)

    @mock.patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_not_connected(self, mock_account_retrieve, *args):
        """
        Organizations that have not been connected to Stripe at all have
        no stripe_account_id.
        """
        response = self.post_to_confirmation(revenue_program_id=self.org1_rp1.id)

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "not_connected")
        # this should bail early, before Account.retrieve is called
        mock_account_retrieve.assert_not_called()

    @mock.patch("stripe.Account.retrieve", side_effect=StripeError)
    def test_stripe_error_is_caught(self, mock_account_retrieve, *args):
        """
        When stripe.Account.retrieve raises a StripeError, send it in response.
        """
        response = self.post_to_confirmation(stripe_account_id="testing", revenue_program_id=self.org1_rp1.id)
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["status"], "failed")


class TestContributionsViewSet(RevEngineApiAbstractTestCase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse("contribution-list")

        self.contribution_for_org = Contribution.objects.filter(
            donation_page__revenue_program__in=self.org1.revenueprogram_set.all()
        ).first()

    def contribution_detail_url(self, pk=None):
        pk = pk if pk is not None else self.contribution_for_org.pk
        return reverse("contribution-detail", args=(pk,))

    ##########
    # Retrieve
    def test_superuser_can_get_contribution(self):
        self.assert_superuser_can_get(self.contribution_detail_url())

    def test_hub_admin_can_get_contribution(self):
        self.assert_hub_admin_can_get(self.contribution_detail_url())

    def test_org_admin_can_get_contribution_owned_by_org(self):
        self.assert_org_admin_can_get(self.contribution_detail_url())

    def test_org_admin_cannot_get_contribution_owned_by_other_org(self):
        not_orgs_contribution = Contribution.objects.exclude(
            donation_page__revenue_program__organization=self.org1
        ).first()
        self.assertIsNotNone(not_orgs_contribution)
        self.assert_org_admin_cannot_get(self.contribution_detail_url(not_orgs_contribution.pk))

    def test_rp_user_can_get_contribution_from_their_rp(self):
        contrib_in_users_rp_pk = (
            Contribution.objects.filter(
                donation_page__revenue_program=self.rp_user.roleassignment.revenue_programs.first()
            )
            .first()
            .pk
        )
        self.assert_rp_user_can_get(self.contribution_detail_url(contrib_in_users_rp_pk))

    def test_rp_user_cannot_get_contribution_from_another_rp_in_org(self):
        contrib_not_in_users_rp_pk = (
            Contribution.objects.exclude(
                donation_page__revenue_program__in=self.rp_user.roleassignment.revenue_programs.all()
            )
            .first()
            .pk
        )
        self.assert_rp_user_cannot_get(self.contribution_detail_url(contrib_not_in_users_rp_pk))

    def test_rp_user_cannot_get_contribution_from_another_org(self):
        contrib_not_in_users_org_pk = (
            Contribution.objects.exclude(
                donation_page__revenue_program__in=self.rp_user.roleassignment.revenue_programs.all()
            )
            .first()
            .pk
        )
        self.assert_rp_user_cannot_get(self.contribution_detail_url(contrib_not_in_users_org_pk))

    ######
    # List
    def test_super_user_can_list_all_contributions(self):
        self.assert_superuser_can_list(self.list_url, Contribution.objects.count())

    def test_hub_admin_can_list_all_contributions(self):
        self.assert_hub_admin_can_list(self.list_url, Contribution.objects.count())

    def test_org_admin_can_list_orgs_contributions(self):
        """Should get back only contributions belonging to my org"""
        donation_pages_of_org = DonationPage.objects.filter(revenue_program__organization=self.org1)
        donation_pages = set(i.id for i in donation_pages_of_org)
        self.assertGreater(
            Contribution.objects.exclude(donation_page__in=donation_pages_of_org).count(),
            0,
        )
        ensure_owned_by_org = lambda contribution: contribution["donation_page_id"] in donation_pages

        self.assert_org_admin_can_list(
            self.list_url,
            Contribution.objects.filter(donation_page__in=donation_pages_of_org).count(),
            assert_item=ensure_owned_by_org,
        )

    def test_rp_user_can_list_their_rps_contributions(self):
        def _ensure_all_contribs_belong_to_users_rps(results):
            page_ids = list(set([contrib["donation_page_id"] for contrib in results]))
            referenced_rps = RevenueProgram.objects.filter(donationpage__in=page_ids).values_list("pk", flat=True)
            self.assertTrue(
                set(referenced_rps).issubset(
                    set(self.rp_user.roleassignment.revenue_programs.values_list("pk", flat=True))
                )
            )

        expected_count = Contribution.objects.filter(
            donation_page__revenue_program_id__in=self.rp_user.roleassignment.revenue_programs.all()
        ).count()
        self.assert_rp_user_can_list(self.list_url, expected_count, assert_all=_ensure_all_contribs_belong_to_users_rps)

    def test_contributions_are_read_only_for_expected_users(self):
        detail_url = reverse("contribution-detail", args=(Contribution.objects.first().pk,))
        expected_users = (
            self.superuser,
            self.hub_user,
            self.org_user,
            self.rp_user,
        )
        for user in expected_users:
            self.assert_user_cannot_delete_because_not_implemented(detail_url, user)
            self.assert_user_cannot_post_because_not_implemented(self.list_url, user)
            self.assert_user_cannot_patch_because_not_implemented(detail_url, user)
            self.assert_user_cannot_put_because_not_implemented(detail_url, user)

    def test_unexpected_role_type(self):
        novel = create_test_user(role_assignment_data={"role_type": "never-before-seen"})
        self.assert_user_cannot_get(
            reverse("contribution-list"), novel, expected_status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    def test_list_contributions_with_status_negation(self):
        filter_statuses = {"paid", "flagged"}
        qp = "&".join([f"status__not={i}" for i in filter_statuses])
        response = self.assert_user_can_get(self.list_url + f"?{qp}", self.superuser)
        self.assertTrue(all([i["status"] not in filter_statuses for i in response.json()["results"]]))

    def test_filters_out_contributions_without_payment_method(self):
        org = OrganizationFactory()
        payment_provider = PaymentProviderFactory(stripe_account_id="ignore")
        revenue_program = RevenueProgramFactory(organization=org, payment_provider=payment_provider)
        donation_page = DonationPageFactory(revenue_program=revenue_program)
        processing_contribution = Contribution.objects.create(amount=100, donation_page=donation_page)
        processed_contribution = Contribution.objects.create(
            amount=100, donation_page=donation_page, provider_payment_method_details={"k": "v"}
        )
        response = self.assert_user_can_get(self.list_url, self.hub_user)
        retrieved_contribution_ids = [
            retrieved_contribution["id"] for retrieved_contribution in response.json()["results"]
        ]
        assert processing_contribution.id not in retrieved_contribution_ids
        assert processed_contribution.id in retrieved_contribution_ids


class TestContributorContributionsViewSet(AbstractTestCase):
    def setUp(self):
        super().setUp()
        self.set_up_domain_model()

        self.contribution_1 = StripePaymentIntentFactory(revenue_program=self.org1_rp1.slug)
        self.contribution_2 = StripePaymentIntentFactory(revenue_program=self.org1_rp2.slug)
        self.contribution_3 = StripePaymentIntentFactory(revenue_program=self.org1_rp1.slug)
        self.contribution_4 = StripePaymentIntentFactory(revenue_program=self.org1_rp2.slug, payment_type=None)

        self.all_contributions = [self.contribution_1, self.contribution_2, self.contribution_3, self.contribution_4]

        self.stripe_contributions = [
            PaymentProviderContributionSerializer(instance=i).data for i in self.all_contributions
        ]

    def list_contributions(self):
        self.client.force_authenticate(user=self.contributor_user)
        return self.client.get(
            reverse("contribution-list"),
        )

    @mock.patch("apps.contributions.stripe_contributions_provider.ContributionsCacheProvider.load")
    @mock.patch("apps.contributions.tasks.task_pull_serialized_stripe_contributions_to_cache.delay")
    def test_contributor_can_list_their_contributions(self, celery_task_mock, cache_load_mock):
        cache_load_mock.return_value = self.stripe_contributions
        refresh_token = ContributorRefreshToken.for_contributor(self.contributor_user.uuid)
        self.client.cookies["Authorization"] = refresh_token.long_lived_access_token
        self.client.cookies["csrftoken"] = csrf._get_new_csrf_token()
        response = self.client.get(reverse("contribution-list"), {"rp": self.org1_rp1.slug})
        self.assertEqual(celery_task_mock.call_count, 0)
        self.assertEqual(response.json().get("count"), 2)

    @mock.patch("apps.contributions.stripe_contributions_provider.ContributionsCacheProvider.load")
    @mock.patch("apps.contributions.tasks.task_pull_serialized_stripe_contributions_to_cache.delay")
    def test_contributor_call_celery_task_if_no_contribution_in_cache(self, celery_task_mock, cache_load_mock):
        cache_load_mock.return_value = []
        refresh_token = ContributorRefreshToken.for_contributor(self.contributor_user.uuid)
        self.client.cookies["Authorization"] = refresh_token.long_lived_access_token
        self.client.cookies["csrftoken"] = csrf._get_new_csrf_token()
        response = self.client.get(reverse("contribution-list"), {"rp": self.org1_rp1.slug})
        celery_task_mock.assert_called_once()
        self.assertEqual(response.json().get("count"), 0)

    @mock.patch("apps.contributions.stripe_contributions_provider.ContributionsCacheProvider.load")
    @mock.patch("apps.contributions.tasks.task_pull_serialized_stripe_contributions_to_cache.delay")
    def test_contributor_call_excludes_payments_requiring_source(self, celery_task_mock, cache_load_mock):
        cache_load_mock.return_value = self.stripe_contributions
        refresh_token = ContributorRefreshToken.for_contributor(self.contributor_user.uuid)
        self.client.cookies["Authorization"] = refresh_token.long_lived_access_token
        self.client.cookies["csrftoken"] = csrf._get_new_csrf_token()
        response = self.client.get(reverse("contribution-list"), {"rp": self.org1_rp2.slug})
        contribution_ids = [contribution["id"] for contribution in response.json()["results"]]
        assert self.contribution_4.id not in contribution_ids


class TestSubscriptionViewSet(AbstractTestCase):
    def setUp(self):
        super().setUp()
        self.org = OrganizationFactory()
        self.stripe_account_id = "testing-stripe-account-id"
        self.payment_provider = PaymentProviderFactory(stripe_account_id=self.stripe_account_id)
        self.set_up_domain_model()
        self.rp_foo = RevenueProgramFactory(organization=self.org, payment_provider=self.payment_provider, slug="foo")
        self.rp_bar = RevenueProgramFactory(organization=self.org, payment_provider=self.payment_provider, slug="bar")
        self.subscription = {
            "id": "sub_1234",
            "status": "incomplete",
            "card_brand": "Visa",
            "last4": "4242",
            "plan": {
                "interval": "month",
                "interval_count": 1,
                "amount": 1234,
            },
            "metadata": {
                "revenue_program_slug": "foo",
            },
            "amount": "100",
            "customer": "cus_1234",
            "current_period_end": 1654892502,
            "current_period_start": 1686428502,
            "created": 1654892502,
            "default_payment_method": {
                "id": "pm_1234",
                "type": "card",
                "card": {"brand": "discover", "last4": "7834", "exp_month": "12", "exp_year": "2022"},
            },
        }
        self.sub_1 = AttrDict(self.subscription)
        self.sub_2 = AttrDict(self.subscription)
        self.sub_2.metadata.revenue_program_slug = "bar"
        self.all_subscriptions = [self.sub_1, self.sub_2]

        self.stripe_subscriptions = [SubscriptionsSerializer(instance=i).data for i in self.all_subscriptions]

    @mock.patch("apps.contributions.stripe_contributions_provider.SubscriptionsCacheProvider.load")
    @mock.patch("apps.contributions.views.task_pull_serialized_stripe_contributions_to_cache")
    def test_contributor_can_list_their_subscriptions(self, cache_refresh_mock, cache_load_mock):
        cache_load_mock.return_value = self.stripe_subscriptions
        refresh_token = ContributorRefreshToken.for_contributor(self.contributor_user.uuid)
        self.client.cookies["Authorization"] = refresh_token.long_lived_access_token
        self.client.cookies["csrftoken"] = csrf._get_new_csrf_token()
        response = self.client.get(reverse("subscription-list"), {"revenue_program_slug": "foo"})
        assert cache_refresh_mock.call_count == 0
        assert len(response.json()) == 1

    @mock.patch("apps.contributions.stripe_contributions_provider.SubscriptionsCacheProvider.load")
    @mock.patch("apps.contributions.views.task_pull_serialized_stripe_contributions_to_cache")
    def test_contributor_list_subscriptions_not_in_cache(self, cache_refresh_mock, cache_load_mock):
        cache_load_mock.return_value = []
        refresh_token = ContributorRefreshToken.for_contributor(self.contributor_user.uuid)
        self.client.cookies["Authorization"] = refresh_token.long_lived_access_token
        self.client.cookies["csrftoken"] = csrf._get_new_csrf_token()
        response = self.client.get(reverse("subscription-list"), data={"revenue_program_slug": "foo"}, format="json")
        cache_refresh_mock.assert_called_once()
        assert len(response.json()) == 0

    @mock.patch("apps.contributions.stripe_contributions_provider.SubscriptionsCacheProvider.load")
    @mock.patch("apps.contributions.views.task_pull_serialized_stripe_contributions_to_cache")
    def test_retrieve_subscription_not_there(self, cache_refresh_mock, cache_load_mock):
        cache_load_mock.return_value = []
        refresh_token = ContributorRefreshToken.for_contributor(self.contributor_user.uuid)
        self.client.cookies["Authorization"] = refresh_token.long_lived_access_token
        self.client.cookies["csrftoken"] = csrf._get_new_csrf_token()
        response = self.client.get(
            reverse("subscription-detail", kwargs={"pk": "sub_1234"}),
            data={"revenue_program_slug": "foo"},
            format="json",
        )
        assert cache_refresh_mock.call_count == 1
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @mock.patch("apps.contributions.stripe_contributions_provider.SubscriptionsCacheProvider.load")
    @mock.patch("apps.contributions.views.task_pull_serialized_stripe_contributions_to_cache")
    def test_retrieve_subscription_present(self, cache_refresh_mock, cache_load_mock):
        cache_load_mock.return_value = self.stripe_subscriptions
        refresh_token = ContributorRefreshToken.for_contributor(self.contributor_user.uuid)
        self.client.cookies["Authorization"] = refresh_token.long_lived_access_token
        self.client.cookies["csrftoken"] = csrf._get_new_csrf_token()
        response = self.client.get(
            reverse("subscription-detail", kwargs={"pk": "sub_1234"}),
            data={"revenue_program_slug": "foo"},
            format="json",
        )
        assert cache_refresh_mock.call_count == 0
        assert cache_load_mock.call_count == 2
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == "sub_1234"
        assert response.json()["revenue_program_slug"] == "foo"


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
        "amount": "120",
        "interval": "one_time",
        "first_name": "Bill",
        "last_name": "Smith",
        "email": "bill@smith.com",
        "phone": "123",
        "mailing_street": "123 Glenwood Avenue",
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
        "latest_invoice": {"payment_intent": {"client_secret": SUBSCRIPTION_CLIENT_SECRET}},
        "customer": stripe_create_customer_response["id"],
    }


@pytest.mark.django_db
class TestPaymentViewset:

    client = APIClient()
    # this is added because bad actor serializer needs referer
    client.credentials(HTTP_REFERER="https://www.foo.com")

    @pytest.mark.parametrize(
        "interval,client_secret,subscription_id",
        (
            (ContributionInterval.ONE_TIME, PI_CLIENT_SECRET, None),
            (
                ContributionInterval.MONTHLY,
                SUBSCRIPTION_CLIENT_SECRET,
                SUBSCRIPTION_ID,
            ),
            (
                ContributionInterval.YEARLY,
                SUBSCRIPTION_CLIENT_SECRET,
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
        client_secret,
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
        assert set(["email_hash", "provider_client_secret_id"]) == set(response.json().keys())
        assert Contributor.objects.count() == contributor_count + 1
        assert Contribution.objects.count() == contribution_count + 1
        contribution = Contribution.objects.get(provider_client_secret_id=client_secret)
        assert contribution.interval == interval
        assert contribution.provider_subscription_id == subscription_id
        assert contribution.amount == int(data["amount"]) * 100

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
        "interval,client_secret,subscription_id",
        (
            (ContributionInterval.ONE_TIME, PI_CLIENT_SECRET, None),
            (ContributionInterval.MONTHLY, SUBSCRIPTION_CLIENT_SECRET, SUBSCRIPTION_ID),
            (ContributionInterval.YEARLY, SUBSCRIPTION_CLIENT_SECRET, SUBSCRIPTION_ID),
        ),
    )
    def test_destroy_happy_path(
        self,
        interval,
        client_secret,
        subscription_id,
        monkeypatch,
    ):
        contribution = ContributionFactory(
            interval=interval,
            provider_client_secret_id=client_secret,
            provider_subscription_id=subscription_id,
            status=ContributionStatus.PROCESSING,
        )
        url = reverse("payment-detail", kwargs={"provider_client_secret_id": contribution.provider_client_secret_id})

        mock_cancel_pi = mock.Mock()
        mock_delete_sub = mock.Mock()
        monkeypatch.setattr("stripe.PaymentIntent.cancel", mock_cancel_pi)
        monkeypatch.setattr("stripe.Subscription.delete", mock_delete_sub)
        response = self.client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        contribution.refresh_from_db()
        assert contribution.status == ContributionStatus.CANCELED
        if interval == ContributionInterval.ONE_TIME:
            mock_cancel_pi.assert_called_once_with(client_secret)
        else:
            mock_delete_sub.assert_called_once_with(subscription_id)


@pytest.mark.django_db
def test_payment_success_view():
    """Minimal test of payment success view. This view calls a model method which is more deeply tested elsewhere."""
    client = APIClient()
    contribution = ContributionFactory(interval="month")
    contribution.provider_client_secret_id = "Shhhhhh"
    contribution.save()
    url = reverse("payment-success", args=(contribution.provider_client_secret_id,))
    response = client.patch(url, {})
    assert response.status_code == status.HTTP_204_NO_CONTENT
