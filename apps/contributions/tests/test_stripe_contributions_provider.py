import datetime
import json

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
def pi_without_invoice(pi_for_valid_one_time_factory):
    return pi_for_valid_one_time_factory.get(invoice=None)


@pytest.fixture
def pi_with_invoice_but_falsy_lines_data(pi_for_active_subscription_factory):
    pi = pi_for_active_subscription_factory.get()
    pi.invoice.lines.data = []
    return pi


@pytest.fixture
def pi_for_canceled_subscription(pi_for_active_subscription_factory):
    pi = pi_for_active_subscription_factory.get()
    pi.invoice.subscription.status = "canceled"
    return pi


@pytest.fixture
def pi_no_metadata(pi_for_valid_one_time_factory):
    return pi_for_valid_one_time_factory.get(metadata=None)


@pytest.fixture
def pi_no_revenue_program_in_metadata(pi_for_valid_one_time_factory):
    return pi_for_valid_one_time_factory.get(metadata={"foo": "bar"})


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


@pytest.mark.django_db
class TestStripePaymentIntent:
    def test_payment_intent_with_canceled_subscription(self, pi_for_canceled_subscription):
        payment_intent = StripePaymentIntent(pi_for_canceled_subscription)
        assert payment_intent.subscription_id == pi_for_canceled_subscription.invoice.subscription.id
        assert payment_intent.is_modifiable is False
        assert payment_intent.is_cancelable is False

    def test_payment_intent_with_active_subscription(self, pi_for_active_subscription):
        payment_intent = StripePaymentIntent(pi_for_active_subscription)
        assert payment_intent.subscription_id == pi_for_active_subscription.invoice.subscription.id
        assert payment_intent.is_modifiable is True
        assert payment_intent.is_cancelable is True

    def test_invoice_line_item_when_no_invoice(self, pi_without_invoice):
        assert StripePaymentIntent(pi_without_invoice).invoice_line_item == {}

    def test_invoice_line_item_when_invoice_but_no_lines(self, pi_with_invoice_but_falsy_lines_data):
        assert StripePaymentIntent(pi_with_invoice_but_falsy_lines_data).invoice_line_item == {}

    def test_invoice_line_item_when_lines(self, pi_for_active_subscription):
        assert (
            StripePaymentIntent(pi_for_active_subscription).invoice_line_item
            == pi_for_active_subscription.invoice.lines.data[0]
        )

    def test_revenue_program(self, pi_for_valid_one_time):
        assert (
            StripePaymentIntent(pi_for_valid_one_time).revenue_program
            == pi_for_valid_one_time.metadata["revenue_program_slug"]
        )

    def test_revenue_program_when_no_metadata(self, pi_no_metadata):
        with pytest.raises(InvalidMetadataError):
            StripePaymentIntent(pi_no_metadata).revenue_program

    def test_revenue_program_when_rp_slug_not_in_metadata(self, pi_no_revenue_program_in_metadata):
        with pytest.raises(InvalidMetadataError):
            StripePaymentIntent(pi_no_revenue_program_in_metadata).revenue_program

    def test_subscription_id_when_one_time(self, pi_for_valid_one_time):
        assert StripePaymentIntent(pi_for_valid_one_time).subscription_id is None

    def test_subscription_id_when_recurring(self, pi_for_active_subscription):
        assert (
            StripePaymentIntent(pi_for_active_subscription).subscription_id
            == pi_for_active_subscription.invoice.subscription.id
        )

    # TODO: [DEV-3987] Fix StripePaymentIntent.refunded property
    # We'll test this once there is a functional implementation. At the moment
    # the real implementation is faulty, so no reason to test it.
    # def test_refunded(self):
    #     pass

    def test_id(self, pi_for_valid_one_time):
        assert StripePaymentIntent(pi_for_valid_one_time).id == pi_for_valid_one_time.id

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

    def test_last_payment_date_when_no_invoice(self, pi_without_invoice):
        # StripePaymentIntent(pi_without_invoice).last_payment_date generates dates with microseconds
        # whilst datetime.datetime.fromtimestamp doesn't. Setting the microseconds to 0 so tests pass
        assert StripePaymentIntent(pi_without_invoice).last_payment_date == datetime.datetime.fromtimestamp(
            int(pi_without_invoice.created), tz=datetime.timezone.utc
        ).replace(microsecond=0)

    def test_last_payment_date_when_status_transitions_no_paid_at(self, pi_for_active_subscription):
        pi_for_active_subscription.invoice.status_transitions.paid_at = None
        assert StripePaymentIntent(pi_for_active_subscription).last_payment_date is None

    def test_last_payment_date_when_status_transitions_paid_at(self, pi_for_active_subscription):
        # StripePaymentIntent(pi_without_invoice).last_payment_date generates dates with microseconds
        # whilst datetime.datetime.fromtimestamp doesn't. Setting the microseconds to 0 so tests pass
        assert (paid_at := pi_for_active_subscription.invoice.status_transitions.paid_at)
        assert StripePaymentIntent(pi_for_active_subscription).last_payment_date == datetime.datetime.fromtimestamp(
            paid_at, tz=datetime.timezone.utc
        ).replace(microsecond=0)

    def test_credit_card_expiration_date_when_card_has_month(self, pi_for_valid_one_time):
        assert pi_for_valid_one_time.payment_method.card.exp_month
        assert (
            StripePaymentIntent(pi_for_valid_one_time).credit_card_expiration_date
            == f"{pi_for_valid_one_time.payment_method.card.exp_month}/{pi_for_valid_one_time.payment_method.card.exp_year}"
        )

    def test_credit_card_expiration_date_when_card_not_have_month(self, pi_no_pm_no_invoice_charges_is_zero_length):
        assert StripePaymentIntent(pi_no_pm_no_invoice_charges_is_zero_length).credit_card_expiration_date is None

    @pytest.mark.parametrize(
        "payment_method, expected",
        (
            (None, None),
            (stripe.PaymentMethod.construct_from({"type": "card"}, "test"), "card"),
        ),
    )
    def test_payment_type(self, payment_method, expected, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripePaymentIntent.payment_method",
            return_value=payment_method,
            new_callable=mocker.PropertyMock,
        )
        assert StripePaymentIntent(None).payment_type == expected

    def test_interval_when_no_invoice(self, pi_without_invoice):
        assert StripePaymentIntent(pi_without_invoice).interval is ContributionInterval.ONE_TIME

    @pytest.mark.parametrize(
        "interval, interval_count, expected_val, expected_error",
        (
            ("year", 1, ContributionInterval.YEARLY, None),
            ("month", 1, ContributionInterval.MONTHLY, None),
            ("unexpected", 1, None, InvalidIntervalError),
            ("year", 2, None, InvalidIntervalError),
            ("month", 2, None, InvalidIntervalError),
        ),
    )
    def test_interval_when_invoice(self, interval, interval_count, expected_val, expected_error):
        pi = stripe.PaymentIntent.construct_from(
            {
                "id": "pi_1",
                "invoice": {
                    "lines": {
                        "data": [
                            {
                                "plan": {"interval": interval, "interval_count": interval_count},
                            }
                        ]
                    }
                },
            },
            key="test",
        )
        if expected_error:
            with pytest.raises(expected_error):
                StripePaymentIntent(pi).interval
        else:
            assert StripePaymentIntent(pi).interval == expected_val

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
            (
                pytest_cases.fixture_ref("pi_for_accepted_flagged_recurring_contribution"),
                lambda x: x.invoice.subscription.default_payment_method,
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
        assert result.created == datetime.datetime.fromtimestamp(sub.created, tz=datetime.timezone.utc).replace(
            microsecond=0
        )
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

    def test_convert_uninvoiced_subs_into_contributions_ignores_ignorable_errors(revenue_program, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripeContributionsProvider.cast_subscription_to_pi_for_portal",
            side_effect=[ContributionIgnorableError("ruh roh")],
        )
        logger_spy = mocker.spy(logger, "warning")
        provider = ContributionsCacheProvider(email_id="", stripe_account_id="")
        subs = [(sub1 := mocker.Mock(id="my-id"))]
        assert provider.convert_uninvoiced_subs_into_contributions(subs) == []
        logger_spy.assert_called_once_with(
            "Unable to cast subscription %s to a portal contribution", sub1.id, exc_info=mocker.ANY
        )

    def test_serialize_when_invalid_metadata_on_a_pi(self, pi_for_active_subscription_factory, mocker):
        logger_spy = mocker.patch("apps.contributions.stripe_contributions_provider.logger.warning")
        invalid = pi_for_active_subscription_factory.get()
        valid = pi_for_active_subscription_factory.get()
        invalid.metadata = {"foo": "bar"}
        provider = ContributionsCacheProvider(email_id="foo@bar.com", stripe_account_id="test")
        serialized = provider.serialize([invalid, valid])
        logger_spy.assert_called_once_with(
            "Unable to process Contribution [%s]",
            invalid.id,
            exc_info=mocker.ANY,
        )

        assert isinstance(logger_spy.call_args[1]["exc_info"], InvalidMetadataError)
        assert set(serialized.keys()) == {valid.id}


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
