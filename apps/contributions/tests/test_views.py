from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse

from faker import Faker
from rest_framework.test import APIRequestFactory, APITestCase
from stripe.error import StripeError
from stripe.stripe_object import StripeObject

from apps.contributions.models import Contribution, ContributionInterval, Contributor
from apps.contributions.payment_managers import PaymentBadParamsError, PaymentProviderError
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.contributions.views import stripe_payment
from apps.organizations.models import Organization
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory


faker = Faker()

test_client_secret = "secret123"


class MockPaymentIntent(StripeObject):
    def __init__(self, *args, **kwargs):
        self.id = "test"
        self.client_secret = test_client_secret


class StripePaymentViewAbstract(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.revenue_program = RevenueProgramFactory(organization=self.organization)
        self.page = DonationPageFactory()
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
                "given_name": "Test",
                "family_name": "Tester",
                "amount": self.payment_amount,
                "reason": "Testing",
                "revenue_program_slug": rev_slug if rev_slug else self.revenue_program.slug,
                "donation_page_slug": page_slug if page_slug else self.page.slug,
                "interval": interval if interval else ContributionInterval.ONE_TIME,
                "payment_method_id": payment_method_id,
            },
            format="json",
        )

        request.META["HTTP_REFERER"] = self.referer
        request.META["HTTP_X_FORWARDED_FOR"] = self.ip

        return request

    def _post_valid_one_time_payment(self, **kwargs):
        return stripe_payment(self._create_request(**kwargs))


class StripeOneTimePaymentViewTest(StripePaymentViewAbstract):
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
class CreateStripeRecurringPaymentViewTest(StripePaymentViewAbstract):
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


class StripeOnboardingTest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create(email="user@test.com", password="testing")
        self.organization = Organization.objects.create(name="My Organization")
        self.organization.user_set.through.objects.create(organization=self.organization, user=self.user, is_owner=True)

        self.url = reverse("stripe-onboarding")

    @patch("stripe.Account.create", side_effect=MockStripeAccount)
    @patch("stripe.AccountLink.create", side_effect=MOCK_ACCOUNT_LINKS)
    def test_successful_onboarding(self, *args):
        """
        Test happy-path
        """
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url)
        # response should be 200, with test account link value
        self.assertContains(response, "test")
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.stripe_account_id, TEST_STRIPE_ACCOUNT_ID)

    @patch("stripe.Account.create", side_effect=StripeError)
    def test_stripe_error_returns_expected_message(self, *args):
        """
        If stripe.Account.create returns a StripeError, handle it with resposne.
        """
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["detail"], "There was a problem connecting to Stripe. Please try again.")


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
        self.organization = Organization.objects.create(name="My Organization")
        self.organization.user_set.add(self.user)
        self.url = reverse("stripe-confirmation")

    def post_to_confirmation(self, stripe_account_id="", stripe_verified=None, stripe_product_id=""):
        self.organization.stripe_account_id = stripe_account_id
        self.organization.stripe_verified = True if stripe_verified else False
        self.organization.stripe_product_id = stripe_product_id
        self.organization.save()
        self.organization.refresh_from_db()

        self.client.force_authenticate(user=self.user)
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
    def test_confirm_newly_verified(self, mock_account_retrieve, mock_product_create):
        """
        stripe_confirmation should set stripe_verified to True after confirming with Stripe.
        """
        self.assertFalse(self.organization.stripe_verified)
        response = self.post_to_confirmation(stripe_account_id="testing")
        self.organization.refresh_from_db()
        self.assertTrue(self.organization.stripe_verified)
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "connected")
        # Newly confirmed accounts should go ahead and create a default product on for that org.
        mock_product_create.assert_called_once()
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.stripe_product_id, TEST_STRIPE_PRODUCT_ID)

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountNotEnabled)
    def test_confirm_connected_not_verified(self, mock_account_retrieve, *args):
        """
        If an organization has connected its account with Hub (has a stripe_account_id), but
        their Stripe account is not ready to recieve payments, they're in a special state.
        """
        self.assertFalse(self.organization.stripe_verified)
        response = self.post_to_confirmation(stripe_account_id="testing")
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "restricted")
        # stripe_verified should still be false
        self.assertFalse(self.organization.stripe_verified)

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


class TestContributionsListView(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create(email="user@org1.com", password="testing")
        self.organization1 = Organization.objects.create(name="Organization 1")
        self.organization1.user_set.add(self.user)
        self.organization2 = Organization.objects.create(name="Organization 2")
        self.contributor = Contributor.objects.create(email="contributor@contributor.com")
        self.contributions_per_org_count = 50
        for i in range(self.contributions_per_org_count):
            Contribution.objects.create(
                amount=1000,
                interval=ContributionInterval.ONE_TIME[0],
                contributor=self.contributor,
                organization=self.organization1,
            )
            Contribution.objects.create(
                amount=2000,
                interval=ContributionInterval.ONE_TIME[0],
                contributor=self.contributor,
                organization=self.organization2,
            )

        self.url = reverse("contributions-list")

    def test_happy_path(self):
        """Should get back only contributions belonging to my org"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], self.contributions_per_org_count)


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
            api_key=TEST_STRIPE_API_KEY,
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
            api_key=TEST_STRIPE_API_KEY,
        )

        mock_modify.assert_called_once_with(
            self.subscription_id,
            default_payment_method=self.payment_method_id,
            stripe_account=self.stripe_account_id,
            api_key=TEST_STRIPE_API_KEY,
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
            api_key=TEST_STRIPE_API_KEY,
        )

        mock_modify.assert_called_once_with(
            self.subscription_id,
            default_payment_method=self.payment_method_id,
            stripe_account=self.stripe_account_id,
            api_key=TEST_STRIPE_API_KEY,
        )


@override_settings(STRIPE_TEST_SECRET_KEY=TEST_STRIPE_API_KEY)
class CancelRecurringPaymentTest(APITestCase):
    def setUp(self):
        self.subscription_id = "test-subscription-id"
        self.stripe_account_id = "testing-stripe-account-id"
        # self.customer_id = 'testing-customer-id'
        self.org = OrganizationFactory(stripe_account_id=self.stripe_account_id)
        self.contributor = ContributorFactory()
        self.contribution = ContributionFactory(
            contributor=self.contributor,
            organization=self.org,
            # provider_customer_id=self.customer_id,
            provider_subscription_id=self.subscription_id,
        )
        self.other_contribution = ContributionFactory(organization=self.org)
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

        mock_delete.assert_called_once_with(
            self.subscription_id, stripe_account=self.stripe_account_id, api_key=TEST_STRIPE_API_KEY
        )

    @patch("stripe.Subscription.delete")
    def test_delete_recurring_success(self, mock_delete):
        response = self._make_request(self.contribution)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Success")

        mock_delete.assert_called_once_with(
            self.subscription_id, stripe_account=self.stripe_account_id, api_key=TEST_STRIPE_API_KEY
        )
