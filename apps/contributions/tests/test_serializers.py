# apps/contributions/serializers.py    1-15

from django.conf import settings
from django.test import TestCase
from django.utils import timezone

from rest_framework.serializers import ValidationError

from apps.contributions import serializers
from apps.contributions.models import ContributionStatus
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.organizations.tests.factories import OrganizationFactory
from apps.pages.tests.factories import DonationPageFactory


class ContributionSerializer(TestCase):
    expected_fields = [
        "id",
        "contributor_email",
        "created",
        "amount",
        "currency",
        "interval",
        "last_payment_date",
        "bad_actor_score",
        "flagged_date",
        "auto_accepted_on",
        "status",
    ]

    def setUp(self):
        self.serializer = serializers.ContributionSerializer
        self.contributor = ContributorFactory()
        self.contribution = ContributionFactory(
            amount=1000, contributor=self.contributor, payment_provider_used="Stripe"
        )

    def test_returned_fields(self):
        data = self.serializer(self.contribution).data
        for field in self.expected_fields:
            self.assertIn(field, data)

    def test_get_auto_accepted_on(self):
        # Should return null if empty
        self.contribution.flagged_date = None
        self.contribution.save()
        old_data = self.serializer(self.contribution).data
        self.assertIsNone(old_data["auto_accepted_on"])
        # Should return a datetime equal to flagged_date + "FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA" setting
        self.contribution.flagged_date = timezone.now()
        self.contribution.save()
        target_date = self.contribution.flagged_date + settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA
        new_data = self.serializer(self.contribution).data
        self.assertEqual(new_data["auto_accepted_on"], target_date)

    def test_get_formatted_payment_provider_used(self):
        data = self.serializer(self.contribution).data
        self.assertEqual(data["formatted_payment_provider_used"], "Stripe")

    def test_contributor_email(self):
        data = self.serializer(self.contribution).data
        self.assertEqual(data["contributor_email"], self.contributor.email)

    def test_get_provider_payment_url(self):
        my_provider_payment_id = "my_provider_payment_id"
        self.contribution.provider_payment_id = my_provider_payment_id
        self.contribution.save()

        data = self.serializer(self.contribution).data
        self.assertIn(my_provider_payment_id, data["provider_payment_url"])

    def test_get_provider_subscription_url(self):
        my_provider_subscription_id = "my_provider_subscription_id"
        self.contribution.provider_subscription_id = my_provider_subscription_id
        self.contribution.save()

        data = self.serializer(self.contribution).data
        self.assertIn(my_provider_subscription_id, data["provider_subscription_url"])

    def test_get_provider_customer_url(self):
        my_provider_customer_id = "my_provider_customer_id"
        self.contribution.provider_customer_id = my_provider_customer_id
        self.contribution.save()

        data = self.serializer(self.contribution).data
        self.assertIn(my_provider_customer_id, data["provider_customer_url"])


class ContributorContributionSerializerTest(TestCase):
    def setUp(self):
        self.serializer = serializers.ContributorContributionSerializer
        self.test_stripe_account_id = "testing_123"
        self.org = OrganizationFactory(stripe_account_id=self.test_stripe_account_id)
        self.contribution = ContributionFactory()

    def _create_contribution(self, **kwargs):
        return ContributionFactory(organization=self.org, **kwargs)

    def test_status_resolved_to_public_value(self):
        failed_cont = self._create_contribution(status=ContributionStatus.FAILED)
        flagged_cont = self._create_contribution(status=ContributionStatus.FLAGGED)
        rejected_cont = self._create_contribution(status=ContributionStatus.REJECTED)
        processing_cont = self._create_contribution(status=ContributionStatus.PROCESSING)
        paid_cont = self._create_contribution(status=ContributionStatus.PAID)
        canceled_cont = self._create_contribution(status=ContributionStatus.CANCELED)

        failed_data = self.serializer(failed_cont).data
        flagged_data = self.serializer(flagged_cont).data
        rejected_data = self.serializer(rejected_cont).data

        # These three shoudl resolve to "failed", for end-user facing content
        for data in [failed_data, flagged_data, rejected_data]:
            self.assertEqual(data["status"], ContributionStatus.FAILED)

        # The rest are fine as they are.
        processing_data = self.serializer(processing_cont).data
        self.assertEqual(processing_data["status"], ContributionStatus.PROCESSING)
        paid_data = self.serializer(paid_cont).data
        self.assertEqual(paid_data["status"], ContributionStatus.PAID)
        canceled_data = self.serializer(canceled_cont).data
        self.assertEqual(canceled_data["status"], ContributionStatus.CANCELED)

    def test_get_card_brand(self):
        target_brand = "visa"
        contribution = self._create_contribution(
            provider_payment_method_details={"card": {"last4": 1234, "brand": target_brand}}
        )
        data = self.serializer(contribution).data
        self.assertEqual(data["card_brand"], target_brand)

    def test_get_last4(self):
        target_last4 = 4444
        contribution = self._create_contribution(
            provider_payment_method_details={"card": {"brand": "fakeso", "last4": target_last4}}
        )
        data = self.serializer(contribution).data
        self.assertEqual(data["last4"], target_last4)

    def test_get_org_stripe_id(self):
        contribution = self._create_contribution()
        data = self.serializer(contribution).data
        self.assertEqual(data["org_stripe_id"], self.test_stripe_account_id)


class AbstractPaymentSerializerTest(TestCase):
    def setUp(self):
        self.payment_data = {}
        self.serializer = serializers.AbstractPaymentSerializer
        self.page = DonationPageFactory()
        self.element = {"type": "Testing", "uuid": "testing-123", "requiredFields": [], "content": {}}

        self.payment_data = {
            "amount": 123,
            "currency": "USD",
            "email": "test@test.com",
            "first_name": "test",
            "last_name": "test",
            "ip": "127.0.0.1",
            "mailing_city": "test",
            "mailing_country": "test",
            "mailing_postal_code": "12345",
            "mailing_state": "test",
            "mailing_street": "test",
            "organization_country": "ts",
            "referer": "https://test.test",
            "revenue_program_slug": "test",
            "page_id": self.page.pk,
        }

    def _add_element_to_page(self, element):
        self.page.elements = [element]
        self.page.save()

    def test_validates_page_element_if_conditionally_required(self):
        """
        Any input within any element of page.elements might be required to submit a payment. AbstractPaymentSerializer is responsible for enforcing this requirement and does so by updating the serializer field definition in __init__ based on page.elements content.
        """
        req_field = "phone"
        self.element["requiredFields"].append(req_field)
        self._add_element_to_page(self.element)
        serializer = self.serializer(data=self.payment_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("phone", serializer.errors)
        self.assertEqual(serializer.errors["phone"][0].code, "required")

    def test_validates_page_element_if_conditionally_not_required(self):
        self.assertNotIn("phone", self.element["requiredFields"])
        serializer = self.serializer(data=self.payment_data)
        self.assertTrue(serializer.is_valid())
