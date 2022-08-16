from datetime import datetime
from unittest.mock import PropertyMock, patch

from django.test import TestCase

import stripe

from apps.contributions.models import ContributionInterval, ContributionStatus
from apps.contributions.serializers import PaymentProviderContributionSerializer
from apps.contributions.stripe_contributions_provider import (
    ContributionsCacheProvider,
    InvalidIntervalError,
    InvalidMetadataError,
    StripeCharge,
    StripeContributionsProvider,
)
from apps.contributions.tests import RedisMock


class AbstractTestStripeContributions(TestCase):
    def _setup_stripe_customers(self):
        self.customers = [
            stripe.Customer.construct_from({"id": "cust_1"}, key="test"),
            stripe.Customer.construct_from({"id": "cust_2"}, key="test"),
            stripe.Customer.construct_from({"id": "cust_3"}, key="test"),
        ]

    def _setup_stripe_charges(self):
        charge_1 = {
            "id": "charge_1",
            "amount": 2000,
            "customer": "customer_1",
            "status": "succeeded",
            "created": 1656915040,
        }

        charge_1_1 = {
            "id": "charge_1",
            "amount": 4000,
            "customer": "customer_3",
            "status": "succeeded",
            "created": 1656915040,
        }

        charge_2 = {
            "id": "charge_2",
            "amount": 2000,
            "customer": "customer_2",
            "status": "succeeded",
            "created": 1656915040,
        }

        charge_3 = {
            "id": "charge_3",
            "amount": 2000,
            "customer": "customer_3",
            "status": "succeeded",
            "created": 1656915040,
        }

        metadata = {"metadata": {"revenue_program_slug": "testrp"}}
        metadata_1 = {"metadata": {}}
        payment_method_details = {
            "payment_method_details": {
                "card": {"brand": "visa", "last4": "1234", "exp_month": 1, "exp_year": 2023},
                "type": "card",
            }
        }
        payment_method_details_without_card = {"payment_method_details": {}}
        payment_method_details_with_null_card = {"payment_method_details": {"card": None}}
        line_item = {"plan": {"interval": "year", "interval_count": 1}}
        invoice = {
            "invoice": {
                "id": "invoice_1",
                "status_transitions": {"paid_at": 1656915047},
                "lines": {"data": [line_item]},
                "next_payment_attempt": 1656915047,
            }
        }
        invoice_without_line_item = {
            "invoice": {
                "id": "invoice_1",
                "status_transitions": {"paid_at": 1656915047},
                "lines": {"data": None},
                "next_payment_attempt": 1656915047,
            }
        }
        self.charge_without_invoice = stripe.Charge.construct_from(
            charge_1 | metadata | {"invoice": None} | payment_method_details, "TEST-KEY"
        )
        self.charge_without_metadata = stripe.Charge.construct_from(
            charge_1 | invoice | payment_method_details, "TEST-KEY"
        )
        self.charge_without_revenue_program = stripe.Charge.construct_from(
            charge_1 | invoice | payment_method_details | metadata_1, "TEST-KEY"
        )
        self.charge_without_invoice_line_item = stripe.Charge.construct_from(
            charge_1 | invoice_without_line_item | payment_method_details | metadata_1, "TEST-KEY"
        )
        self.charge_without_card = stripe.Charge.construct_from(
            charge_1 | invoice_without_line_item | payment_method_details_without_card | metadata_1, "TEST-KEY"
        )
        self.charge_with_null_card = stripe.Charge.construct_from(
            charge_1 | invoice_without_line_item | payment_method_details_with_null_card | metadata_1, "TEST-KEY"
        )
        self.charge_1 = stripe.Charge.construct_from(charge_1 | metadata | invoice | payment_method_details, "TEST-KEY")
        self.charge_1_1 = stripe.Charge.construct_from(
            charge_1_1 | metadata | invoice | payment_method_details, "TEST-KEY"
        )
        self.charge_2 = stripe.Charge.construct_from(charge_2 | metadata | invoice | payment_method_details, "TEST-KEY")
        self.charge_3 = stripe.Charge.construct_from(charge_3 | metadata | invoice | payment_method_details, "TEST-KEY")

    def _setup_stripe_contributions(self):
        self.contributions_1 = [
            self.charge_1,
            self.charge_without_invoice,
            self.charge_without_metadata,
            self.charge_without_revenue_program,
        ]

        self.contributions_2 = [self.charge_2, self.charge_3]

    def _setup_stripe_customer_ids(self, count):
        self.customer_ids = [f"cust_{i}" for i in range(count)]


class TestStripeCharge(AbstractTestStripeContributions):
    def setUp(self):
        super().setUp()
        self._setup_stripe_charges()

    def test_stripe_charge_without_invoice(self):
        stripe_charge = StripeCharge(self.charge_without_invoice)
        self.assertEqual(stripe_charge.interval, ContributionInterval.ONE_TIME)
        assert stripe_charge.invoice_line_item == [{}]
        assert stripe_charge.next_payment_date is None

    def test_stripe_charge_without_invoice_line_item(self):
        stripe_charge = StripeCharge(self.charge_without_invoice_line_item)
        assert stripe_charge.invoice_line_item == {}

    def test_stripe_charge_with_invalid_metadata(self):
        with self.assertRaises(InvalidMetadataError):
            StripeCharge(self.charge_without_metadata).revenue_program
        with self.assertRaises(InvalidMetadataError):
            StripeCharge(self.charge_without_revenue_program).revenue_program

    def test_stripe_charge_without_card(self):
        charge = StripeCharge(self.charge_without_card)
        self.assertIsNone(charge.card_brand)
        self.assertIsNone(charge.last4)
        self.assertIsNone(charge.credit_card_expiration_date)

    def test_stripe_charge_with_null_card(self):
        charge = StripeCharge(self.charge_with_null_card)
        self.assertIsNone(charge.card_brand)
        self.assertIsNone(charge.last4)
        self.assertIsNone(charge.credit_card_expiration_date)

    def test_stripe_charge_with_valid_data(self):
        stripe_charge = StripeCharge(self.charge_1)
        self.assertEqual(stripe_charge.interval, ContributionInterval.YEARLY)
        self.assertEqual(stripe_charge.revenue_program, "testrp")
        self.assertEqual(stripe_charge.card_brand, "visa")
        self.assertEqual(stripe_charge.last4, "1234")
        self.assertEqual(stripe_charge.amount, 2000)
        self.assertEqual(stripe_charge.created, datetime(2022, 7, 4, 6, 10, 40))
        self.assertEqual(stripe_charge.provider_customer_id, "customer_1")
        self.assertEqual(stripe_charge.last_payment_date, datetime(2022, 7, 4, 6, 10, 47))
        self.assertEqual(stripe_charge.status, ContributionStatus.PAID)
        self.assertEqual(stripe_charge.credit_card_expiration_date, "1/2023")
        self.assertEqual(stripe_charge.payment_type, "card")
        self.assertEqual(stripe_charge.next_payment_date, datetime(2022, 7, 4, 6, 10, 47))
        self.assertEqual(stripe_charge.refunded, False)
        self.assertEqual(stripe_charge.id, "charge_1")

        self.charge_1["invoice"]["lines"]["data"][0]["plan"]["interval"] = "month"
        stripe_charge = StripeCharge(self.charge_1)
        self.assertEqual(stripe_charge.interval, ContributionInterval.MONTHLY)

        self.charge_1["invoice"]["lines"]["data"][0]["plan"]["interval"] = "day"
        with self.assertRaises(InvalidIntervalError):
            StripeCharge(self.charge_1).interval

        self.charge_1["status"] = "no status"
        self.assertEqual(StripeCharge(self.charge_1).status, ContributionStatus.FAILED)

        self.charge_1["status"] = "pending"
        self.assertEqual(StripeCharge(self.charge_1).status, ContributionStatus.PROCESSING)

        self.charge_1["amount_refunded"] = 0.5
        self.assertEqual(StripeCharge(self.charge_1).status, ContributionStatus.REFUNDED)

        self.charge_1["refunded"] = True
        self.assertEqual(StripeCharge(self.charge_1).status, ContributionStatus.REFUNDED)


class TestStripeContributionsProvider(AbstractTestStripeContributions):
    def setUp(self):
        super().setUp()
        self._setup_stripe_customers()
        self._setup_stripe_customer_ids(10)
        self.expected_customer_ids = [
            "customer:'cust_0' OR customer:'cust_1'",
            "customer:'cust_2' OR customer:'cust_3'",
            "customer:'cust_4' OR customer:'cust_5'",
            "customer:'cust_6' OR customer:'cust_7'",
            "customer:'cust_8' OR customer:'cust_9'",
        ]

    @patch(
        "apps.contributions.stripe_contributions_provider.StripeContributionsProvider.customers",
        new_callable=PropertyMock,
    )
    @patch("apps.contributions.stripe_contributions_provider.MAX_STRIPE_CUSTOMERS_LIMIT", 2)
    def test_generate_chunked_customers_query(self, customers_mock):
        customers_mock.return_value = self.customer_ids
        provider = StripeContributionsProvider("test@email.com", "acc_000000")
        actual_customers_query = [i for i in provider.generate_chunked_customers_query()]
        expected_customers_query = self.expected_customer_ids
        self.assertListEqual(actual_customers_query, expected_customers_query)

    @patch("apps.contributions.stripe_contributions_provider.stripe.Customer.search")
    def test_customers(self, stripe_customer_search_mock):
        stripe_customer_search_mock.return_value.auto_paging_iter.return_value = iter(self.customers)
        provider = StripeContributionsProvider("test@email.com", "acc_000000")
        result = provider.customers
        self.assertEqual(result, ["cust_1", "cust_2", "cust_3"])


class TestContributionsCacheProvider(AbstractTestStripeContributions):
    def setUp(self):
        super().setUp()
        self._setup_stripe_charges()
        self._setup_stripe_contributions()
        self.serializer = PaymentProviderContributionSerializer
        self.converter = StripeCharge

    def test_serialize(self):
        cache_provider = ContributionsCacheProvider(
            "test@email.com", serializer=self.serializer, converter=self.converter
        )
        data = cache_provider.serialize(self.contributions_1)
        self.assertEqual(len(data), 1)

    def test_upsert(self):
        redis_mock = RedisMock()
        with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
            cache_provider = ContributionsCacheProvider(
                "test@email.com", serializer=self.serializer, converter=self.converter
            )
            cache_provider.upsert(self.contributions_1)
            self.assertIsNotNone(redis_mock._data.get("test@email.com"))
            self.assertEqual(len(cache_provider.load()), 1)

            cache_provider = ContributionsCacheProvider(
                "test@email.com", "acc_0000", serializer=self.serializer, converter=self.converter
            )
            cache_provider.upsert(self.contributions_1)
            self.assertIsNotNone(redis_mock._data.get("test@email.com-acc_0000"))

    def test_upsert_overwrite(self):
        redis_mock = RedisMock()
        with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
            cache_provider = ContributionsCacheProvider(
                "test@email.com", "acc_0000", serializer=self.serializer, converter=self.converter
            )
            cache_provider.upsert(self.contributions_2)
            self.assertIsNotNone(redis_mock._data.get("test@email.com-acc_0000"))
            self.assertEqual(len(cache_provider.load()), 2)

            cache_provider.upsert(self.contributions_1)
            self.assertEqual(len(cache_provider.load()), 3)

    def test_upsert_override(self):
        redis_mock = RedisMock()
        with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
            cache_provider = ContributionsCacheProvider(
                "test@email.com", "acc_0000", serializer=self.serializer, converter=self.converter
            )

            cache_provider.upsert(self.contributions_1)
            data = cache_provider.load()
            self.assertEqual(data[0].amount, 2000)

            cache_provider.upsert([self.charge_1_1])
            data = cache_provider.load()
            self.assertEqual(data[0].amount, 4000)

    def test_load(self):
        redis_mock = RedisMock()
        with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
            cache_provider = ContributionsCacheProvider(
                "test@email.com", serializer=self.serializer, converter=self.converter
            )
            cache_provider.upsert(self.contributions_1)
            data = cache_provider.load()
            self.assertEqual(len(data), 1)
            self.assertEqual(data[0].id, "charge_1")
            self.assertEqual(data[0].provider_customer_id, "customer_1")
