from django.conf import settings
from django.test import TestCase
from django.utils import timezone

from apps.contributions import serializers
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.contributions.utils import format_ambiguous_currency
from apps.organizations.tests.factories import RevenueProgramFactory
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


class TestBaseCreatePaymentSerializer:
    def setUp(self):
        pass

    def test_validate_reason_for_giving(self):
        # parametrize with:
        # reason is other, reason_other is none
        # reason is other, reason_other is empty string
        # reason is other, reason_other non empty
        # reason is not other, reason other is none
        pass

    def test_validate_honoree(self):
        # parametrize with:
        # tribute_type is "type_honoree", honoree is None
        # tribute_type is "type_honoree", honoree is empty
        # tribute_type is "type_honoree", honoree is non empty
        # tribute_type is not "type_honoree"
        pass

    def test_validate_in_memory_of(self):
        # parametrize with:
        # tribute_type is "type_in_memory_of", in_meory_of is None
        # tribute_type is "type_in_memory_of", in_meory_of is empty
        # tribute_type is "type_in_memory_of", in_meory_of is non empty
        # tribute_type is not "type_in_memory_of"
        pass

    def test_validate_handles_conditionally_required_elements(self):
        # TBD parametrization
        pass

    def test_validate_resolves_reason_for_giving(self):
        # parametrize with
        # reason_for_giving is Other and reason_other
        # reason_for_giving is not other
        pass

    def test_get_bad_actor_score_happy_path(self):
        pass

    def test_get_bad_actor_when_data_invalid(self):
        pass

    def test_get_bad_actor_when_bad_actor_api_error(self):
        pass

    def test_should_flag(self):
        # parametrize with
        # bad_actor score below threshold
        # bad actor score at threshold
        # bad actor score above threshold
        pass

    def test_get_stripe_payment_metadata_happy_path(self):
        pass

    def test_create_stripe_customer(self):
        # just prove it calls Contributor.create_stripe_customer with expected vals
        # as this is tested elsewhere in depth
        pass

    def test_create_contribution_happy_path(self):
        pass

    def test_create_contribution_when_should_flag(self):
        pass

    def test_create_contribution_when_no_bad_actor_response(self):
        pass


class TestCreateOneTimePaymentSerializer:
    def setUp(self):
        pass

    def test_happy_path(self):
        pass

    def test_when_stripe_errors_creating_payment_intent(self):
        pass

    def test_when_stripe_errors_creating_customer(self):
        # NOTE: need to wrap that block in try/except
        pass

    def test_when_contribution_is_flagged(self):
        pass


class TestCreateRecurringPaymentSerializer:
    def setUp(self):
        pass

    def test_happy_path(self):
        # parametrize month vs. year?
        pass

    def test_when_stripe_errors_creating_payment_intent(self):
        pass

    def test_when_stripe_errors_creating_customer(self):
        # NOTE: need to wrap that block in try/except
        pass

    def test_when_contribution_is_flagged(self):
        pass
