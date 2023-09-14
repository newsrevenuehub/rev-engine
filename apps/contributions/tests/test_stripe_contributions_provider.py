import datetime
import json

from django.test import TestCase

import pytest
import pytest_cases
import stripe
from addict import Dict as AttrDict
from rest_framework.utils.serializer_helpers import ReturnDict

from apps.contributions.models import ContributionInterval, ContributionStatus
from apps.contributions.serializers import PaymentProviderContributionSerializer
from apps.contributions.stripe_contributions_provider import (
    MAX_STRIPE_CUSTOMERS_LIMIT,
    MAX_STRIPE_RESPONSE_LIMIT,
    ContributionIgnorableError,
    ContributionsCacheProvider,
    InvalidIntervalError,
    InvalidMetadataError,
    StripeContributionsProvider,
    StripePaymentIntent,
    SubscriptionsCacheProvider,
    logger,
)
from apps.contributions.tests import RedisMock
from apps.contributions.types import StripePiAsPortalContribution, StripePiSearchResponse


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
                    "default_payment_method": payment_method["payment_method"],
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


@pytest.fixture
def pi_for_one_time_when_no_payment_method(pi_for_valid_one_time_factory):
    pi = pi_for_valid_one_time_factory.get()
    pi.payment_method = None
    return pi


@pytest.fixture
def pi_for_imported_legacy_subscription():
    with open("apps/contributions/tests/fixtures/example-legacy-imported-pi.json") as fl:
        return stripe.PaymentIntent.construct_from(json.load(fl), "test")


@pytest.fixture
def pi_for_valid_one_time(pi_for_valid_one_time_factory):
    return pi_for_valid_one_time_factory.get()


@pytest.fixture
def pi_for_active_subscription(pi_for_active_subscription_factory):
    return pi_for_active_subscription_factory.get()


@pytest.fixture
def pi_with_unexpanded_payment_method(pi_for_valid_one_time_factory):
    return pi_for_valid_one_time_factory.get(payment_method="pm_12345")


@pytest.fixture
def pi_no_pm_no_invoice_charges_is_zero_length():
    # don't reuse the fixture from above because modifications to it will affect fixture used alone
    with open("apps/contributions/tests/fixtures/example-legacy-imported-pi.json") as fl:
        pi = stripe.PaymentIntent.construct_from(json.load(fl), "test")
    pi.charges.data = []
    pi.charges.total_count = 0
    pi.invoice = None
    return pi


@pytest.fixture
def card(pi_for_valid_one_time):
    return pi_for_valid_one_time.payment_method.card


@pytest.fixture
def dummy_card():
    # .DUMMY_CARD is an attrdict and when trying to pass that as a parameter in tests, got an error
    # so we create a fixture to pass instead
    return StripePaymentIntent.DUMMY_CARD


@pytest.fixture
def pm_with_card(card):
    return stripe.PaymentMethod.construct_from(AttrDict({"card": card}), "test")


@pytest.fixture
def pm_no_card():
    return stripe.PaymentMethod.construct_from(AttrDict({}), "test")


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


@pytest.mark.django_db
class TestStripePaymentIntentViaPytest:
    """NB:

    This was created to test newly touched code without refactoring existing tests. We've opted
    to refactor to pytest in other places, but there is upcoming work that may lead to StripePaymentIntent and
    its use cases drastically changing, so cleaning up the campsite is not worthwhile now.
    """

    def test_canceled_when_no_pi_has_no_invoice(self, pi_for_valid_one_time_factory):
        pi = pi_for_valid_one_time_factory.get()
        assert pi.invoice is None
        assert StripePaymentIntent(pi).is_cancelable is False

    @pytest.mark.parametrize(
        "status, expected",
        (
            ("active", False),
            ("canceled", True),
        ),
    )
    def test_canceled_when_pi_has_invoice(self, status, expected, pi_for_active_subscription_factory):
        pi = pi_for_active_subscription_factory.get()
        assert pi.invoice is not None
        pi.invoice.subscription.status = status
        assert StripePaymentIntent(pi).canceled is expected

    def test_status_when_refunded(self, pi_for_valid_one_time_factory):
        pi = pi_for_valid_one_time_factory.get(refunded=True)
        instance = StripePaymentIntent(pi)
        assert pi.refunded is True
        assert instance.status == ContributionStatus.REFUNDED

    def test_status_when_canceled(self, pi_for_active_subscription_factory):
        pi = pi_for_active_subscription_factory.get()
        pi.invoice.subscription.status = "canceled"
        instance = StripePaymentIntent(pi)
        assert instance.canceled is True
        assert instance.status == ContributionStatus.CANCELED

    def test_status_when_succeeded(self, pi_for_valid_one_time_factory):
        pi = pi_for_valid_one_time_factory.get(status="succeeded")
        assert StripePaymentIntent(pi).status == ContributionStatus.PAID

    def test_status_when_pending(self, pi_for_valid_one_time_factory):
        pi = pi_for_valid_one_time_factory.get(status="pending")
        assert StripePaymentIntent(pi).status == ContributionStatus.PROCESSING

    def test_status_when_other_status(self, pi_for_valid_one_time_factory):
        pi = pi_for_valid_one_time_factory.get(status="unexpected")
        assert StripePaymentIntent(pi).status == ContributionStatus.FAILED

    @pytest_cases.parametrize(
        "payment_method, expected",
        (
            (None, pytest_cases.fixture_ref(dummy_card)),
            (pytest_cases.fixture_ref(pm_no_card), pytest_cases.fixture_ref(dummy_card)),
            (pytest_cases.fixture_ref(pm_with_card), pytest_cases.fixture_ref(card)),
        ),
    )
    def test_card(self, payment_method, expected, pi_for_valid_one_time_factory, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripePaymentIntent.payment_method", payment_method
        )
        assert StripePaymentIntent(None).card == expected

    @pytest_cases.parametrize(
        "pi, get_expected_fn",
        (
            (
                pytest_cases.fixture_ref(pi_for_imported_legacy_subscription),
                lambda x: x.charges.data[0].payment_method_details,
            ),
            (
                pytest_cases.fixture_ref(pi_for_one_time_when_no_payment_method),
                lambda x: None,
            ),
            (
                pytest_cases.fixture_ref(pi_for_valid_one_time),
                lambda x: x.payment_method,
            ),
            (
                pytest_cases.fixture_ref(pi_for_active_subscription),
                lambda x: x.invoice.subscription.default_payment_method,
            ),
            (
                pytest_cases.fixture_ref(pi_with_unexpanded_payment_method),
                lambda x: None,
            ),
            (
                pytest_cases.fixture_ref(pi_no_pm_no_invoice_charges_is_zero_length),
                lambda x: None,
            ),
        ),
    )
    def test_payment_method(self, pi, get_expected_fn):
        assert StripePaymentIntent(pi).payment_method == get_expected_fn(pi)


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


@pytest.fixture()
def mock_redis_cache_for_pis_factory(mocker):
    class Factory:
        def get(self, cache_provider):
            redis_mock = RedisMock()
            mocker.patch.object(cache_provider, "cache", redis_mock)
            return redis_mock

    return Factory()


@pytest.fixture
def mock_redis_cache_for_subs_factory(mocker):
    class Factory:
        def get(self, cache_provider):
            redis_mock = RedisMock()
            mocker.patch.object(cache_provider, "cache", redis_mock)
            return redis_mock

    return Factory()


class TestContributionsCacheProvider:
    EMAIL_ID = "foo@BAR.com"
    STRIPE_ACCOUNT_ID = "tEst"

    def get_cache_provider(self):
        return ContributionsCacheProvider(
            stripe_account_id=self.STRIPE_ACCOUNT_ID,
            email_id=self.EMAIL_ID,
        )

    def test__init__(self):
        provider = self.get_cache_provider()
        assert provider.key == f"{self.EMAIL_ID}-payment-intents-{self.STRIPE_ACCOUNT_ID}".lower()
        assert provider.stripe_account_id == self.STRIPE_ACCOUNT_ID

    def test_serialize(self, pi_for_active_subscription_factory, pi_for_valid_one_time_factory):
        provider = self.get_cache_provider()
        data = provider.serialize(
            [(pi_1 := pi_for_active_subscription_factory.get()), (pi_2 := pi_for_valid_one_time_factory.get())]
        )
        for x in [pi_1, pi_2]:
            serialized = data[x.id]
            assert isinstance(serialized, ReturnDict)
            assert isinstance(serialized.serializer, PaymentProviderContributionSerializer)

    def test_serialize_when_contribution_ignorable_error(self, mocker, pi_for_valid_one_time_factory):
        logger_spy = mocker.spy(logger, "warning")
        pi = pi_for_valid_one_time_factory.get()
        # StripePiAsPortalContribution will raise an InvalidMetadataError
        # if this key is not in metadata
        del pi.metadata["revenue_program_slug"]
        provider = self.get_cache_provider()
        data = provider.serialize([pi])
        assert data == {}
        logger_spy.assert_called_once_with("Unable to process Contribution [%s]", pi.id, exc_info=mocker.ANY)

    def test_upsert_uninvoiced_subscriptions(self, mock_redis_cache_for_pis_factory, subscription_factory):
        cache_provider = self.get_cache_provider()
        mock_redis_cache_for_pis = mock_redis_cache_for_pis_factory.get(cache_provider)
        subscription = subscription_factory.get()
        cache_provider.upsert_uninvoiced_subscriptions([subscription])
        cached = json.loads(mock_redis_cache_for_pis._data.get(cache_provider.key))
        assert cached[subscription.id]["id"] == subscription.id

    def test_upsert_uninvoiced_subscriptions_overwrite(self, subscription_factory, mock_redis_cache_for_pis_factory):
        cache_provider = self.get_cache_provider()
        mock_redis_cache_for_pis = mock_redis_cache_for_pis_factory.get(cache_provider)
        subscription = subscription_factory.get()
        cache_provider.upsert_uninvoiced_subscriptions([subscription])
        cached = json.loads(mock_redis_cache_for_pis._data.get(cache_provider.key))
        assert len(cached) == 1
        assert cached[subscription.id]["created"] == subscription.created
        sub2 = subscription_factory.get()
        # ensure different ID
        sub2.id = subscription.id[::-1]
        cache_provider.upsert_uninvoiced_subscriptions([sub2])
        cached = json.loads(mock_redis_cache_for_pis._data.get(cache_provider.key))
        assert len(cached) == 2
        for k in [subscription.id, sub2.id]:
            assert k in cached

    def test_upsert_uninvoiced_subscriptions_override(self, mock_redis_cache_for_pis_factory, subscription_factory):
        cache_provider = self.get_cache_provider()
        mock_redis_cache_for_pis = mock_redis_cache_for_pis_factory.get(cache_provider)
        subscription = subscription_factory.get()
        cache_provider.upsert_uninvoiced_subscriptions([subscription])
        cached = json.loads(mock_redis_cache_for_pis._data.get(cache_provider.key))
        assert cached[subscription.id]["created"] == subscription.created
        subscription.created = subscription.created + 1000
        cache_provider.upsert_uninvoiced_subscriptions([subscription])
        cached = json.loads(mock_redis_cache_for_pis._data.get(cache_provider.key))
        assert len(cached) == 1
        assert cached[subscription.id]["created"] == subscription.created

    def test_upsert(self, pi_for_valid_one_time_factory, mock_redis_cache_for_pis_factory):
        provider = self.get_cache_provider()
        mock_redis_cache_for_pis = mock_redis_cache_for_pis_factory.get(provider)
        provider.upsert((pis := [pi_for_valid_one_time_factory.get()]))
        cached = json.loads(mock_redis_cache_for_pis._data.get(provider.key))
        for x in pis:
            assert cached[x.id] == dict(provider.serializer(instance=provider.converter(x)).data) | {
                "stripe_account_id": self.STRIPE_ACCOUNT_ID
            }

    def test_upsert_overwrite(self, pi_for_valid_one_time_factory, mock_redis_cache_for_pis_factory):
        provider = self.get_cache_provider()
        mock_redis_cache_for_pis = mock_redis_cache_for_pis_factory.get(provider)
        provider.upsert([(pi := pi_for_valid_one_time_factory.get())])
        cached = json.loads(mock_redis_cache_for_pis._data.get(provider.key))
        assert len(cached) == 1
        assert pi.id in cached
        pi_2 = pi_for_valid_one_time_factory.get()
        # ensure different id
        pi_2.id = pi.id[::-1]
        provider.upsert([pi_2])
        cached = json.loads(mock_redis_cache_for_pis._data.get(provider.key))
        assert len(cached) == 2
        assert pi.id in cached
        assert pi_2.id in cached

    def test_upsert_updates(self, mock_redis_cache_for_pis_factory, pi_for_valid_one_time_factory):
        provider = self.get_cache_provider()
        mock_redis_cache_for_pis = mock_redis_cache_for_pis_factory.get(provider)
        provider.upsert([(pi := pi_for_valid_one_time_factory.get())])
        cached = json.loads(mock_redis_cache_for_pis._data.get(provider.key))
        assert cached[pi.id]["amount"] == pi.amount
        pi.amount = (new_amount := pi.amount + 100)
        provider.upsert([pi])
        cached = json.loads(mock_redis_cache_for_pis._data.get(provider.key))
        assert cached[pi.id]["amount"] == new_amount

    def test_load_when_no_data(self, mock_redis_cache_for_pis_factory):
        provider = self.get_cache_provider()
        mock_redis_cache_for_pis_factory.get(provider)
        assert provider.load() == []

    def test_load_happy_path(self, mock_redis_cache_for_pis_factory, pi_for_valid_one_time_factory):
        provider = self.get_cache_provider()
        mock_redis_cache_for_pis_factory.get(provider)
        provider.upsert([(pi := pi_for_valid_one_time_factory.get())])
        assert provider.load()[0] == StripePiAsPortalContribution(
            **(
                dict(provider.serializer(instance=provider.converter(pi)).data)
                | {"stripe_account_id": provider.stripe_account_id}
            )
        )


class TestSubscriptionsCacheProvider:
    EMAIL_ID = "foo@BAR.com"
    STRIPE_ACCOUNT_ID = "test-ID"

    def get_provider(self):
        return SubscriptionsCacheProvider(self.EMAIL_ID, self.STRIPE_ACCOUNT_ID)

    def test__init__(self):
        provider = self.get_provider()
        assert provider.stripe_account_id == self.STRIPE_ACCOUNT_ID
        assert provider.key == f"{self.EMAIL_ID}-subscriptions-{self.STRIPE_ACCOUNT_ID}".lower()

    def test_serialize_happy_path(self, subscription_factory):
        cache_provider = self.get_provider()
        data = cache_provider.serialize([(sub := subscription_factory.get())])
        assert data[sub.id]["id"] == sub.id
        assert isinstance(data[sub.id], ReturnDict)
        assert isinstance(data[sub.id].serializer, cache_provider.serializer)

    def test_upsert(self, mock_redis_cache_for_subs_factory, subscription_factory):
        cache_provider = self.get_provider()
        mock_redis_cache = mock_redis_cache_for_subs_factory.get(cache_provider)
        cache_provider.upsert([(sub := subscription_factory.get())])
        cached = json.loads(mock_redis_cache._data.get(cache_provider.key))
        assert cached[sub.id]["id"] == sub.id

    def test_load_when_empty(self, mock_redis_cache_for_subs_factory):
        cache_provider = self.get_provider()
        mock_redis_cache_for_subs_factory.get(cache_provider)
        assert cache_provider.load() == []

    def test_load_happy_path(self, mock_redis_cache_for_subs_factory, subscription_factory):
        cache_provider = self.get_provider()
        mock_redis_cache_for_subs_factory.get(cache_provider)
        cache_provider.upsert([(sub := subscription_factory.get())])
        cached = cache_provider.load()
        assert cached[0].id == sub.id
