import datetime

from django.conf import settings
from django.test import TestCase
from django.utils import timezone

import pytz
from addict import Dict as AttrDict
from pytest import raises
from rest_framework.serializers import ValidationError

from apps.contributions import serializers
from apps.contributions.models import ContributionInterval, ContributionStatus
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.contributions.utils import format_ambiguous_currency
from apps.organizations.tests.factories import (
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
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
        self.org = OrganizationFactory()
        payment_provider = PaymentProviderFactory(stripe_account_id=self.test_stripe_account_id)
        revenue_program = RevenueProgramFactory(organization=self.org, payment_provider=payment_provider)
        self.donation_page = DonationPageFactory(revenue_program=revenue_program)
        self.contribution = ContributionFactory()

    def _create_contribution(self, **kwargs):
        return ContributionFactory(donation_page=self.donation_page, **kwargs)

    def _create_contribution_without_donation_page(self, **kwargs):
        contribution = ContributionFactory(**kwargs)
        contribution.donation_page = None
        return contribution

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

    def test_get_stripe_id(self):
        contribution = self._create_contribution()
        data = self.serializer(contribution).data
        self.assertEqual(data["stripe_id"], self.test_stripe_account_id)
        contribution = self._create_contribution_without_donation_page()
        data = self.serializer(contribution).data
        self.assertEqual(data["stripe_id"], "")


class AbstractPaymentSerializerTest(TestCase):
    def setUp(self):
        self.serializer = serializers.AbstractPaymentSerializer
        self.revenue_program = RevenueProgramFactory()
        self.page = DonationPageFactory(revenue_program=self.revenue_program)
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
            "revenue_program_country": "ts",
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
        self.element["requiredFields"] = []
        self._add_element_to_page(self.element)
        self.assertNotIn("phone", self.element["requiredFields"])
        serializer = self.serializer(data=self.payment_data)
        self.assertTrue(serializer.is_valid())

    def test_amount_validation_min(self):
        self.payment_data["amount"] = serializers.REVENGINE_MIN_AMOUNT - 1
        serializer = self.serializer(data=self.payment_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("amount", serializer.errors)
        expected_msg = f"We can only accept contributions greater than or equal to {format_ambiguous_currency(serializers.REVENGINE_MIN_AMOUNT)}"
        self.assertEqual(str(serializer.errors["amount"][0]), expected_msg)

    def test_amount_validation_max(self):
        self.payment_data["amount"] = serializers.STRIPE_MAX_AMOUNT + 1
        serializer = self.serializer(data=self.payment_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("amount", serializer.errors)
        expected_msg = f"We can only accept contributions less than or equal to {format_ambiguous_currency(serializers.STRIPE_MAX_AMOUNT)}"
        self.assertEqual(str(serializer.errors["amount"][0]), expected_msg)


class ContributionMetadataSerializerTest(TestCase):
    def setUp(self):
        self.serializer = serializers.ContributionMetadataSerializer
        self.revenue_program = RevenueProgramFactory()
        self.page = DonationPageFactory(revenue_program=self.revenue_program)
        self.processor_mapping = serializers.ContributionMetadataSerializer.PROCESSOR_MAPPING
        self.all_fields = [k for k, v in self.processor_mapping.items() if v == self.serializer.ALL]
        self.payment_fields = [k for k, v in self.processor_mapping.items() if v == self.serializer.PAYMENT]
        self.customer_fields = [k for k, v in self.processor_mapping.items() if v == self.serializer.CUSTOMER]
        self.payment_data = {
            "amount": 123,
            "donor_selected_amount": 123,
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
            "phone": "9195555555",
            "revenue_program_country": "ts",
            "referer": "https://test.test",
            "revenue_program_slug": self.revenue_program.slug,
            "page_id": self.page.pk,
            "contributor_id": 1,
            "revenue_program_id": self.revenue_program.pk,
            "reason_for_giving": "Extortion",
            "honoree": "test honoree",
            "in_memory_of": "test in memory of",
            "sf_campaign_id": "TEST123",
            "comp_subscription": True,
            "swag_choice_T Shirt": "sm",
        }

    def test_bundle_metadata_validation_error_when_is_valid_not_called(self):
        serializer = self.serializer(data=self.payment_data)
        # The serializer depends on DRFs serializers.Serializer class's assertions about calling self.data.
        self.assertRaises(AssertionError, serializer.bundle_metadata, self.serializer.ALL)

    def test_bundle_metadata_CUSTOMER(self):
        serializer = self.serializer(data=self.payment_data)
        self.assertTrue(serializer.is_valid())
        metadata = serializer.bundle_metadata(self.serializer.CUSTOMER)
        self.assertTrue(all(k in metadata.keys() for k in self.all_fields))
        self.assertTrue(all(k in metadata.keys() for k in self.customer_fields))

    def test_bundle_metadata_PAYMENT_INTENT(self):
        serializer = self.serializer(data=self.payment_data)
        self.assertTrue(serializer.is_valid())
        metadata = serializer.bundle_metadata(self.serializer.PAYMENT)
        self.assertTrue(all(k in metadata.keys() for k in self.all_fields))
        self.assertTrue(all(k in metadata.keys() for k in self.payment_fields))

    def test_bundle_metadata_SUBSCRIPTION(self):
        serializer = self.serializer(data=self.payment_data)
        self.assertTrue(serializer.is_valid())
        metadata = serializer.bundle_metadata(self.serializer.PAYMENT)
        self.assertTrue(all(k in metadata.keys() for k in self.all_fields))
        self.assertTrue(all(k in metadata.keys() for k in self.payment_fields))

    def test_bundle_metadata_ignores_blank_metadata(self):
        serializer_without_blank = self.serializer(data=self.payment_data)
        self.assertTrue(serializer_without_blank.is_valid())

        # First, verify that "reason_for_giving" is in the metadata if it's not blank
        metadata = serializer_without_blank.bundle_metadata(self.serializer.PAYMENT)
        self.assertIn("reason_for_giving", metadata)
        self.assertEqual(metadata["reason_for_giving"], self.payment_data["reason_for_giving"])

        # Next, ensure that blank fields do not get added to metadata
        self.payment_data["reason_for_giving"] = ""
        serializer_with_blank = self.serializer(data=self.payment_data)
        self.assertTrue(serializer_with_blank.is_valid())
        metadata = serializer_with_blank.bundle_metadata(self.serializer.PAYMENT)
        self.assertNotIn("reason_for_giving", metadata)

    def test_validate_reason_for_giving(self):
        # If reason_for_giving is "Other" and "reason_other" is present, it passes
        self.payment_data["reason_for_giving"] = "Other"
        self.payment_data["reason_other"] = "Testing"
        serializer = self.serializer(data=self.payment_data)
        self.assertTrue(serializer.is_valid())

        # If it's empty, raise validation error
        self.payment_data["reason_for_giving"] = "Other"
        self.payment_data["reason_other"] = ""
        bad_serializer = self.serializer(data=self.payment_data)
        self.assertFalse(bad_serializer.is_valid())

    def test_validate_tribute_honoree(self):
        self.payment_data["tribute_type"] = "type_honoree"
        self.payment_data["honoree"] = ""
        serializer = self.serializer(data=self.payment_data)
        self.assertFalse(serializer.is_valid())

        self.payment_data["honoree"] = "Testing"
        good_serializer = self.serializer(data=self.payment_data)
        self.assertTrue(good_serializer.is_valid())

    def test_validate_tribute_in_memory_of(self):
        self.payment_data["tribute_type"] = "type_in_memory_of"
        self.payment_data["in_memory_of"] = ""
        serializer = self.serializer(data=self.payment_data)
        self.assertFalse(serializer.is_valid())

        self.payment_data["in_memory_of"] = "Testing"
        good_serializer = self.serializer(data=self.payment_data)
        self.assertTrue(good_serializer.is_valid())

    def test_swag_data(self):
        data = self.payment_data
        # comp_subscription = True should results in comp_subscription = "nyt" for now.
        data["comp_subscription"] = True
        serializer = self.serializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.data["comp_subscription"], "nyt")

        # t_shirt_size stores the swag option chosen, with swag-name + swag-option
        data = self.payment_data
        data["swag_choice_T Shirt"] = "xxl"
        expected_value = "T Shirt -- xxl"
        serializer = self.serializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.data["t_shirt_size"], expected_value)

    def test_validate_secondary_metadata_fails_when_called_out_of_order(self):
        serializer = self.serializer(data=self.payment_data)
        with self.assertRaises(AssertionError) as a_error:
            serializer.validate_secondary_metadata(self.payment_data)
        self.assertEqual(
            str(a_error.exception), "Cannot call `.validate_secondary_metadata()` without first calling `.is_valid()`"
        )

    def test_validate_secondary_metadata_fails_when_no_contributor_id(self):
        del self.payment_data["contributor_id"]
        serializer = self.serializer(data=self.payment_data)
        self.assertTrue(serializer.is_valid())

        self.assertNotIn("contributor_id", self.payment_data)
        self.assertRaises(ValidationError, serializer.validate_secondary_metadata, self.payment_data)

    def test_validate_secondary_metadata_succeeds_when_contributor_id_present(self):
        serializer = self.serializer(data=self.payment_data)
        self.assertTrue(serializer.is_valid())

        self.assertIn("contributor_id", self.payment_data)
        self.assertTrue(serializer.validate_secondary_metadata(self.payment_data))


class SubscriptionsSerializer(TestCase):
    expected_fields = [
        "id",
        "is_modifiable",
        "is_cancelable",
        "status",
        "card_brand",
        "last4",
        "payment_type",
        "next_payment_date",
        "interval",
        "revenue_program_slug",
        "amount",
        "customer_id",
        "credit_card_expiration_date",
        "created",
        "last_payment_date",
    ]

    def setUp(self):
        self.serializer = serializers.SubscriptionsSerializer
        self.subscription = AttrDict(
            {
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
        )

    def test_returned_fields(self):
        data = self.serializer(self.subscription).data
        for field in self.expected_fields:
            self.assertIn(field, data)

    def test_card_brand(self):
        data = self.serializer(self.subscription).data
        assert data["card_brand"] == "discover"

    def test_next_payment_date(self):
        data = self.serializer(self.subscription).data
        assert data["next_payment_date"] == datetime.datetime(2022, 6, 10, 20, 21, 42, tzinfo=pytz.utc)

    def test_last_payment_date(self):
        data = self.serializer(self.subscription).data
        assert data["last_payment_date"] == datetime.datetime(2023, 6, 10, 20, 21, 42, tzinfo=pytz.utc)

    def test_created(self):
        data = self.serializer(self.subscription).data
        assert data["created"] == datetime.datetime(2022, 6, 10, 20, 21, 42, tzinfo=pytz.utc)

    def test_last4(self):
        data = self.serializer(self.subscription).data
        assert data["last4"] == "7834"

    def test_card_expiration_date(self):
        data = self.serializer(self.subscription).data
        assert data["credit_card_expiration_date"] == "12/2022"

    def test_is_modifiable(self):
        data = self.serializer(self.subscription).data
        assert data["is_modifiable"] is True
        self.subscription.status = "unpaid"
        data = self.serializer(self.subscription).data
        assert data["is_modifiable"] is False

    def test_is_cancelable(self):
        data = self.serializer(self.subscription).data
        assert data["is_cancelable"] is False
        self.subscription.status = "active"
        data = self.serializer(self.subscription).data
        assert data["is_cancelable"] is True

    def test_interval(self):
        data = self.serializer(self.subscription).data
        assert data["interval"] == ContributionInterval.MONTHLY
        self.subscription.plan.interval = "year"
        self.subscription.plan.interval_count = 1
        data = self.serializer(self.subscription).data
        assert data["interval"] == ContributionInterval.YEARLY
        with raises(ValidationError):
            self.subscription.plan.interval_count = 2
            data = self.serializer(self.subscription).data

    def test_revenue_program_slug(self):
        data = self.serializer(self.subscription).data
        assert data["revenue_program_slug"] == "foo"
        with raises(ValidationError):
            del self.subscription.metadata
            data = self.serializer(self.subscription).data

    def test_amount(self):
        data = self.serializer(self.subscription).data
        assert data["amount"] == 1234

    def test_customer_id(self):
        data = self.serializer(self.subscription).data
        assert data["customer_id"] == "cus_1234"

    def test_payment_type(self):
        data = self.serializer(self.subscription).data
        assert data["payment_type"] == "card"
