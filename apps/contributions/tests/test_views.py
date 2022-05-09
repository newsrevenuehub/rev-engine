from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse

from faker import Faker
from rest_framework.test import APIRequestFactory, APITestCase
from stripe.error import StripeError
from stripe.oauth_error import InvalidGrantError as StripeInvalidGrantError
from stripe.stripe_object import StripeObject

from apps.contributions.models import Contribution, ContributionInterval, Contributor
from apps.contributions.payment_managers import PaymentBadParamsError, PaymentProviderError
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.contributions.views import stripe_payment
from apps.organizations.tests.factories import (
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
from apps.pages.tests.factories import DonationPageFactory


faker = Faker()

test_client_secret = "secret123"


class MockPaymentIntent(StripeObject):
    def __init__(self, *args, **kwargs):
        self.id = "test"
        self.client_secret = test_client_secret


class StripePaymentViewTestAbstract(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.revenue_program = RevenueProgramFactory(organization=self.organization)
        self.page = DonationPageFactory(revenue_program=self.revenue_program)
        self.contributor = ContributorFactory()

        self.url = reverse("stripe-payment")
        self.payment_amount = "10.00"

        self.ip = faker.ipv4()
        self.referer = faker.url()

    def _create_request(
        self, email="tester@testing.com", rev_slug=None, page_slug=None, interval=None, payment_method_id=None
    ):
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
                "revenue_program_slug": rev_slug if rev_slug else self.revenue_program.slug,
                "donation_page_slug": page_slug if page_slug else self.page.slug,
                "interval": interval if interval else ContributionInterval.ONE_TIME,
                "payment_method_id": payment_method_id,
                "page_id": self.page.pk,
            },
            format="json",
        )

        request.META["HTTP_REFERER"] = self.referer
        request.META["HTTP_X_FORWARDED_FOR"] = self.ip

        return request

    def _post_valid_one_time_payment(self, **kwargs):
        return stripe_payment(self._create_request(**kwargs))


class StripeOneTimePaymentViewTest(StripePaymentViewTestAbstract):
    @patch("apps.contributions.views.StripePaymentManager.create_one_time_payment", side_effect=MockPaymentIntent)
    def test_one_time_payment_serializer_validates(self, *args):
        # Email is required
        response = self._post_valid_one_time_payment(email=None)
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)
        self.assertEqual(str(response.data["email"][0]), "This field may not be null.")

    @patch("apps.contributions.views.StripePaymentManager.create_one_time_payment", side_effect=MockPaymentIntent)
    @patch("apps.contributions.views.PageEmailTemplate.get_template")
    def test_one_time_payment_method_called(self, mock_email, mock_one_time_payment):
        response = self._post_valid_one_time_payment()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["clientSecret"], test_client_secret)
        mock_one_time_payment.assert_called_once()
        mock_email.assert_not_called()

        with self.subTest("with email templates enabled get_template is called"):
            self.organization.uses_email_templates = True
            self.organization.save()
            response = self._post_valid_one_time_payment()
            self.assertEqual(response.status_code, 200)
            mock_email.assert_called()

    @patch("apps.contributions.views.StripePaymentManager.create_one_time_payment", side_effect=PaymentBadParamsError)
    def test_response_when_bad_params_error(self, mock_one_time_payment):
        response = self._post_valid_one_time_payment()
        mock_one_time_payment.assert_called_once()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "There was an error processing your payment.")

    @patch("apps.contributions.views.StripePaymentManager.create_one_time_payment", side_effect=PaymentProviderError)
    def test_response_when_payment_provider_error(self, mock_one_time_payment):
        response = self._post_valid_one_time_payment()
        mock_one_time_payment.assert_called_once()
        self.assertEqual(response.status_code, 400)


@patch("apps.contributions.views.StripePaymentManager.create_subscription")
class CreateStripeRecurringPaymentViewTest(StripePaymentViewTestAbstract):
    def test_recurring_payment_serializer_validates(self, *args):
        # StripeRecurringPaymentSerializer requires payment_method_id
        response = self._post_valid_one_time_payment(interval=ContributionInterval.MONTHLY)
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
            interval=ContributionInterval.MONTHLY, payment_method_id="test_payment_method_id"
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
class StripeOAuthTest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create(email="user@test.com", password="testing")
        self.organization = OrganizationFactory(name="My Organization")
        self.payment_provider = PaymentProviderFactory()
        self.revenue_program = RevenueProgramFactory(
            organization=self.organization, payment_provider=self.payment_provider
        )
        self.organization.user_set.through.objects.create(organization=self.organization, user=self.user, is_owner=True)

        self.url = reverse("stripe-oauth")

    def _make_request(self, code=None, scope=None, revenue_program_id=None):
        self.client.force_authenticate(user=self.user)
        body = {}
        if revenue_program_id:
            body["revenue_program_id"] = revenue_program_id
        if code:
            body["code"] = code
        if scope:
            body["scope"] = scope
        return self.client.post(self.url, body)

    @patch("stripe.OAuth.token")
    def test_response_when_missing_params(self, stripe_oauth_token):
        # Missing code
        response = self._make_request(code=None, scope=expected_oauth_scope, revenue_program_id=self.revenue_program.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn("missing_params", response.data)
        stripe_oauth_token.assert_not_called()

        # Missing scope
        response = self._make_request(code="12345", scope=None, revenue_program_id=self.revenue_program.id)
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

    @patch("stripe.OAuth.token")
    def test_response_when_scope_param_mismatch(self, stripe_oauth_token):
        """
        We verify that the "scope" parameter provided by the frontend matches the scope we expect
        """
        response = self._make_request(
            code="1234", scope="not_expected_scope", revenue_program_id=self.revenue_program.id
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("scope_mismatch", response.data)
        stripe_oauth_token.assert_not_called()

    @patch("stripe.OAuth.token")
    def test_response_when_invalid_code(self, stripe_oauth_token):
        stripe_oauth_token.side_effect = StripeInvalidGrantError(code="error_code", description="error_description")
        response = self._make_request(
            code="1234", scope=expected_oauth_scope, revenue_program_id=self.revenue_program.id
        )
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
        response = self._make_request(
            code="1234", scope=expected_oauth_scope, revenue_program_id=self.revenue_program.id
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "success")
        stripe_oauth_token.assert_called_with(code="1234", grant_type="authorization_code")
        # Org should have new values based on OAuth response
        self.payment_provider.refresh_from_db()
        self.assertEqual(self.payment_provider.stripe_account_id, expected_stripe_account_id)
        self.assertEqual(self.payment_provider.stripe_oauth_refresh_token, expected_refresh_token)


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
class StripeConfirmTest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create(email="user@test.com", password="testing")
        self.organization = OrganizationFactory(name="My Organization")
        self.organization.user_set.add(self.user)
        self.payment_provider = PaymentProviderFactory()
        self.revenue_program = RevenueProgramFactory(
            organization=self.organization, payment_provider=self.payment_provider
        )
        self.url = reverse("stripe-confirmation")

    def post_to_confirmation(self, stripe_account_id="", stripe_verified=None, stripe_product_id=""):
        self.payment_provider.stripe_account_id = stripe_account_id
        self.payment_provider.stripe_verified = True if stripe_verified else False
        self.payment_provider.stripe_product_id = stripe_product_id
        self.payment_provider.save()
        self.payment_provider.refresh_from_db()
        self.client.force_authenticate(user=self.user)

        return self.client.post(self.url, {"revenue_program_id": self.revenue_program.id})

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
        self.payment_provider.stripe_verified = False
        self.payment_provider.save()
        response = self.post_to_confirmation(stripe_account_id="testing")
        self.payment_provider.refresh_from_db()
        self.assertTrue(self.payment_provider.stripe_verified)
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
        self.payment_provider.refresh_from_db()
        self.assertEqual(self.payment_provider.stripe_product_id, TEST_STRIPE_PRODUCT_ID)

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountNotEnabled)
    def test_confirm_connected_not_verified(self, mock_account_retrieve, *args):
        """
        If an organization has connected its account with Hub (has a stripe_account_id), but
        their Stripe account is not ready to recieve payments, they're in a special state.
        """
        self.payment_provider.stripe_verified = False
        self.payment_provider.save()
        response = self.post_to_confirmation(stripe_account_id="testing")
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "restricted")
        # stripe_verified should still be false
        self.assertFalse(self.payment_provider.stripe_verified)

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


class TestContributionsViewSet(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create(email="user@org1.com", password="testing")
        self.organization1 = OrganizationFactory(name="Organization 1")
        self.organization1.user_set.add(self.user)
        self.revenue_program1 = RevenueProgramFactory(name="Revenue Program 1", organization=self.organization1)
        self.organization2 = OrganizationFactory(name="Organization 2")
        self.revenue_program2 = RevenueProgramFactory(name="Revenue Program 2", organization=self.organization2)
        self.contributor = Contributor.objects.create(email="contributor@contributor.com")
        self.contributions_per_revenue_program = 50
        for i in range(self.contributions_per_revenue_program):
            Contribution.objects.create(
                amount=1000,
                interval=ContributionInterval.ONE_TIME[0],
                contributor=self.contributor,
                donation_page=DonationPageFactory(revenue_program=self.revenue_program1),
            )
            Contribution.objects.create(
                amount=2000,
                interval=ContributionInterval.ONE_TIME[0],
                contributor=self.contributor,
                donation_page=DonationPageFactory(revenue_program=self.revenue_program2),
            )

        self.url = reverse("contributions-list")

    def test_happy_path(self):
        """Should get back only contributions belonging to my org"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], self.contributions_per_revenue_program)


TEST_STRIPE_API_KEY = "test_stripe_api_key"


@override_settings(STRIPE_TEST_SECRET_KEY=TEST_STRIPE_API_KEY)
class UpdatePaymentMethodTest(APITestCase):
    def setUp(self):
        self.subscription_id = "test-subscription-id"
        self.stripe_account_id = "testing-stripe-account-id"
        self.customer_id = "testing-customer-id"
        self.org = OrganizationFactory()
        self.contributor = ContributorFactory()

        payment_provider = PaymentProviderFactory(stripe_account_id=self.stripe_account_id)
        revenue_program = RevenueProgramFactory(organization=self.org, payment_provider=payment_provider)
        donation_page = DonationPageFactory(revenue_program=revenue_program)
        self.contribution = ContributionFactory(
            contributor=self.contributor,
            donation_page=donation_page,
            provider_customer_id=self.customer_id,
            provider_subscription_id=self.subscription_id,
        )
        self.other_contribution = ContributionFactory(donation_page=donation_page)
        self.payment_method_id = "testing-payment-method-id"

    def _make_request(self, contribution, data={}):
        self.client.force_authenticate(user=self.contributor)
        return self.client.patch(reverse("contributions-update", kwargs={"pk": contribution.pk}), data)

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
        self.org = OrganizationFactory()
        payment_provider = PaymentProviderFactory(stripe_account_id=self.stripe_account_id)
        revenue_program = RevenueProgramFactory(organization=self.org, payment_provider=payment_provider)
        donation_page = DonationPageFactory(revenue_program=revenue_program)
        self.contributor = ContributorFactory()
        self.contribution = ContributionFactory(
            contributor=self.contributor,
            donation_page=donation_page,
            provider_subscription_id=self.subscription_id,
        )
        self.other_contribution = ContributionFactory(donation_page=donation_page)
        self.payment_method_id = "testing-payment-method-id"

    def _make_request(self, contribution):
        self.client.force_authenticate(user=self.contributor)
        return self.client.post(reverse("contributions-cancel-recurring", kwargs={"pk": contribution.pk}))

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
        self.user = get_user_model().objects.create(email="user@test.com", password="testing")
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
        url = reverse("process-flagged", args=[contribution_pk])
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
