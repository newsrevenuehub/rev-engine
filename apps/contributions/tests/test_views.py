from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse

from faker import Faker
from rest_framework.test import APIRequestFactory, APITestCase
from stripe.error import StripeError
from stripe.stripe_object import StripeObject

from apps.contributions.models import Contribution, Contributor
from apps.contributions.tests.factories import ContributorFactory
from apps.contributions.views import stripe_payment_intent
from apps.organizations.models import Organization
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory


faker = Faker()


class MockPaymentIntent(StripeObject):
    def __init__(self, *args, **kwargs):
        self.id = "test"
        self.client_secret = "secret123"


@patch("stripe.PaymentIntent.create", side_effect=MockPaymentIntent)
class CreateStripePaymentIntentViewTest(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.revenue_program = RevenueProgramFactory(organization=self.organization)
        self.page = DonationPageFactory()
        self.contributor = ContributorFactory()

        self.url = reverse("stripe-one-time-payment")
        self.payment_amount = "10.00"

        self.ip = faker.ipv4()
        self.referer = faker.url()

    def _create_request(self, email=None, rev_slug=None, page_slug=None):
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
                "payment_type": "single",
            },
            format="json",
        )

        request.META["HTTP_REFERER"] = self.referer
        request.META["HTTP_X_FORWARDED_FOR"] = self.ip

        return request

    def _post_valid_payment_intent(self, *args, **kwargs):
        return stripe_payment_intent(self._create_request(*args, **kwargs))

    def test_new_contributor_created(self, mock_create_intent):
        new_contributor_email = "new_contributor@test.com"
        response = self._post_valid_payment_intent(email=new_contributor_email)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["clientSecret"], "secret123")
        new_contributer = Contributor.objects.get(email=new_contributor_email)
        self.assertIsNotNone(new_contributer)
        self.assertTrue(Contribution.objects.filter(contributor=new_contributer).exists())
        mock_create_intent.assert_called_once()

    def test_payment_intent_serializer_validates(self, *args):
        # Email is required
        response = self._post_valid_payment_intent(email=None)
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)
        self.assertEqual(str(response.data["email"][0]), "This field may not be null.")


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


class StripeConfirmTest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create(email="user@test.com", password="testing")
        self.organization = Organization.objects.create(name="My Organization")
        self.organization.user_set.add(self.user)
        self.url = reverse("stripe-confirmation")

    def post_to_confirmation(self, stripe_account_id=None, stripe_verified=None):
        org_modified = False
        if stripe_account_id:
            self.organization.stripe_account_id = stripe_account_id
            org_modified = True
        if stripe_verified is not None:
            self.organization.stripe_verified = True
            org_modified = True
        if org_modified:
            self.organization.save()
            self.organization.refresh_from_db()

        self.client.force_authenticate(user=self.user)
        return self.client.post(self.url)

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_confirm_already_verified(self, mock_account_retrieve):
        """
        stripe_confirmation should return early if the org already has stripe_verified=True.
        """
        response = self.post_to_confirmation(stripe_verified=True, stripe_account_id="testing")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "connected")
        # this should bail early, before Account.retrieve is called
        mock_account_retrieve.assert_not_called()

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_confirm_newly_verified(self, mock_account_retrieve):
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

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountNotEnabled)
    def test_confirm_connected_not_verified(self, mock_account_retrieve):
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
    def test_not_connected(self, mock_account_retrieve):
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
    def test_stripe_error_is_caught(self, mock_account_retrieve):
        """
        When stripe.Account.retrieve raises a StripeError, send it in response.
        """
        response = self.post_to_confirmation(stripe_account_id="testing")
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["status"], "failed")
