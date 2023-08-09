import datetime
from unittest.mock import PropertyMock

from faker import Faker
import pytest
import stripe

from apps.contributions.models import ContributionInterval, ContributionStatus
from apps.contributions.stripe_contributions_provider import (
    StripePaymentIntentsCacheProvider,
    InvalidIntervalError,
    InvalidMetadataError,
    StripeContributionsProvider,
    StripePiAsPortalContribution,
    StripeSubscriptionsCacheProvider,
    StripePiSearchResponse,
)
from apps.contributions.tests import RedisMock

fake = Faker()


@pytest.fixture
def stripe_customers():
    return [
        stripe.Customer.construct_from({"id": "cust_1"}, key="test"),
        stripe.Customer.construct_from({"id": "cust_2"}, key="test"),
        stripe.Customer.construct_from({"id": "cust_3"}, key="test"),
    ]


def make_default_paid_pi_data() -> dict:
    """ """
    return {
        "id": fake.pystr_format(string_format="pi_??????"),
        "object": "payment_intent",
        "amount": (amt := fake.random_int(min=100, max=100000)),
        "amount_capturable": 0,
        "amount_details": {},
        "amount_received": amt,
        "application": None,
        "application_fee_amount": None,
        "automatic_payment_methods": None,
        "capture_method": "automatic",
        "client_secret": fake.pystr_format(string_format="pi_??????_secret_??????"),
        "confirmation_method": "automatic",
        "created": fake.unix_time(),
        "currency": "usd",
        "customer": fake.pystr_format(string_format="cus_??????"),
        "description": "",
        "invoice": None,
        "last_payment_error": None,
        "latest_charge": None,
        "live_mode": False,
        "metadata": {"revenue_program_slug": "testrp"},
        "next_action": None,
        "on_behalf_of": None,
        "payment_method": fake.pystr_format(string_format="pm_??????"),
        "payment_method_options": {},
        "payment_method_types": ["card"],
        "processing": None,
        "receipt_email": None,
        "redaction": None,
        "review": None,
        "setup_future_usage": None,
        "shipping": None,
        "statement_descriptor": None,
        "statement_descriptor_suffix": None,
        "status": "succeeded",
        "transfer_data": None,
        "transfer_group": None,
    }


@pytest.fixture
def pi_for_active_subscription():
    pi_data = make_default_paid_pi_data()
    pi_data["invoice"] = {"subscription": {"status": "active", "id": fake.pystr_format(string_format="sub_??????")}}
    return stripe.PaymentIntent.construct_from(pi_data, key="test")


@pytest.fixture
def pi_for_cancelled_subscription():
    pi_data = make_default_paid_pi_data()
    pi_data["invoice"] = {"subscription": {"status": "canceled", "id": fake.pystr_format(string_format="sub_??????")}}
    return stripe.PaymentIntent.construct_from(pi_data, key="test")


@pytest.fixture
def pi_without_invoice():
    pi_data = make_default_paid_pi_data()
    pi_data["invoice"] = None
    return stripe.PaymentIntent.construct_from(pi_data, key="test")


@pytest.fixture
def pi_without_invoice_line_item():
    pi_data = make_default_paid_pi_data()
    pi_data["invoice"] = {"lines": {"data": [{}]}}
    return stripe.PaymentIntent.construct_from(pi_data, key="test")


@pytest.fixture
def pi_with_invalid_metadata():
    pi_data = make_default_paid_pi_data()
    pi_data["metadata"] = {}
    return stripe.PaymentIntent.construct_from(pi_data, key="test")


class TestStripePiAsPortalContribution:
    def test_pi_with_canceled_subscription(self, pi_for_cancelled_subscription):
        contribution = StripePiAsPortalContribution(pi_for_cancelled_subscription)
        # make sure it exists, so following assertion is not trivial
        assert (sub_id := pi_for_cancelled_subscription.invoice.subscription.id)
        assert contribution.subscription_id == sub_id
        assert contribution.is_modifiable is False
        assert contribution.is_cancelable is False

    def test_pi_with_active_subscription(self, pi_for_active_subscription):
        contribution = StripePiAsPortalContribution(pi_for_active_subscription)
        assert contribution.subscription_id == pi_for_active_subscription.invoice.subscription.id
        assert contribution.is_modifiable is True
        assert contribution.is_cancelable is True

    def test_pi_without_invoice(self, pi_without_invoice):
        contribution = StripePiAsPortalContribution(pi_without_invoice)
        assert contribution.interval == ContributionInterval.ONE_TIME
        assert contribution.invoice_line_item == [{}]
        assert contribution.subscription_id is None

    def test_pi_without_invoice_line_item(self, pi_without_invoice_line_item):
        contribution = StripePiAsPortalContribution(pi_without_invoice_line_item)
        assert contribution.invoice_line_item == [{}]

    def test_pi_with_invalid_metadata(self, pi_with_invalid_metadata):
        with pytest.raises(InvalidMetadataError):
            StripePiAsPortalContribution(pi_with_invalid_metadata).revenue_program
        # with pytest.raises(InvalidMetadataError):
        #     StripePiAsPortalContribution(self.payment_intent_without_revenue_program).revenue_program

    def test_pi_without_card(self, pi_without_card):
        contribution = StripePiAsPortalContribution(pi_without_card)
        for attr in ("card_brand", "last4", "credit_card_expiration_date"):
            assert getattr(contribution, attr) is None

    def test_pi_with_null_card(self, pi_with_null_card):
        contribution = StripePiAsPortalContribution(pi_with_null_card)
        for attr in ("card_brand", "last4", "credit_card_expiration_date"):
            assert getattr(contribution, attr) is None

    def test_pi_with_valid_data(self, pi_with_valid_data):
        contribution = StripePiAsPortalContribution(pi_with_valid_data)
        assert contribution.interval == ContributionInterval.YEARLY
        assert contribution.revenue_program == pi_with_valid_data.metadata.revenue_program_slug
        assert contribution.card_brand == pi_with_valid_data.payment_method.card.brand
        assert contribution.last4 == pi_with_valid_data.payment_method.card.last4
        assert contribution.amount == pi_with_valid_data.amount
        assert contribution.created == datetime.datetime.fromtimestamp(pi_with_valid_data.created)
        assert contribution.provider_customer_id == pi_with_valid_data.customer
        # assert contribution.last_payment_date
        # self.assertEqual(
        #     contribution.last_payment_date,
        #     datetime.datetime(2022, 7, 4, 6, 10, 47, tzinfo=datetime.timezone.utc),
        # )
        #     @property
        # def last_payment_date(self) -> datetime.datetime:
        #     if not self.payment_intent.invoice:
        #         return datetime.datetime.fromtimestamp(int(self.payment_intent.created), tz=datetime.timezone.utc)
        #     return datetime.datetime.fromtimestamp(
        #         int(self.payment_intent.invoice.status_transitions.paid_at), tz=datetime.timezone.utc
        #     )
        assert contribution.status == ContributionStatus.PAID

        # @property
        # def credit_card_expiration_date(self) -> str | None:
        #     return f"{self.card.exp_month}/{self.card.exp_year}" if self.card.exp_month else None
        assert (
            contribution.credit_card_expiration_date
            == f"{pi_with_valid_data.payment_method.card.exp_month}/{pi_with_valid_data.payment_method.card.exp_year}"
        )
        assert contribution.payment_type == "card"
        assert contribution.refunded is False
        assert contribution.id == pi_with_valid_data.id

        self.payment_intent_1["invoice"]["lines"]["data"][0]["plan"]["interval"] = "month"
        contribution = StripePiAsPortalContribution(self.payment_intent_1)
        self.assertEqual(contribution.interval, ContributionInterval.MONTHLY)

        # self.payment_intent_1["invoice"]["lines"]["data"][0]["plan"]["interval"] = "day"
        # with self.assertRaises(InvalidIntervalError):
        #     StripePiAsPortalContribution(self.payment_intent_1).interval

        # self.payment_intent_1["status"] = "no status"
        # self.assertEqual(StripePiAsPortalContribution(self.payment_intent_1).status, ContributionStatus.FAILED)

        # self.payment_intent_1["status"] = "pending"
        # self.assertEqual(
        #     StripePiAsPortalContribution(self.payment_intent_1).status,
        #     ContributionStatus.PROCESSING,
        # )

        # self.payment_intent_1["amount_refunded"] = 0.5
        # self.assertEqual(
        #     StripePiAsPortalContribution(self.payment_intent_1).status,
        #     ContributionStatus.REFUNDED,
        # )

        # self.payment_intent_1["refunded"] = True
        # self.assertEqual(
        #     StripePiAsPortalContribution(self.payment_intent_1).status,
        #     ContributionStatus.REFUNDED,
        # )


class TestStripeContributionsProvider:
    # def setUp(self):
    #     super().setUp()
    #     self._setup_stripe_customers()
    #     self._setup_stripe_customer_ids(10)
    #     self.expected_customer_ids = [
    #         "customer:'cust_0' OR customer:'cust_1'",
    #         "customer:'cust_2' OR customer:'cust_3'",
    #         "customer:'cust_4' OR customer:'cust_5'",
    #         "customer:'cust_6' OR customer:'cust_7'",
    #         "customer:'cust_8' OR customer:'cust_9'",
    #     ]

    # @patch(
    #     "apps.contributions.stripe_contributions_provider.StripeContributionsProvider.customers",
    #     new_callable=PropertyMock,
    # )
    # @patch("apps.contributions.stripe_contributions_provider.MAX_STRIPE_CUSTOMERS_LIMIT", 2)
    def test_generate_chunked_customers_query(self, mocker, faker):
        num_customers = 2
        mocker.patch("apps.contributions.stripe_contributions_provider.MAX_STRIPE_CUSTOMERS_LIMIT", num_customers)
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripeContributionsProvider.customers",
            new_callable=PropertyMock,
            return_value=(customers := [faker.pystr_format(string_format="cust_??????") for _ in range(num_customers)]),
        )
        provider = StripeContributionsProvider("test@email.com", "acc_000000")
        actual_customers_query = [i for i in provider.generate_chunked_customers_query()]
        assert actual_customers_query == [f"customer:'{customer}'" for customer in customers]

    # @patch("apps.contributions.stripe_contributions_provider.stripe.Customer.search")
    def test_customers(self, mocker):
        pass
        # mocker.patch("stripe.Customer.search", return_value=)
        # stripe_customer_search_mock.return_value.auto_paging_iter.return_value = iter(self.customers)
        # provider = StripeContributionsProvider("test@email.com", "acc_000000")
        # result = provider.customers
        # self.assertEqual(result, ["cust_1", "cust_2", "cust_3"])

    # @patch("apps.contributions.stripe_contributions_provider.stripe.PaymentIntent.search")
    def test_fetch_payment_intents(self, mocker):
        mock_pi_search = mocker.patch("apps.contributions.stripe_contributions_provider.stripe.PaymentIntent.search")
        provider = StripeContributionsProvider("test@email.com", "acc_000000")
        provider.fetch_payment_intents()
        mock_pi_search.assert_called_once_with(
            query=None,
            expand=["data.invoice.subscription.default_payment_method", "data.payment_method"],
            limit=100,
            stripe_account="acc_000000",
        )
        provider.fetch_payment_intents(query="foo", page="bar")
        mock_pi_search.assert_called_once_with(
            query="foo",
            expand=["data.invoice.subscription.default_payment_method", "data.payment_method"],
            limit=100,
            stripe_account="acc_000000",
            page="bar",
        )


class TestStripePaymentIntentsCacheProvider:
    def test_serialize(self, pi_for_active_subscription):
        cache_provider = StripePaymentIntentsCacheProvider(stripe_account_id="bogus", email_id="test@email.com")
        assert len(cache_provider.serialize(pi_for_active_subscription)) == 1

    # def test_upsert(self):
    #     redis_mock = RedisMock()
    #     with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
    #         cache_provider = StripePaymentIntentsCacheProvider(
    #             "test@email.com", "acc_0000", serializer=self.serializer, converter=self.converter
    #         )
    #         cache_provider.upsert(self.payment_intents_1)
    #         self.assertIsNotNone(redis_mock._data.get("test@email.com-payment-intents-acc_0000"))

    # def test_upsert_overwrite(self):
    #     redis_mock = RedisMock()
    #     with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
    #         cache_provider = StripePaymentIntentsCacheProvider(
    #             "test@email.com", "acc_0000", serializer=self.serializer, converter=self.converter
    #         )
    #         cache_provider.upsert(self.payment_intents_2)
    #         self.assertIsNotNone(redis_mock._data.get("test@email.com-payment-intents-acc_0000"))
    #         self.assertEqual(len(cache_provider.load()), 2)

    #         cache_provider.upsert(self.payment_intents_1)
    #         self.assertEqual(len(cache_provider.load()), 3)

    # def test_upsert_override(self):
    #     redis_mock = RedisMock()
    #     with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
    #         cache_provider = StripePaymentIntentsCacheProvider(
    #             "test@email.com", "acc_0000", serializer=self.serializer, converter=self.converter
    #         )

    #         cache_provider.upsert(self.payment_intents_1)
    #         data = cache_provider.load()
    #         self.assertEqual(data[0].amount, 2000)

    #         cache_provider.upsert([self.payment_intent_1_1])
    #         data = cache_provider.load()
    #         self.assertEqual(data[0].amount, 4000)

    # def test_load(self):
    #     redis_mock = RedisMock()
    #     with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
    #         cache_provider = StripePaymentIntentsCacheProvider(
    #             email_id="test@email.com",
    #             stripe_account_id="bogus",
    #             serializer=self.serializer,
    #             converter=self.converter,
    #         )
    #         cache_provider.upsert(self.payment_intents_1)
    #         data = cache_provider.load()
    #         self.assertEqual(len(data), 1)
    #         self.assertEqual(data[0].id, "payment_intent_1")
    #         self.assertEqual(data[0].provider_customer_id, "customer_1")


@pytest.fixture
def stripe_subscription(faker):
    return stripe.Subscription.construct_from(
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
        },
        key="test",
    )


@pytest.fixture
def stripe_subscription_no_metadata(stripe_subscription, faker):
    stripe_subscription.metadata = None
    # so won't have duplicate id
    stripe_subscription.id = faker.pystr_format(string_format="sub_??????")
    return stripe_subscription


class TestStripeSubscriptionsCacheProvider:
    # def setUp(self):
    #     super().setUp()
    #     self.serializer = SubscriptionsSerializer

    #     self.subscription = {
    #         "id": "sub_1234",
    #         "status": "incomplete",
    #         "card_brand": "Visa",
    #         "last4": "4242",
    #         "plan": {
    #             "interval": "month",
    #             "interval_count": 1,
    #             "amount": 1234,
    #         },
    #         "metadata": {
    #             "revenue_program_slug": "foo",
    #         },
    #         "amount": "100",
    #         "customer": "cus_1234",
    #         "current_period_end": 1654892502,
    #         "current_period_start": 1686428502,
    #         "created": 1654892502,
    #         "default_payment_method": {
    #             "id": "pm_1234",
    #             "type": "card",
    #             "card": {"brand": "discover", "last4": "7834", "exp_month": "12", "exp_year": "2022"},
    #         },
    #     }
    #     self.sub_1 = AttrDict(self.subscription)
    #     self.sub_2 = AttrDict(self.subscription)
    #     self.sub_3 = AttrDict(self.subscription)
    #     self.sub_2.metadata.revenue_program_slug = "bar"
    #     self.sub_2.id = "sub_5678"
    #     del self.sub_3.metadata

    def test_serialize(self, stripe_subscription_no_metadata, stripe_subscription):
        cache_provider = StripeSubscriptionsCacheProvider(email_id="test@email.com", stripe_account_id="bogus")
        data = cache_provider.serialize([stripe_subscription, stripe_subscription_no_metadata])
        assert len(data) == 1  # because the second one is missing metadata
        assert data[0]["id"] == stripe_subscription.id

    # def test_upsert(self):
    #     redis_mock = RedisMock()
    #     with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
    #         cache_provider = SerializedSubscriptionsCacheProvider(
    #             "test@email.com",
    #             "acc_0000",
    #             serializer=self.serializer,
    #         )
    #         cache_provider.upsert([self.sub_1, self.sub_2, self.sub_3])
    #         assert redis_mock._data.get("test@email.com-subscriptions-acc_0000") is not None

    # def test_load(self):
    #     redis_mock = RedisMock()
    #     with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
    #         cache_provider = SerializedSubscriptionsCacheProvider(
    #             email_id="test@email.com",
    #             stripe_account_id="bogus",
    #             serializer=self.serializer,
    #         )
    #         data = cache_provider.load()
    #         assert data == []
    #         cache_provider.upsert([self.sub_1, self.sub_2])
    #         data = cache_provider.load()
    #         assert len(data) == 2
    #         assert data[0].id == "sub_1234"
    #         assert data[1].id == "sub_5678"
    #         for datum in data:
    #             assert datum.stripe_account_id == "bogus"
