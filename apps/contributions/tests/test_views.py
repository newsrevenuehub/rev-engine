import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework.test import APITestCase
from stripe.error import StripeError
from stripe.stripe_object import StripeObject

from apps.contributions.models import Contribution, Contributor
from apps.contributions.tests.factories import ContributorFactory
from apps.contributions.views import convert_money_value_to_stripe_payment_amount
from apps.organizations.models import Organization
from apps.organizations.tests.factories import OrganizationFactory
from apps.pages.tests.factories import DonationPageFactory


class MockPaymentIntent(StripeObject):
    def __init__(self, *args, **kwargs):
        self.id = "test"
        self.client_secret = "secret123"


@patch("stripe.PaymentIntent.create", side_effect=MockPaymentIntent)
class CreateStripePaymentIntentViewTest(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.page = DonationPageFactory()
        self.contributor = ContributorFactory()

        self.url = reverse("stripe-payment-intent")
        self.payment_amount = "10.00"

    def _post_valid_payment_intent(self, contributor_email=None, org_slug=None, page_slug=None):
        return self.client.post(
            self.url,
            {
                "payment_amount": self.payment_amount,
                "org_slug": org_slug if org_slug else self.organization.slug,
                "page_slug": page_slug if page_slug else self.page.slug,
                "contributor_email": contributor_email if contributor_email else self.contributor.email,
            },
        )

    def test_new_contributor_created(self, *args):
        new_contributor_email = "new_contributor@test.com"
        response = self._post_valid_payment_intent(contributor_email=new_contributor_email)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["clientSecret"], "secret123")
        new_contributer = Contributor.objects.get(email=new_contributor_email)
        self.assertIsNotNone(new_contributer)
        self.assertTrue(Contribution.objects.filter(contributor=new_contributer).exists())

    def test_existing_contributor_on_new_contribution(self, *args):
        response = self._post_valid_payment_intent()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Contribution.objects.filter(contributor=self.contributor).exists())

    def test_default_payment_state(self, *args):
        response = self._post_valid_payment_intent()
        contribution = Contribution.objects.first()
        self.assertEqual(contribution.payment_state, Contribution.PROCESSING[0])

    def test_payment_amount(self, *args):
        response = self._post_valid_payment_intent()
        contribution = Contribution.objects.first()
        self.assertEqual(convert_money_value_to_stripe_payment_amount(self.payment_amount), contribution.amount)

    def test_correct_organization_is_associated(self, *args):
        response = self._post_valid_payment_intent()
        contribution = Contribution.objects.first()
        self.assertEqual(contribution.organization, self.organization)

    def test_correct_donationpage_is_associated(self, *args):
        response = self._post_valid_payment_intent()
        contribution = Contribution.objects.first()
        self.assertEqual(contribution.donation_page, self.page)

    def test_no_org_found(self, *args):
        response = self._post_valid_payment_intent(org_slug="bad_slug")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["org_slug"][0], 'Could not find Organization from slug "bad_slug"')

    def test_no_page_found(self, *args):
        response = self._post_valid_payment_intent(page_slug="bad_slug")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["page_slug"][0], 'Could not find DonationPage from slug "bad_slug"')


test_stripe_account_id = "testing_123"


class MockStripeAccount(StripeObject):
    def __init__(self, *args, **kwargs):
        self.id = test_stripe_account_id


mock_account_links = {"test": "test"}

# 75, 89-126


class StripeOnboardingTest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create(email="user@test.com", password="testing")
        self.organization = Organization.objects.create(name="My Organization")
        self.organization.user_set.through.objects.create(organization=self.organization, user=self.user, is_owner=True)

        self.url = reverse("stripe-onboarding")

    @patch("stripe.Account.create", side_effect=MockStripeAccount)
    @patch("stripe.AccountLink.create", side_effect=mock_account_links)
    def test_successful_onboarding(self, *args):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url)
        # response shoudl be 200, with test account link value
        self.assertContains(response, "test")
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.stripe_account_id, test_stripe_account_id)

    @patch("stripe.Account.create", side_effect=StripeError)
    def test_stripe_error_returns_expected_message(self, *args):
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


# 122-166
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
        response = self.post_to_confirmation(stripe_verified=True, stripe_account_id="testing")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "connected")
        # this should bail early, before Account.retrieve is called
        mock_account_retrieve.assert_not_called()

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_confirm_newly_verified(self, mock_account_retrieve):
        self.assertFalse(self.organization.stripe_verified)
        response = self.post_to_confirmation(stripe_account_id="testing")
        self.organization.refresh_from_db()
        self.assertTrue(self.organization.stripe_verified)
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "connected")

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountNotEnabled)
    def test_confirm_connected_not_verified(self, mock_account_retrieve):
        self.assertFalse(self.organization.stripe_verified)
        response = self.post_to_confirmation(stripe_account_id="testing")
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "restricted")
        # stripe_verified should still be false
        self.assertFalse(self.organization.stripe_verified)

    @patch("stripe.Account.retrieve", side_effect=MockStripeAccountEnabled)
    def test_not_connected(self, mock_account_retrieve):
        response = self.post_to_confirmation()

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "not_connected")
        # this should bail early, before Account.retrieve is called
        mock_account_retrieve.assert_not_called()

    @patch("stripe.Account.retrieve", side_effect=StripeError)
    def test_stripe_error_is_caught(self, mock_account_retrieve):
        response = self.post_to_confirmation(stripe_account_id="testing")
        mock_account_retrieve.assert_called_once()
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["status"], "failed")
