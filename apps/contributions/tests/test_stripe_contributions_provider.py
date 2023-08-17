import datetime
from unittest.mock import patch

from django.test import TestCase

import pytest
import stripe
from addict import Dict as AttrDict

from apps.common.tests.test_resources import AbstractTestCase
from apps.contributions.models import ContributionInterval, ContributionStatus
from apps.contributions.serializers import SubscriptionsSerializer
from apps.contributions.stripe_contributions_provider import (
    MAX_STRIPE_CUSTOMERS_LIMIT,
    MAX_STRIPE_RESPONSE_LIMIT,
    ContributionIgnorableError,
    InvalidIntervalError,
    InvalidMetadataError,
    StripeContributionsProvider,
    StripePaymentIntent,
    StripePiAsPortalContribution,
    StripePiSearchResponse,
    SubscriptionsCacheProvider,
)
from apps.contributions.tests import RedisMock


class AbstractTestStripeContributions(TestCase):
    def _setup_stripe_customers(self):
        self.customers = [
            stripe.Customer.construct_from({"id": "cust_1"}, key="test"),
            stripe.Customer.construct_from({"id": "cust_2"}, key="test"),
            stripe.Customer.construct_from({"id": "cust_3"}, key="test"),
        ]

    def _setup_stripe_payment_intents(self):
        payment_intent_1 = {
            "id": "payment_intent_1",
            "amount": 2000,
            "customer": "customer_1",
            "status": "succeeded",
            "created": 1656915040,
        }

        payment_intent_1_1 = {
            "id": "payment_intent_1",
            "amount": 4000,
            "customer": "customer_3",
            "status": "succeeded",
            "created": 1656915040,
        }

        payment_intent_2 = {
            "id": "payment_intent_2",
            "amount": 2000,
            "customer": "customer_2",
            "status": "succeeded",
            "created": 1656915040,
        }

        payment_intent_3 = {
            "id": "payment_intent_3",
            "amount": 2000,
            "customer": "customer_3",
            "status": "succeeded",
            "created": 1656915040,
        }

        metadata = {"metadata": {"revenue_program_slug": "testrp"}}
        metadata_1 = {"metadata": {}}
        payment_method = {
            "payment_method": {
                "card": {"brand": "visa", "last4": "1234", "exp_month": 1, "exp_year": 2023},
                "type": "card",
            }
        }
        payment_method_details_without_card = {"payment_method": {}}
        payment_method_details_with_null_card = {"payment_method": {"card": None}}
        line_item = {"plan": {"interval": "year", "interval_count": 1}}
        invoice = {
            "invoice": {
                "id": "invoice_1",
                "status_transitions": {"paid_at": 1656915047},
                "lines": {"data": [line_item]},
                "next_payment_attempt": 1656915047,
                "subscription": {
                    "id": "subscription_1",
                    "status": "active",
                },
            }
        }
        invoice_without_line_item = {
            "invoice": {
                "id": "invoice_1",
                "status_transitions": {"paid_at": 1656915047},
                "lines": {"data": None},
                "next_payment_attempt": 1656915047,
                "subscription": {
                    "id": "subscription_1",
                    "status": "active",
                },
            }
        }
        invoice_with_canceled_subscription = {
            "invoice": {
                "id": "invoice_1",
                "status_transitions": {"paid_at": 1656915047},
                "lines": {"data": [line_item]},
                "next_payment_attempt": 1656915047,
                "subscription": {
                    "id": "subscription_1",
                    "status": "canceled",
                },
            }
        }

        invoice_with_active_subscription = {
            "invoice": {
                "id": "invoice_1",
                "status_transitions": {"paid_at": 1656915047},
                "lines": {"data": [line_item]},
                "next_payment_attempt": 1656915047,
                "subscription": {
                    "id": "subscription_1",
                    "status": "active",
                },
            }
        }

        self.payment_intent_without_invoice = stripe.PaymentIntent.construct_from(
            payment_intent_1 | metadata | {"invoice": None} | payment_method, "TEST-KEY"
        )
        self.payment_intent_with_canceled_subscription = stripe.PaymentIntent.construct_from(
            payment_intent_1 | metadata | invoice_with_canceled_subscription | payment_method, "TEST-KEY"
        )
        self.payment_intent_with_active_subscription = stripe.PaymentIntent.construct_from(
            payment_intent_1 | metadata | invoice_with_active_subscription | payment_method, "TEST-KEY"
        )
        self.payment_intent_without_metadata = stripe.PaymentIntent.construct_from(
            payment_intent_1 | invoice | payment_method, "TEST-KEY"
        )
        self.payment_intent_without_revenue_program = stripe.PaymentIntent.construct_from(
            payment_intent_1 | invoice | payment_method | metadata_1, "TEST-KEY"
        )
        self.payment_intent_without_invoice_line_item = stripe.PaymentIntent.construct_from(
            payment_intent_1 | invoice_without_line_item | payment_method | metadata_1, "TEST-KEY"
        )
        self.payment_intent_without_card = stripe.PaymentIntent.construct_from(
            payment_intent_1 | invoice_without_line_item | payment_method_details_without_card | metadata_1, "TEST-KEY"
        )
        self.payment_intent_with_null_card = stripe.PaymentIntent.construct_from(
            payment_intent_1 | invoice_without_line_item | payment_method_details_with_null_card | metadata_1,
            "TEST-KEY",
        )
        self.payment_intent_1 = stripe.PaymentIntent.construct_from(
            payment_intent_1 | metadata | invoice | payment_method, "TEST-KEY"
        )
        self.payment_intent_1_1 = stripe.PaymentIntent.construct_from(
            payment_intent_1_1 | metadata | invoice | payment_method, "TEST-KEY"
        )
        self.payment_intent_2 = stripe.PaymentIntent.construct_from(
            payment_intent_2 | metadata | invoice | payment_method, "TEST-KEY"
        )
        self.payment_intent_3 = stripe.PaymentIntent.construct_from(
            payment_intent_3 | metadata | invoice | payment_method, "TEST-KEY"
        )

    def _setup_stripe_contributions(self):
        self.contributions_1 = [
            self.payment_intent_1,
            self.payment_intent_without_invoice,
            self.payment_intent_without_metadata,
            self.payment_intent_without_revenue_program,
        ]

        self.contributions_2 = [self.payment_intent_2, self.payment_intent_3]

    def _setup_stripe_customer_ids(self, count):
        self.customer_ids = [f"cust_{i}" for i in range(count)]


class TestStripePaymentIntent(AbstractTestStripeContributions):
    def setUp(self):
        super().setUp()
        self._setup_stripe_payment_intents()

    def test_payment_intent_with_canceled_subscription(self):
        payment_intent = StripePaymentIntent(self.payment_intent_with_canceled_subscription)
        assert payment_intent.subscription_id == "subscription_1"
        assert payment_intent.is_modifiable is False
        assert payment_intent.is_cancelable is False

    def test_payment_intent_with_active_subscription(self):
        payment_intent = StripePaymentIntent(self.payment_intent_with_active_subscription)
        assert payment_intent.subscription_id == "subscription_1"
        assert payment_intent.is_modifiable is True
        assert payment_intent.is_cancelable is True

    def test_stripe_payment_intent_without_invoice(self):
        stripe_payment_intent = StripePaymentIntent(self.payment_intent_without_invoice)
        self.assertEqual(stripe_payment_intent.interval, ContributionInterval.ONE_TIME)
        assert stripe_payment_intent.invoice_line_item == [{}]

    def test_stripe_payment_intent_without_invoice_line_item(self):
        stripe_payment_intent = StripePaymentIntent(self.payment_intent_without_invoice_line_item)
        assert stripe_payment_intent.invoice_line_item == {}

    def test_stripe_payment_intent_with_invalid_metadata(self):
        with self.assertRaises(InvalidMetadataError):
            StripePaymentIntent(self.payment_intent_without_metadata).revenue_program
        with self.assertRaises(InvalidMetadataError):
            StripePaymentIntent(self.payment_intent_without_revenue_program).revenue_program

    def test_stripe_payment_intent_without_card(self):
        payment_intent = StripePaymentIntent(self.payment_intent_without_card)
        self.assertIsNone(payment_intent.card_brand)
        self.assertIsNone(payment_intent.last4)
        self.assertIsNone(payment_intent.credit_card_expiration_date)

    def test_stripe_payment_intent_with_null_card(self):
        payment_intent = StripePaymentIntent(self.payment_intent_with_null_card)
        self.assertIsNone(payment_intent.card_brand)
        self.assertIsNone(payment_intent.last4)
        self.assertIsNone(payment_intent.credit_card_expiration_date)

    def test_stripe_payment_intent_with_valid_data(self):
        stripe_payment_intent = StripePaymentIntent(self.payment_intent_1)
        self.assertEqual(stripe_payment_intent.interval, ContributionInterval.YEARLY)
        self.assertEqual(stripe_payment_intent.revenue_program, "testrp")
        self.assertEqual(stripe_payment_intent.card_brand, "visa")
        self.assertEqual(stripe_payment_intent.last4, "1234")
        self.assertEqual(stripe_payment_intent.amount, 2000)
        self.assertEqual(
            stripe_payment_intent.created, datetime.datetime(2022, 7, 4, 6, 10, 40, tzinfo=datetime.timezone.utc)
        )
        self.assertEqual(stripe_payment_intent.provider_customer_id, "customer_1")
        self.assertEqual(
            stripe_payment_intent.last_payment_date,
            datetime.datetime(2022, 7, 4, 6, 10, 47, tzinfo=datetime.timezone.utc),
        )
        self.assertEqual(stripe_payment_intent.status, ContributionStatus.PAID)
        self.assertEqual(stripe_payment_intent.credit_card_expiration_date, "1/2023")
        self.assertEqual(stripe_payment_intent.payment_type, "card")
        self.assertEqual(stripe_payment_intent.refunded, False)
        self.assertEqual(stripe_payment_intent.id, "payment_intent_1")

        self.payment_intent_1["invoice"]["lines"]["data"][0]["plan"]["interval"] = "month"
        stripe_payment_intent = StripePaymentIntent(self.payment_intent_1)
        self.assertEqual(stripe_payment_intent.interval, ContributionInterval.MONTHLY)

        self.payment_intent_1["invoice"]["lines"]["data"][0]["plan"]["interval"] = "day"
        with self.assertRaises(InvalidIntervalError):
            StripePaymentIntent(self.payment_intent_1).interval

        self.payment_intent_1["status"] = "no status"
        self.assertEqual(StripePaymentIntent(self.payment_intent_1).status, ContributionStatus.FAILED)

        self.payment_intent_1["status"] = "pending"
        self.assertEqual(StripePaymentIntent(self.payment_intent_1).status, ContributionStatus.PROCESSING)

        self.payment_intent_1["amount_refunded"] = 0.5
        self.assertEqual(StripePaymentIntent(self.payment_intent_1).status, ContributionStatus.REFUNDED)

        self.payment_intent_1["refunded"] = True
        self.assertEqual(StripePaymentIntent(self.payment_intent_1).status, ContributionStatus.REFUNDED)


@pytest.fixture
def customer_factory(faker):
    class Factory:
        def get(self):
            return stripe.Customer.construct_from(
                {"id": faker.pystr_format(string_format="cust_?????"), "name": faker.name()}, key="test"
            )

    return Factory()


class TestStripeContributionsProvider:
    def test__init__(self):
        provider = StripeContributionsProvider((email := "foo@bar.com"), (id := "some-account-id"))
        assert provider.email_id == email
        assert provider.stripe_account_id == id

    def test_customers(self, mocker, customer_factory):
        customers = [customer_factory.get(), customer_factory.get()]
        mock_search = mocker.patch("stripe.Customer.search")
        mock_search.return_value.auto_paging_iter.return_value = customers
        assert StripeContributionsProvider(
            email_id=(email := "foo@bar.com"), stripe_account_id=(id := "test")
        ).customers == [x.id for x in customers]
        mock_search.assert_called_once_with(
            query=f"email:'{email}'", limit=MAX_STRIPE_RESPONSE_LIMIT, stripe_account=id
        )

    def test_generate_chunked_customers_query(self, mocker, customer_factory):
        customers = [customer_factory.get().id for _ in range(MAX_STRIPE_CUSTOMERS_LIMIT + 1)]
        mocker.patch.object(
            StripeContributionsProvider, "customers", new_callable=mocker.PropertyMock, return_value=customers
        )
        query = list(
            StripeContributionsProvider(
                email_id="foo@bar.com", stripe_account_id="test"
            ).generate_chunked_customers_query()
        )
        # we expect to get back two, because we have one more customer than the limit
        assert len(query) == 2
        assert query[0] == " OR ".join([f"customer:'{x}'" for x in customers[:MAX_STRIPE_CUSTOMERS_LIMIT]])
        assert query[1] == f"customer:'{customers[-1]}'"

    @pytest.mark.parametrize("page", ("1", None))
    def test_fetch_payment_intents(self, page, mocker):
        mock_search_result = AttrDict(
            {
                "url": "https://stripe.com",
                "has_more": False,
                "next_page": None,
                "object": "search_result",
            }
        )
        # initially tried to put data in init of mock_search_result, but it doing it that way
        # caused the PI object to be cast to dict.
        mock_search_result.data = [
            stripe.PaymentIntent.construct_from({"id": "pi_1", "amount": 100}, key="test"),
            stripe.PaymentIntent.construct_from({"id": "pi_2", "amount": 200}, key="test"),
        ]
        mock_search = mocker.patch(
            "stripe.PaymentIntent.search",
            return_value=mock_search_result,
        )
        provider = StripeContributionsProvider(email_id="foo@bar.com", stripe_account_id="test")
        pis = provider.fetch_payment_intents(query=(query := "foo"), page=page)
        assert isinstance(pis, StripePiSearchResponse)
        assert pis.data == mock_search_result.data
        assert pis.has_more == mock_search_result.has_more
        assert pis.url == mock_search_result.url
        assert pis.next_page == mock_search_result.next_page

        mock_search_kwargs = {
            "query": query,
            "expand": provider.FETCH_PI_EXPAND_FIELDS,
            "limit": MAX_STRIPE_RESPONSE_LIMIT,
            "stripe_account": provider.stripe_account_id,
        }
        if page:
            mock_search_kwargs["page"] = page

        mock_search.assert_called_once_with(**mock_search_kwargs)

    def test_fetch_uninvoiced_subscriptions_for_customer(self, mocker):
        mock_list = mocker.patch("stripe.Subscription.list", return_value=(sub_list := mocker.Mock()))
        sub_list.auto_paging_iter.return_value = [
            stripe.Subscription.construct_from(
                {"id": "sub_1", "status": "active", "latest_invoice": "something-truthy"}, key="test"
            ),
            stripe.Subscription.construct_from(
                {"id": (id := "sub_2"), "status": "active", "latest_invoice": None}, key="test"
            ),
        ]
        provider = StripeContributionsProvider(email_id="foo@bar.com", stripe_account_id=(account_id := "test"))
        subs = provider.fetch_uninvoiced_subscriptions_for_customer(customer_id=(cust_id := "cust_1"))
        # only the one without a latest_invoice should appear
        assert len(subs) == 1
        assert subs[0].id == id
        mock_list.assert_called_once_with(
            customer=cust_id,
            expand=["data.default_payment_method"],
            limit=MAX_STRIPE_RESPONSE_LIMIT,
            stripe_account=account_id,
            status="active",
        )

    def test_fetch_uninvoiced_subscriptions_for_contributor(self, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripeContributionsProvider.fetch_uninvoiced_subscriptions_for_customer",
            return_value=(subs := [mocker.Mock(), mocker.Mock()]),
        )
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripeContributionsProvider.customers",
            new_callable=mocker.PropertyMock,
            return_value=(customers := ["cus_1", "cus_2"]),
        )
        provider = StripeContributionsProvider(email_id="foo@bar.com", stripe_account_id="test")
        fetched = provider.fetch_uninvoiced_subscriptions_for_contributor()
        provider.fetch_uninvoiced_subscriptions_for_customer.assert_has_calls([mocker.call(x) for x in customers])
        # we're returning `subs` twice, once for each customer
        assert fetched == subs + subs

    @pytest.mark.parametrize(
        "interval,interval_count,expected,expected_error",
        (
            ("year", 1, ContributionInterval.YEARLY, None),
            ("month", 1, ContributionInterval.MONTHLY, None),
            ("unexpected", 1, None, InvalidIntervalError),
            ("year", 2, None, InvalidIntervalError),
            ("month", 2, None, InvalidIntervalError),
        ),
    )
    def test_get_interval_from_subscription(self, interval, interval_count, expected, expected_error, mocker):
        provider = StripeContributionsProvider(email_id="foo@bar.com", stripe_account_id="test")
        sub = stripe.Subscription.construct_from(
            {
                "id": "sub_1",
                "plan": {
                    "interval": interval,
                    "interval_count": interval_count,
                },
            },
            key="test",
        )
        if expected_error:
            with pytest.raises(expected_error):
                provider.get_interval_from_subscription(sub)
        else:
            assert provider.get_interval_from_subscription(sub) == expected

    def test_cast_subscription_to_pi_for_portal(self, faker):
        sub = stripe.Subscription.construct_from(
            {
                "id": "sub_1",
                "plan": {"amount": 100, "interval": "month", "interval_count": 1},
                "created": faker.unix_time(),
                "default_payment_method": {
                    "card": {
                        "brand": "visa",
                        "last4": 1234,
                        "exp_month": (month := 1),
                        "exp_year": (year := 2024),
                    },
                    "type": "card",
                },
                "customer": faker.pystr_format(string_format="cust_?????"),
                "metadata": {"revenue_program_slug": "testrp"},
                "status": "active",
            },
            key="test",
        )
        provider = StripeContributionsProvider(email_id="foo@bar.com", stripe_account_id=(account_id := "test"))
        result = provider.cast_subscription_to_pi_for_portal(sub)
        assert isinstance(result, StripePiAsPortalContribution)
        assert result.amount == sub.plan.amount
        assert result.created == datetime.datetime.fromtimestamp(sub.created, tz=datetime.timezone.utc)
        assert result.credit_card_expiration_date == f"{month}/{year}"
        assert result.id == sub.id
        assert result.interval == ContributionInterval.MONTHLY
        assert result.is_cancelable is True
        assert result.is_modifiable is True
        assert result.last4 == sub.default_payment_method.card.last4
        assert result.payment_type == sub.default_payment_method.type
        assert result.provider_customer_id == sub.customer
        assert result.revenue_program == sub.metadata.revenue_program_slug
        assert result.status == ContributionStatus.PAID
        assert result.stripe_account_id == account_id
        assert result.subscription_id == sub.id

    def test_cast_subscription_to_pi_for_portal_when_attribute_error(self, faker):
        sub = stripe.Subscription.construct_from(
            {
                "id": "sub_1",
                "plan": {"amount": 100, "interval": "month", "interval_count": 1},
                "created": faker.unix_time(),
                "default_payment_method": None,
                "customer": faker.pystr_format(string_format="cust_?????"),
                "metadata": {"revenue_program_slug": "testrp"},
                "status": "active",
            },
            key="test",
        )
        provider = StripeContributionsProvider(email_id="foo@bar.com", stripe_account_id="test")
        with pytest.raises(ContributionIgnorableError):
            provider.cast_subscription_to_pi_for_portal(sub)


class TestContributionsCacheProvider:
    def test__init__(self):
        pass

    def test_serialize(self):
        pass

    def test_serialize_when_contribution_ignorable_error(self):
        pass

    def test_upsert_uninvoiced_subscriptions(self):
        pass

    def test_upsert_uninvoiced_subscriptions_overwrite(self):
        pass

    def test_upsert_uninvoiced_subscriptions_override(self):
        pass

    def test_upsert(self):
        pass

    def test_upsert_overwrite(self):
        pass

    def test_upsert_override(self):
        pass

    def test_load(self):
        pass


# class TestContributionsCacheProvider(AbstractTestStripeContributions):
#     def setUp(self):
#         super().setUp()
#         self._setup_stripe_payment_intents()
#         self._setup_stripe_contributions()
#         self.serializer = PaymentProviderContributionSerializer
#         self.converter = StripePaymentIntent

#     def test_serialize(self):
#         cache_provider = ContributionsCacheProvider(
#             stripe_account_id="bogus", email_id="test@email.com", serializer=self.serializer, converter=self.converter
#         )
#         data = cache_provider.serialize(self.contributions_1)
#         self.assertEqual(len(data), 1)

#     def test_upsert(self):
#         redis_mock = RedisMock()
#         with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
#             cache_provider = ContributionsCacheProvider(
#                 "test@email.com", "acc_0000", serializer=self.serializer, converter=self.converter
#             )
#             cache_provider.upsert(self.contributions_1)
#             self.assertIsNotNone(redis_mock._data.get("test@email.com-payment-intents-acc_0000"))

#     def test_upsert_overwrite(self):
#         redis_mock = RedisMock()
#         with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
#             cache_provider = ContributionsCacheProvider(
#                 "test@email.com", "acc_0000", serializer=self.serializer, converter=self.converter
#             )
#             cache_provider.upsert(self.contributions_2)
#             self.assertIsNotNone(redis_mock._data.get("test@email.com-payment-intents-acc_0000"))
#             self.assertEqual(len(cache_provider.load()), 2)

#             cache_provider.upsert(self.contributions_1)
#             self.assertEqual(len(cache_provider.load()), 3)

#     def test_upsert_override(self):
#         redis_mock = RedisMock()
#         with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
#             cache_provider = ContributionsCacheProvider(
#                 "test@email.com", "acc_0000", serializer=self.serializer, converter=self.converter
#             )

#             cache_provider.upsert(self.contributions_1)
#             data = cache_provider.load()
#             self.assertEqual(data[0].amount, 2000)

#             cache_provider.upsert([self.payment_intent_1_1])
#             data = cache_provider.load()
#             self.assertEqual(data[0].amount, 4000)

#     def test_load(self):
#         redis_mock = RedisMock()
#         with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
#             cache_provider = ContributionsCacheProvider(
#                 email_id="test@email.com",
#                 stripe_account_id="bogus",
#                 serializer=self.serializer,
#                 converter=self.converter,
#             )
#             cache_provider.upsert(self.contributions_1)
#             data = cache_provider.load()
#             self.assertEqual(len(data), 1)
#             self.assertEqual(data[0].id, "payment_intent_1")
#             self.assertEqual(data[0].provider_customer_id, "customer_1")


class TestSubscriptionsCacheProvider(AbstractTestCase):
    def setUp(self):
        super().setUp()
        self.serializer = SubscriptionsSerializer

        self.subscription = {
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
        self.sub_1 = AttrDict(self.subscription)
        self.sub_2 = AttrDict(self.subscription)
        self.sub_3 = AttrDict(self.subscription)
        self.sub_2.metadata.revenue_program_slug = "bar"
        self.sub_2.id = "sub_5678"
        del self.sub_3.metadata

    def test_serialize(self):
        cache_provider = SubscriptionsCacheProvider(
            email_id="test@email.com", stripe_account_id="bogus", serializer=self.serializer
        )
        data = cache_provider.serialize([self.sub_1, self.sub_2, self.sub_3])
        assert len(data) == 2  # because the third one is missing metadata

    def test_upsert(self):
        redis_mock = RedisMock()
        with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
            cache_provider = SubscriptionsCacheProvider(
                "test@email.com",
                "acc_0000",
                serializer=self.serializer,
            )
            cache_provider.upsert([self.sub_1, self.sub_2, self.sub_3])
            assert redis_mock._data.get("test@email.com-subscriptions-acc_0000") is not None

    def test_load(self):
        redis_mock = RedisMock()
        with patch.dict("apps.contributions.stripe_contributions_provider.caches", {"default": redis_mock}):
            cache_provider = SubscriptionsCacheProvider(
                email_id="test@email.com",
                stripe_account_id="bogus",
                serializer=self.serializer,
            )
            data = cache_provider.load()
            assert data == []
            cache_provider.upsert([self.sub_1, self.sub_2])
            data = cache_provider.load()
            assert len(data) == 2
            assert data[0].id == "sub_1234"
            assert data[1].id == "sub_5678"
            for datum in data:
                assert datum.stripe_account_id == "bogus"
