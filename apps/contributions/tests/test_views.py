from unittest.mock import patch

from django.urls import reverse

from rest_framework.test import APITestCase
from stripe.stripe_object import StripeObject

from apps.contributions.models import Contribution, Contributor
from apps.contributions.tests.factories import ContributorFactory
from apps.contributions.views import convert_money_value_to_stripe_payment_amount
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
                "contributor_email": contributor_email
                if contributor_email
                else self.contributor.email,
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
        self.assertEqual(
            convert_money_value_to_stripe_payment_amount(self.payment_amount), contribution.amount
        )

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
        self.assertEqual(
            response.data["org_slug"][0], 'Could not find Organization from slug "bad_slug"'
        )

    def test_no_page_found(self, *args):
        response = self._post_valid_payment_intent(page_slug="bad_slug")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["page_slug"][0], 'Could not find DonationPage from slug "bad_slug"'
        )
