from unittest.mock import patch

from django.conf import settings
from django.middleware import csrf
from django.test import override_settings

from faker import Faker
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APIRequestFactory, APITestCase
from stripe.error import StripeError
from stripe.oauth_error import InvalidGrantError as StripeInvalidGrantError
from stripe.stripe_object import StripeObject
from waffle import get_waffle_flag_model

from apps.api.tests import RevEngineApiAbstractTestCase
from apps.api.tokens import ContributorRefreshToken
from apps.common.tests.test_resources import AbstractTestCase
from apps.contributions.models import Contribution, ContributionInterval
from apps.contributions.payment_managers import PaymentBadParamsError, PaymentProviderError
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.contributions.views import stripe_payment
from apps.flags.constants import CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME
from apps.organizations.models import RevenueProgram
from apps.organizations.tests.factories import OrganizationFactory
from apps.pages.models import DonationPage
from apps.users.choices import Roles
from apps.users.tests.utils import create_test_user


faker = Faker()

test_client_secret = "secret123"


class MockPaymentIntent(StripeObject):
    def __init__(self, *args, **kwargs):
        self.id = "test"
        self.client_secret = test_client_secret


class StripePaymentViewTestAbstract(AbstractTestCase):
    def setUp(self):
        super().setUp()
        self.set_up_domain_model()

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.payment_amount = "10.00"
        cls.ip = faker.ipv4()
        cls.referer = faker.url()
        cls.url = reverse("stripe-payment")

    def _create_request(self, donation_page, email="tester@testing.com", interval=None, payment_method_id=None):
        factory = APIRequestFactory()
        request = factory.post(
            self.url,
            {
                "email": email,
                "first_name": "Test",
                "last_name": "Tester",
                "amount": self.payment_amount,
                "donor_selected_amount": self.payment_amount,
                "mailing_postal_code": 12345,
                "mailing_street": "123 Fake Street",
                "mailing_city": "Fakerton",
                "mailing_state": "FK",
                "mailing_country": "Fakeland",
                "organization_country": "US",
                "currency": "cad",
                "phone": "123-456-7890",
                "revenue_program_slug": donation_page.revenue_program.slug,
                "donation_page_slug": donation_page.slug,
                "interval": interval if interval else ContributionInterval.ONE_TIME,
                "payment_method_id": payment_method_id,
                "page_id": donation_page.pk,
            },
            format="json",
        )
        request.META["HTTP_REFERER"] = self.referer
        request.META["HTTP_X_FORWARDED_FOR"] = self.ip

        return request

    def _post_valid_one_time_payment(self, donation_page, **kwargs):
        return stripe_payment(self._create_request(donation_page, **kwargs))


class StripeOneTimePaymentViewTest(StripePaymentViewTestAbstract):
    def setUp(self):
        super().setUp()
        self.page = DonationPage.objects.filter(revenue_program=self.org1_rp1).first()
        self.assertIsNotNone(self.page)

    @patch("apps.contributions.views.StripePaymentManager.create_one_time_payment", side_effect=MockPaymentIntent)
    def test_one_time_payment_serializer_validates_email(self, *args):
        response = self._post_valid_one_time_payment(self.page, email=None)
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)
        self.assertEqual(str(response.data["email"][0]), "This field may not be null.")

    @patch("apps.contributions.views.StripePaymentManager.create_one_time_payment", side_effect=MockPaymentIntent)
    @patch("apps.contributions.views.PageEmailTemplate.get_template")
    def test_one_time_payment_method_called(self, mock_email, mock_one_time_payment):
        response = self._post_valid_one_time_payment(self.page)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["clientSecret"], test_client_secret)
        mock_one_time_payment.assert_called_once()
        mock_email.assert_not_called()

        with self.subTest("with email templates enabled get_template is called"):
            self.org1.uses_email_templates = True
            self.org1.save()
            response = self._post_valid_one_time_payment(self.page)
            self.assertEqual(response.status_code, 200)
            mock_email.assert_called()

    @patch("apps.contributions.views.StripePaymentManager.create_one_time_payment", side_effect=PaymentBadParamsError)
    def test_response_when_bad_params_error(self, mock_one_time_payment):
        response = self._post_valid_one_time_payment(self.page)
        mock_one_time_payment.assert_called_once()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "There was an error processing your payment.")

    @patch("apps.contributions.views.StripePaymentManager.create_one_time_payment", side_effect=PaymentProviderError)
    def test_response_when_payment_provider_error(self, mock_one_time_payment):
        response = self._post_valid_one_time_payment(self.page)
        mock_one_time_payment.assert_called_once()
        self.assertEqual(response.status_code, 400)


@patch("apps.contributions.views.StripePaymentManager.create_subscription")
class CreateStripeRecurringPaymentViewTest(StripePaymentViewTestAbstract):
    def setUp(self):
        super().setUp()
        self.page = DonationPage.objects.filter(revenue_program=self.org1_rp1).first()
        self.assertIsNotNone(self.page)

    def test_recurring_payment_serializer_validates(self, *args):
        # StripeRecurringPaymentSerializer requires payment_method_id
        response = self._post_valid_one_time_payment(
            self.page,
            interval=ContributionInterval.MONTHLY,
        )
        # This also verifies that the view is using the correct serializer.
        # Test failures here may indicate that the wrong serializer is being used.
        self.assertEqual(response.status_code, 400)
        self.assertIn("payment_method_id", response.data)
        self.assertEqual(str(response.data["payment_method_id"][0]), "This field may not be null.")

    def test_create_subscription_called(self, mock_subscription_create):
        """
        Verify that we're getting the response we expect from a valid contribition
        """
        response = self._post_valid_one_time_payment(
            self.page,
            interval=ContributionInterval.MONTHLY,
            payment_method_id="test_payment_method_id",
        )
        self.assertEqual(response.status_code, 200)
        mock_subscription_create.assert_called_once()


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

    def _make_request(self, code=None, scope=None):
        self.client.force_authenticate(user=self.org_user)
        url = reverse("stripe-oauth")
        complete_url = f"{url}?{settings.ORG_SLUG_PARAM}={self.org1.slug}"
        body = {}
        if code:
            body["code"] = code
        if scope:
            body["scope"] = scope
        return self.client.post(complete_url, body)

    @patch("stripe.OAuth.token")
    def test_response_when_missing_params(self, stripe_oauth_token):
        # Missing code
        response = self._make_request(code=None, scope=expected_oauth_scope)
        self.assertEqual(response.status_code, 400)
        self.assertIn("missing_params", response.data)
        stripe_oauth_token.assert_not_called()

        # Missing scope
        response = self._make_request(code="12345", scope=None)
        self.assertEqual(response.status_code, 400)
        self.assertIn("missing_params", response.data)
        stripe_oauth_token.assert_not_called()

        # Missing both
        response = self._make_request(code=None, scope=None)
        self.assertEqual(response.status_code, 400)
        self.assertIn("missing_params", response.data)
        stripe_oauth_token.assert_not_called()

    @patch("stripe.OAuth.token")
    def test_response_when_scope_param_mismatch(self, stripe_oauth_token):
        """
        We verify that the "scope" parameter provided by the frontend matches the scope we expect
        """
        response = self._make_request(code="1234", scope="not_expected_scope")
        self.assertEqual(response.status_code, 400)
        self.assertIn("scope_mismatch", response.data)
        stripe_oauth_token.assert_not_called()

    @patch("stripe.OAuth.token")
    def test_response_when_invalid_code(self, stripe_oauth_token):
        stripe_oauth_token.side_effect = StripeInvalidGrantError(code="error_code", description="error_description")
        response = self._make_request(code="1234", scope=expected_oauth_scope)
        self.assertEqual(response.status_code, 400)
        self.assertIn("invalid_code", response.data)
        stripe_oauth_token.assert_called_with(code="1234", grant_type="authorization_code")

    @patch("stripe.OAuth.token")
    def test_response_success(self, stripe_oauth_token):
        expected_stripe_account_id = "my_test_account_id"
        expected_refresh_token = "my_test_refresh_token"
        stripe_oauth_token.return_value = MockOAuthResponse(
            stripe_user_id=expected_stripe_account_id, refresh_token=expected_refresh_token
        )
        response = self._make_request(code="1234", scope=expected_oauth_scope)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "success")
        stripe_oauth_token.assert_called_with(code="1234", grant_type="authorization_code")
        # Org should have new values based on OAuth response
        self.org1.refresh_from_db()
        self.assertEqual(self.org1.stripe_account_id, expected_stripe_account_id)
        self.assertEqual(self.org1.stripe_oauth_refresh_token, expected_refresh_token)


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


@patch("stripe.Product.create", side_effect=MockStripeProduct)
class StripeConfirmTest(AbstractTestCase):
    def setUp(self):
        super().setUp()
        self.set_up_domain_model()
        self.url = f'{reverse("stripe-confirmation")}?{settings.ORG_SLUG_PARAM}={self.org1.slug}'

    def post_to_confirmation(self, stripe_account_id="", stripe_verified=None, stripe_product_id=""):
        self.org1.stripe_account_id = stripe_account_id
        self.org1.stripe_verified = True if stripe_verified else False
        self.org1.stripe_product_id = stripe_product_id
        self.org1.save()
        self.org1.refresh_from_db()
        self.client.force_authenticate(user=self.org_user)
        return self.client.post(self.url)

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_confirm_already_verified(self, mock_account_retrieve, *args):
        """
        stripe_confirmation should return early if the org already has stripe_verified=True.
        """

        response = self.post_to_confirmation(
            stripe_verified=True, stripe_account_id="testing", stripe_product_id="test_product_id"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "connected")
        # this should bail early, before Account.retrieve is called
        mock_account_retrieve.assert_not_called()

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_confirm_newly_verified(self, mock_account_retrieve, *args):
        """
        stripe_confirmation should set stripe_verified to True after confirming with Stripe.
        """
        self.org1.stripe_verified = False
        self.org1.save()
        response = self.post_to_confirmation(stripe_account_id="testing")
        self.org1.refresh_from_db()
        self.assertTrue(self.org1.stripe_verified)
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "connected")

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_confirm_stripe_error_response(self, mock_account_retrieve, mock_product_create):
        mock_product_create.side_effect = StripeError
        response = self.post_to_confirmation(stripe_account_id="testing")
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["status"], "failed")

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_product_create_called_when_newly_verified(self, mock_account_retrieve, mock_product_create):
        self.post_to_confirmation(stripe_account_id="testing")
        mock_account_retrieve.assert_called_once()
        # Newly confirmed accounts should go ahead and create a default product on for that org.
        mock_product_create.assert_called_once()
        self.org1.refresh_from_db()
        self.assertEqual(self.org1.stripe_product_id, TEST_STRIPE_PRODUCT_ID)

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountNotEnabled)
    def test_confirm_connected_not_verified(self, mock_account_retrieve, *args):
        """
        If an organization has connected its account with NRE (has a stripe_account_id), but
        their Stripe account is not ready to recieve payments, they're in a special state.
        """
        self.org1.stripe_verified = False
        self.org1.save()
        response = self.post_to_confirmation(stripe_account_id="testing")
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "restricted")
        # stripe_verified should still be false
        self.assertFalse(self.org1.stripe_verified)

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_not_connected(self, mock_account_retrieve, *args):
        """
        Organizations that have not been connected to Stripe at all have
        no stripe_account_id.
        """
        response = self.post_to_confirmation()

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "not_connected")
        # this should bail early, before Account.retrieve is called
        mock_account_retrieve.assert_not_called()

    @patch("stripe.Account.retrieve", side_effect=StripeError)
    def test_stripe_error_is_caught(self, mock_account_retrieve, *args):
        """
        When stripe.Account.retrieve raises a StripeError, send it in response.
        """
        response = self.post_to_confirmation(stripe_account_id="testing")
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["status"], "failed")


class TestContributionsViewSet(RevEngineApiAbstractTestCase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse("contribution-list")
        self.contribution_for_org = Contribution.objects.filter(organization=self.org1).first()

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
        not_orgs_contribution = Contribution.objects.exclude(organization=self.org1).first()
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
            Contribution.objects.exclude(organization=self.rp_user.roleassignment.revenue_programs.first().organization)
            .first()
            .pk
        )
        self.assert_rp_user_cannot_get(self.contribution_detail_url(contrib_not_in_users_org_pk))

    def test_contributor_can_get_their_contribution(self):
        refresh_token = ContributorRefreshToken.for_contributor(self.contributor_user.uuid)
        self.client.cookies["Authorization"] = refresh_token.long_lived_access_token
        self.client.cookies["csrftoken"] = csrf._get_new_csrf_token()
        my_contribution = self.contributor_user.contribution_set.first()
        self.assert_contributor_can_get(self.contribution_detail_url(my_contribution.pk))

    def test_contributor_cannot_get_others_contribution(self):
        refresh_token = ContributorRefreshToken.for_contributor(self.contributor_user.uuid)
        self.client.cookies["Authorization"] = refresh_token.long_lived_access_token
        self.client.cookies["csrftoken"] = csrf._get_new_csrf_token()
        not_my_contribution = Contribution.objects.exclude(contributor=self.contributor_user).first()
        self.assert_contributor_cannot_get(
            self.contribution_detail_url(not_my_contribution.pk), expected_status_code=status.HTTP_404_NOT_FOUND
        )

    ######
    # List
    def test_super_user_can_list_all_contributions(self):
        self.assert_superuser_can_list(self.list_url, Contribution.objects.count())

    def test_hub_admin_can_list_all_contributions(self):
        self.assert_hub_admin_can_list(self.list_url, Contribution.objects.count())

    def test_org_admin_can_list_orgs_contributions(self):
        """Should get back only contributions belonging to my org"""
        self.assertGreater(Contribution.objects.exclude(organization=self.org1).count(), 0)
        ensure_owned_by_org = lambda contribution: contribution["organization_id"] == self.org1.pk
        self.assert_org_admin_can_list(
            self.list_url, Contribution.objects.filter(organization=self.org1).count(), assert_item=ensure_owned_by_org
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

    def test_contributor_can_list_their_contributions(self):
        refresh_token = ContributorRefreshToken.for_contributor(self.contributor_user.uuid)
        self.client.cookies["Authorization"] = refresh_token.long_lived_access_token
        self.client.cookies["csrftoken"] = csrf._get_new_csrf_token()

        def _ensure_all_contributions_belong_to_contributor(results):
            contribution_ids = [result["id"] for result in results]
            self.assertTrue(
                set(contribution_ids).issubset(set(self.contributor_user.contribution_set.values_list("id", flat=True)))
            )

        expected_count = Contribution.objects.filter(contributor=self.contributor_user).count()
        self.assert_contributor_user_can_list(
            self.list_url, expected_count, assert_all=_ensure_all_contributions_belong_to_contributor
        )

    def test_contributions_are_read_only_for_expected_users(self):
        detail_url = reverse("contribution-detail", args=(Contribution.objects.first().pk,))
        expected_users = (
            self.superuser,
            self.hub_user,
            self.org_user,
            self.rp_user,
            self.contributor_user,
            self.generic_user,
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

    def test_feature_flagging(self):
        """Show feature users are gated by feature flag for this resource"""
        flag_model = get_waffle_flag_model()
        contributions_access_flag = flag_model.objects.get(name=CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME)
        contributions_access_flag.everyone = False
        contributions_access_flag.superusers = True
        contributions_access_flag.users.add(self.hub_user)
        contributions_access_flag.save()
        expected_users_having_access = (
            self.superuser,
            self.contributor_user,
            self.hub_user,  # has access because we gave individual access above
        )
        expected_users_not_having_access = (
            self.org_user,
            self.rp_user,
            self.generic_user,
        )
        for user in expected_users_not_having_access:
            self.assert_user_cannot_get(self.list_url, user)
        for user in expected_users_having_access:
            self.assert_user_can_get(self.list_url, user)

    def test_feature_flagging_when_flag_not_found(self):
        """Should raise ApiConfigurationError if view is accessed and flag can't be found"""
        flag_model = get_waffle_flag_model()
        contributions_access_flag = flag_model.objects.get(name=CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME)
        contributions_access_flag.delete()

        response = self.assert_user_cannot_get(
            self.list_url, self.superuser, expected_status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        self.assertEqual(response.json().get("detail", None), "There was a problem with the API")


TEST_STRIPE_API_KEY = "test_stripe_api_key"


@override_settings(STRIPE_TEST_SECRET_KEY=TEST_STRIPE_API_KEY)
class UpdatePaymentMethodTest(APITestCase):
    def setUp(self):
        self.subscription_id = "test-subscription-id"
        self.stripe_account_id = "testing-stripe-account-id"
        self.customer_id = "testing-customer-id"
        self.org = OrganizationFactory(stripe_account_id=self.stripe_account_id)
        self.contributor = ContributorFactory()
        self.contribution = ContributionFactory(
            contributor=self.contributor,
            organization=self.org,
            provider_customer_id=self.customer_id,
            provider_subscription_id=self.subscription_id,
        )
        self.other_contribution = ContributionFactory(organization=self.org)
        self.payment_method_id = "testing-payment-method-id"

    def _make_request(self, contribution, data={}):
        self.client.force_authenticate(user=self.contributor)
        return self.client.patch(reverse("contribution-update-payment-method", kwargs={"pk": contribution.pk}), data)

    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.Subscription.modify")
    def test_failure_when_missing_payment_method_id(self, mock_modify, mock_attach):
        response = self._make_request(self.contribution)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Request contains unsupported fields")
        mock_modify.assert_not_called()
        mock_attach.assert_not_called()

    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.Subscription.modify")
    def test_failure_when_any_parameter_other_than_pm_id(self, mock_modify, mock_attach):
        response = self._make_request(self.contribution, {"amount": 10})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Request contains unsupported fields")
        mock_modify.assert_not_called()
        mock_attach.assert_not_called()

    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.Subscription.modify")
    def test_failure_when_contribution_and_contributor_dont_match(self, mock_modify, mock_attach):
        self.assertNotEqual(self.other_contribution.contributor, self.contributor)
        response = self._make_request(self.other_contribution, {"payment_method_id": self.payment_method_id})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "Could not find contribution for requesting contributor")
        mock_modify.assert_not_called()
        mock_attach.assert_not_called()

    @patch("stripe.PaymentMethod.attach", side_effect=StripeError)
    @patch("stripe.Subscription.modify")
    def test_error_when_attach_payment_method(self, mock_modify, mock_attach):
        response = self._make_request(self.contribution, {"payment_method_id": self.payment_method_id})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Could not complete payment")

        mock_attach.assert_called_once_with(
            self.payment_method_id,
            customer=self.customer_id,
            stripe_account=self.stripe_account_id,
        )
        mock_modify.assert_not_called()

    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.Subscription.modify", side_effect=StripeError)
    def test_error_when_update_payment_method(self, mock_modify, mock_attach):
        response = self._make_request(self.contribution, {"payment_method_id": self.payment_method_id})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Could not complete payment")

        mock_attach.assert_called_once_with(
            self.payment_method_id,
            customer=self.customer_id,
            stripe_account=self.stripe_account_id,
        )

        mock_modify.assert_called_once_with(
            self.subscription_id,
            default_payment_method=self.payment_method_id,
            stripe_account=self.stripe_account_id,
        )

    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.Subscription.modify")
    def test_update_payment_method_success(self, mock_modify, mock_attach):
        response = self._make_request(self.contribution, {"payment_method_id": self.payment_method_id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Success")

        mock_attach.assert_called_once_with(
            self.payment_method_id,
            customer=self.customer_id,
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
        self.org = OrganizationFactory(stripe_account_id=self.stripe_account_id)
        self.contributor = ContributorFactory()
        self.contribution = ContributionFactory(
            contributor=self.contributor,
            organization=self.org,
            provider_subscription_id=self.subscription_id,
        )
        self.other_contribution = ContributionFactory(organization=self.org)
        self.payment_method_id = "testing-payment-method-id"

    def _make_request(self, contribution):
        self.client.force_authenticate(user=self.contributor)
        return self.client.post(reverse("contribution-cancel-recurring-payment", kwargs={"pk": contribution.pk}))

    @patch("stripe.Subscription.delete")
    def test_failure_when_contribution_and_contributor_dont_match(self, mock_delete):
        self.assertNotEqual(self.other_contribution.contributor, self.contributor)
        response = self._make_request(self.other_contribution)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "Could not find contribution for requesting contributor")
        mock_delete.assert_not_called()

    @patch("stripe.Subscription.delete", side_effect=StripeError)
    def test_error_when_subscription_delete(self, mock_delete):
        response = self._make_request(self.contribution)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Could not complete payment")

        mock_delete.assert_called_once_with(self.subscription_id, stripe_account=self.stripe_account_id)

    @patch("stripe.Subscription.delete")
    def test_delete_recurring_success(self, mock_delete):
        response = self._make_request(self.contribution)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Success")

        mock_delete.assert_called_once_with(self.subscription_id, stripe_account=self.stripe_account_id)


@patch("apps.contributions.models.Contribution.process_flagged_payment")
class ProcessFlaggedContributionTest(APITestCase):
    def setUp(self):
        self.user = create_test_user(role_assignment_data={"role_type": Roles.HUB_ADMIN})
        self.subscription_id = "test-subscription-id"
        self.stripe_account_id = "testing-stripe-account-id"
        self.org = OrganizationFactory(stripe_account_id=self.stripe_account_id)
        self.contributor = ContributorFactory()
        self.contribution = ContributionFactory(
            contributor=self.contributor,
            organization=self.org,
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
