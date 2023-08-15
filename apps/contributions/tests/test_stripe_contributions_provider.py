import datetime
import json
from copy import deepcopy

import pytest
import pytest_cases
import stripe
from addict import Dict as AttrDict

from apps.contributions.exceptions import (
    ContributionIgnorableError,
    InvalidIntervalError,
    InvalidMetadataError,
)
from apps.contributions.models import ContributionInterval, ContributionStatus
from apps.contributions.serializers import SubscriptionsSerializer
from apps.contributions.stripe_contributions_provider import (
    MAX_STRIPE_CUSTOMERS_LIMIT,
    MAX_STRIPE_RESPONSE_LIMIT,
    StripePaymentIntentsProvider,
    StripePiAsPortalContribution,
    StripePiAsPortalContributionCacheProvider,
    StripePiSearchResponse,
    StripeSubscriptionsCacheProvider,
    logger,
)
from apps.contributions.tests import RedisMock


@pytest.fixture
def pi_without_invoice(pi_for_valid_one_time):
    assert pi_for_valid_one_time.invoice is None
    return pi_for_valid_one_time


@pytest.fixture
def pi_one_time_with_required_expanded_attributes(pi_for_valid_one_time):
    assert pi_for_valid_one_time.invoice is None
    assert pi_for_valid_one_time.payment_method is not None
    return pi_for_valid_one_time


@pytest.fixture
def pi_recurring_with_required_expanded_attributes(pi_for_active_subscription):
    assert pi_for_active_subscription.invoice is not None
    assert pi_for_active_subscription.invoice.subscription is not None
    assert pi_for_active_subscription.payment_method is not None
    return pi_for_active_subscription


@pytest.fixture
def pi_recurring_with_missing_subscription(pi_data_for_active_subscription):
    pi_data = deepcopy(pi_data_for_active_subscription)
    pi_data["invoice"]["subscription"] = None
    return stripe.PaymentIntent.construct_from(pi_data, key="test")


@pytest.fixture
def pi_missing_payment_method(default_paid_pi_data_factory):
    data = default_paid_pi_data_factory.get() | {"payment_method": None}
    return stripe.PaymentIntent.construct_from(data, key="test")


class TestStripePiAsPortalContribution:
    @pytest_cases.parametrize(
        "pi",
        (
            pytest_cases.fixture_ref(pi_one_time_with_required_expanded_attributes),
            pytest_cases.fixture_ref(pi_recurring_with_required_expanded_attributes),
        ),
    )
    def test_ensure_payment_intent_expanded_happy_path(self, pi):
        assert StripePiAsPortalContribution(pi).ensure_payment_intent_expanded() is None

    @pytest_cases.parametrize(
        "pi, msg_fn",
        (
            (
                pytest_cases.fixture_ref(pi_missing_payment_method),
                lambda id: f"PaymentIntent {id} does not have required attributes: ['payment_method']",
            ),
            (
                pytest_cases.fixture_ref(pi_recurring_with_missing_subscription),
                lambda id: f"PaymentIntent {id} does not have required attributes: ['invoice.subscription']",
            ),
        ),
    )
    def test_ensure_payment_intent_expanded_when_problems(self, pi, msg_fn):
        with pytest.raises(ContributionIgnorableError) as exc:
            StripePiAsPortalContribution(pi).ensure_payment_intent_expanded()
        assert str(exc.value) == msg_fn(pi.id)

    def test_post_init_calls_ensure_payment_intent_expanded(
        self, mocker, pi_one_time_with_required_expanded_attributes
    ):
        mock_ensure = mocker.patch.object(StripePiAsPortalContribution, "ensure_payment_intent_expanded")
        StripePiAsPortalContribution(pi_one_time_with_required_expanded_attributes)
        mock_ensure.assert_called_once()

    def test_invoice_line_item_when_no_invoice(self, pi_without_invoice):
        assert StripePiAsPortalContribution(pi_without_invoice).invoice_line_item == {}

    def test_invoice_line_item_when_line_items(self, pi_for_active_subscription):
        assert (
            StripePiAsPortalContribution(pi_for_active_subscription).invoice_line_item
            == pi_for_active_subscription.invoice.lines.data[0]
        )

    def test_is_cancelable_when_no_invoice(self, pi_without_invoice):
        assert StripePiAsPortalContribution(pi_without_invoice).is_cancelable is False

    @pytest.mark.parametrize("status", StripePiAsPortalContribution.CANCELABLE_SUBSCRIPTION_STATUSES)
    def test_is_cancelable_when_status_cancellable_status(self, status, pi_for_active_subscription):
        pi_for_active_subscription.invoice.subscription.status = status
        assert StripePiAsPortalContribution(pi_for_active_subscription).is_cancelable is True

    @pytest.mark.parametrize(
        "status", ["incomplete", "incomplete_expired", "unpaid", "canceled", "unexpected-made-up-status"]
    )
    def test_is_cancelable_when_status_not_cancellable_status(self, status, pi_for_active_subscription):
        pi_for_active_subscription.invoice.subscription.status = status
        assert StripePiAsPortalContribution(pi_for_active_subscription).is_cancelable is False

    def test_is_modifiable_when_no_invoice(self, pi_without_invoice):
        assert StripePiAsPortalContribution(pi_without_invoice).is_modifiable is False

    @pytest.mark.parametrize("status", StripePiAsPortalContribution.MODIFIABLE_SUBSCRIPTION_STATUSES)
    def test_is_modifiable_when_subscription_status_permits_modification(self, status, pi_for_active_subscription):
        pi_for_active_subscription.invoice.subscription.status = status
        assert StripePiAsPortalContribution(pi_for_active_subscription).is_modifiable is True

    @pytest.mark.parametrize("status", ["incomplete_expired", "canceled", "unpaid", "some-unexpected-status"])
    def test_is_modifiable_when_subscription_status_not_permit_modification(self, status, pi_for_active_subscription):
        pi_for_active_subscription.invoice.subscription.status = status
        assert StripePiAsPortalContribution(pi_for_active_subscription).is_modifiable is False

    def test_interval_when_no_invoice(self, pi_without_invoice):
        assert StripePiAsPortalContribution(pi_without_invoice).interval == ContributionInterval.ONE_TIME

    def test_interval_when_unexpected_interval_count(self, pi_for_active_subscription):
        pi_for_active_subscription.invoice.subscription.plan.interval_count = (count := 2)
        with pytest.raises(InvalidIntervalError) as exc:
            StripePiAsPortalContribution(pi_for_active_subscription).interval
        assert (
            str(exc.value) == f"Unexpected interval_count ({count}) for payment_intent {pi_for_active_subscription.id}"
        )

    def test_interval_when_unexpected_interval(self, pi_for_active_subscription):
        pi_for_active_subscription.invoice.subscription.plan.interval = (interval := "some-unexpected-interval")
        with pytest.raises(InvalidIntervalError) as exc:
            StripePiAsPortalContribution(pi_for_active_subscription).interval
        assert (
            str(exc.value)
            == f"Unexpected plan interval ({interval}) for payment_intent {pi_for_active_subscription.id}"
        )

    @pytest.mark.parametrize(
        "plan_interval, expected", (("month", ContributionInterval.MONTHLY), ("year", ContributionInterval.YEARLY))
    )
    def test_interval_happy_path(self, plan_interval, expected, pi_for_active_subscription):
        pi_for_active_subscription.invoice.subscription.plan.interval = plan_interval
        assert StripePiAsPortalContribution(pi_for_active_subscription).interval == expected

    def test_revenue_program_when_no_available_metadata(self, pi_for_valid_one_time, mocker):
        pi_for_valid_one_time.metadata = {}
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripePiAsPortalContribution.invoice_line_item",
            return_value=AttrDict({"metadata": None}),
            new_callable=mocker.PropertyMock,
        )
        with pytest.raises(InvalidMetadataError) as exc:
            StripePiAsPortalContribution(pi_for_valid_one_time).revenue_program
        assert (
            str(exc.value)
            == f"Cannot determine revenue_program for payment intent {pi_for_valid_one_time.id} because metadata is missing"
        )

    def test_revenue_program_when_metadata_on_pi_but_missing_rp_slug(self, pi_for_valid_one_time):
        pi_for_valid_one_time.metadata = {"some": "metadata"}
        with pytest.raises(InvalidMetadataError) as exc:
            StripePiAsPortalContribution(pi_for_valid_one_time).revenue_program
        assert str(exc.value) == (
            f"Cannot determine revenue_program for payment intent {pi_for_valid_one_time.id} "
            f"because metadata in payment intent doesn't have revenue_program_slug"
        )

    def test_revenue_program_when_metadata_on_pi_invoice_but_missing_rp_slug(self, pi_for_active_subscription, mocker):
        pi_for_active_subscription.metadata = None
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripePiAsPortalContribution.invoice_line_item",
            return_value=AttrDict({"metadata": AttrDict({})}),
            new_callable=mocker.PropertyMock,
        )
        with pytest.raises(InvalidMetadataError) as exc:
            StripePiAsPortalContribution(pi_for_active_subscription).revenue_program
        assert str(exc.value) == (
            f"Cannot determine revenue_program for payment intent {pi_for_active_subscription.id} "
            f"because metadata in invoice line item doesn't have revenue_program_slug"
        )

    def test_revenue_program_when_valid_metadata_on_pi(self, pi_for_valid_one_time):
        assert (slug := pi_for_valid_one_time.metadata["revenue_program_slug"])
        assert StripePiAsPortalContribution(pi_for_valid_one_time).revenue_program == slug

    def test_revenue_program_when_valid_metadata_on_pi_invoice(self, pi_for_active_subscription, mocker):
        pi_for_active_subscription.metadata = None
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripePiAsPortalContribution.invoice_line_item",
            return_value=AttrDict({"metadata": {"revenue_program_slug": (rp := "some-slug")}}),
            new_callable=mocker.PropertyMock,
        )
        assert StripePiAsPortalContribution(pi_for_active_subscription).revenue_program == rp

    def test_subscription_id_when_no_invoice(self, pi_for_valid_one_time):
        assert pi_for_valid_one_time.invoice is None
        assert StripePiAsPortalContribution(pi_for_valid_one_time).subscription_id is None

    def test_subscription_id_happy_path(self, pi_for_active_subscription):
        assert (
            StripePiAsPortalContribution(pi_for_active_subscription).subscription_id
            == pi_for_active_subscription.invoice.subscription.id
        )

    def test_card_when_no_card_data(self, pi_for_valid_one_time):
        pi_for_valid_one_time.payment_method.card = None
        assert StripePiAsPortalContribution(pi_for_valid_one_time).card == AttrDict(
            {"brand": None, "last4": None, "exp_month": None}
        )

    def test_card_when_card_data(self, pi_for_valid_one_time):
        assert (card := pi_for_valid_one_time.payment_method.card) is not None
        assert StripePiAsPortalContribution(pi_for_valid_one_time).card == AttrDict(
            {
                "brand": card.brand,
                "last4": card.last4,
                "exp_month": card.exp_month,
                "exp_year": card.exp_year,
            }
        )

    def test_card_brand(self, pi_for_valid_one_time):
        assert (card := pi_for_valid_one_time.payment_method.card) is not None
        assert StripePiAsPortalContribution(pi_for_valid_one_time).card_brand == card.brand

    def test_last4(self, pi_for_valid_one_time):
        assert (card := pi_for_valid_one_time.payment_method.card) is not None
        assert StripePiAsPortalContribution(pi_for_valid_one_time).last4 == card.last4

    def test_amount(self, pi_for_valid_one_time):
        assert StripePiAsPortalContribution(pi_for_valid_one_time).amount == pi_for_valid_one_time.amount

    def test_created(self, pi_for_valid_one_time):
        assert StripePiAsPortalContribution(pi_for_valid_one_time).created == datetime.datetime.fromtimestamp(
            pi_for_valid_one_time.created, tz=datetime.timezone.utc
        )

    def test_provider_customer_id(self, pi_for_valid_one_time):
        assert (
            StripePiAsPortalContribution(pi_for_valid_one_time).provider_customer_id == pi_for_valid_one_time.customer
        )

    def test_last_payment_date_when_no_invoice(self, pi_for_valid_one_time):
        assert pi_for_valid_one_time.invoice is None
        assert StripePiAsPortalContribution(pi_for_valid_one_time).last_payment_date == datetime.datetime.fromtimestamp(
            pi_for_valid_one_time.created, tz=datetime.timezone.utc
        )

    def test_last_payment_date_when_invoice(self, pi_for_active_subscription):
        assert StripePiAsPortalContribution(
            pi_for_active_subscription
        ).last_payment_date == datetime.datetime.fromtimestamp(
            pi_for_active_subscription.invoice.status_transitions.paid_at, tz=datetime.timezone.utc
        )

    def test_status_when_refunded(self, pi_for_valid_one_time, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripePiAsPortalContribution.refunded",
            return_value=True,
            new_callable=mocker.PropertyMock,
        )
        assert StripePiAsPortalContribution(pi_for_valid_one_time).status == ContributionStatus.REFUNDED

    def test_status_when_succeeded(self, pi_for_valid_one_time, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripePiAsPortalContribution.refunded",
            return_value=False,
            new_callable=mocker.PropertyMock,
        )
        pi_for_valid_one_time.status = "succeeded"
        assert StripePiAsPortalContribution(pi_for_valid_one_time).status == ContributionStatus.PAID

    # NB: this is here because it's a branch through .status code, however "pending" does not appear
    # to be a valid PI status
    # TODO: [DEV-3855]
    def test_status_when_pending(self, pi_for_valid_one_time, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripePiAsPortalContribution.refunded",
            return_value=False,
            new_callable=mocker.PropertyMock,
        )
        pi_for_valid_one_time.status = "pending"
        assert StripePiAsPortalContribution(pi_for_valid_one_time).status == ContributionStatus.PROCESSING

    @pytest.mark.parametrize(
        "pi_status",
        (
            # all but the final of these are actual stripe PI statuses
            "requires_payment_method",
            "requires_confirmation",
            "requires_action",
            "processing",
            "requires_capture",
            "canceled",
            "unexpected-made-up-status",
        ),
    )
    def test_status_when_not_refunded_succeeded_or_pending(self, pi_status, pi_for_valid_one_time, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripePiAsPortalContribution.refunded",
            return_value=False,
            new_callable=mocker.PropertyMock,
        )
        pi_for_valid_one_time.status = pi_status
        assert StripePiAsPortalContribution(pi_for_valid_one_time).status == ContributionStatus.FAILED

    def test_credit_card_expiration_date_happy_path(self, pi_for_valid_one_time, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripePiAsPortalContribution.card",
            (card := AttrDict({"exp_year": 2029, "exp_month": 12})),
        )
        assert (
            StripePiAsPortalContribution(pi_for_valid_one_time).credit_card_expiration_date
            == f"{card.exp_month}/{card.exp_year}"
        )

    @pytest.mark.parametrize("month, year", ((None, None), (None, 2029), (12, None)))
    def test_credit_card_expiration_date_when_missing_card_date(self, month, year, pi_for_valid_one_time, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripePiAsPortalContribution.card",
            AttrDict({"exp_year": year, "exp_month": month}),
        )
        assert StripePiAsPortalContribution(pi_for_valid_one_time).credit_card_expiration_date is None

    def test_payment_type_happy_path(self, pi_for_valid_one_time):
        assert pi_for_valid_one_time.payment_method
        assert (
            StripePiAsPortalContribution(pi_for_valid_one_time).payment_type
            == pi_for_valid_one_time.payment_method.type
        )

    @pytest.mark.parametrize(
        "pi_refunded, amount_refunded, expected",
        (
            (False, 0, False),
            (False, 1, True),
            (True, 0, True),
            (True, 1, True),
        ),
    )
    def test_refunded(self, pi_refunded, amount_refunded, expected, pi_for_valid_one_time):
        pi_for_valid_one_time.refunded = pi_refunded
        pi_for_valid_one_time.amount_refunded = amount_refunded
        assert StripePiAsPortalContribution(pi_for_valid_one_time).refunded == expected

    def test_id(self, pi_for_valid_one_time):
        assert StripePiAsPortalContribution(pi_for_valid_one_time).id == pi_for_valid_one_time.id


class TestStripePiSearchResponse:
    def test_init(self):
        StripePiSearchResponse(
            data=[stripe.PaymentIntent.construct_from({"id": "pi_1", "amount": 100}, key="test")],
            has_more=False,
            url="https://stripe.com",
            headers=AttrDict({"request-id": "1234"}),
        )


@pytest.fixture
def customer_factory(faker):
    class Factory:
        def get(self):
            return stripe.Customer.construct_from(
                {"id": faker.pystr_format(string_format="cust_?????"), "name": faker.name()}, key="test"
            )

    return Factory()


class TestStripePaymentIntentsProvider:
    def test_customers(self, mocker, customer_factory):
        customers = [customer_factory.get(), customer_factory.get()]
        mock_search = mocker.patch("stripe.Customer.search")
        mock_search.return_value.auto_paging_iter.return_value = customers
        assert StripePaymentIntentsProvider(
            email_id=(email := "foo@bar.com"), stripe_account_id=(id := "test")
        ).customers == [x.id for x in customers]
        mock_search.assert_called_once_with(
            query=f"email:'{email}'", limit=MAX_STRIPE_RESPONSE_LIMIT, stripe_account=id
        )

    def test_generate_chunked_customers_query(self, mocker, customer_factory):
        customers = [customer_factory.get().id for _ in range(MAX_STRIPE_CUSTOMERS_LIMIT + 1)]
        mocker.patch.object(
            StripePaymentIntentsProvider, "customers", new_callable=mocker.PropertyMock, return_value=customers
        )
        query = list(
            StripePaymentIntentsProvider(
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
        provider = StripePaymentIntentsProvider(email_id="foo@bar.com", stripe_account_id="test")
        pis = provider.fetch_payment_intents(query=(query := "foo"), page=page)
        assert isinstance(pis, StripePiSearchResponse)
        assert pis.data == mock_search_result.data
        assert pis.has_more == mock_search_result.has_more
        assert pis.url == mock_search_result.url
        assert pis.next_page == mock_search_result.next_page

        mock_search_kwargs = {
            "query": query,
            "expand": provider.EXPAND_FIELDS,
            "limit": MAX_STRIPE_RESPONSE_LIMIT,
            "stripe_account": provider.stripe_account_id,
        }
        if page:
            mock_search_kwargs["page"] = page

        mock_search.assert_called_once_with(**mock_search_kwargs)


@pytest.fixture
def mock_redis_cache_for_pis(mocker):
    redis_mock = RedisMock()
    mocker.patch.object(StripePiAsPortalContributionCacheProvider, "cache", redis_mock)
    return redis_mock


@pytest.fixture
def mock_redis_cache_for_subs(mocker):
    redis_mock = RedisMock()
    mocker.patch.object(StripeSubscriptionsCacheProvider, "cache", redis_mock)
    return redis_mock


class TestStripePiAsPortalContributionCacheProvider:
    def test_key(self):
        assert (
            StripePiAsPortalContributionCacheProvider(
                stripe_account_id=(id := "foo"), email_id=(email_id := "test")
            ).key
            == f"{email_id}-payment-intents-{id}"
        )

    def test_serialize(self, pi_for_active_subscription, pi_for_valid_one_time):
        provider = StripePiAsPortalContributionCacheProvider(stripe_account_id="bogus", email_id="test@email.com")
        data = provider.serialize([pi_for_active_subscription, pi_for_valid_one_time])
        for x in [pi_for_active_subscription, pi_for_valid_one_time]:
            serialized = data[x.id]
            assert isinstance(serialized, StripePiAsPortalContributionCacheProvider.serializer)

    def test_serialize_when_serializer_invalid(self, pi_for_valid_one_time, mocker):
        pi_for_valid_one_time.payment_method.card.brand = "bogus"
        logger_spy = mocker.spy(logger, "info")
        provider = StripePiAsPortalContributionCacheProvider(stripe_account_id="bogus", email_id="test@email.com")
        data = provider.serialize([pi_for_valid_one_time])
        assert data == {}
        assert logger_spy.call_count == 3
        assert logger_spy.call_args_list[1] == mocker.call(
            "Unable to serialize payment intent %s because %s",
            pi_for_valid_one_time.id,
            ['card_brand: "bogus" is not a valid choice.'],
        )
        assert logger_spy.call_args_list[2] == mocker.call(
            "Unable to serialize payment intent %s", pi_for_valid_one_time.id, exc_info=mocker.ANY
        )

    def test_serialize_when_converter_invalid(self, pi_for_valid_one_time, mocker):
        logger_spy = mocker.spy(logger, "info")
        # StripePiAsPortalContribution will raise an InvalidMetadataError
        # if this key is not in metadata
        del pi_for_valid_one_time.metadata["revenue_program_slug"]
        provider = StripePiAsPortalContributionCacheProvider(stripe_account_id="bogus", email_id="test@email.com")
        data = provider.serialize([pi_for_valid_one_time])
        assert data == {}
        assert logger_spy.call_args_list[1] == mocker.call(
            "Unable to serialize payment intent %s", pi_for_valid_one_time.id, exc_info=mocker.ANY
        )

    def test_upsert(self, pi_for_valid_one_time, pi_for_active_subscription, mock_redis_cache_for_pis):
        provider = StripePiAsPortalContributionCacheProvider(
            stripe_account_id=(id := "bogus"), email_id=(email := "test@email.com")
        )
        provider.upsert((pis := [pi_for_valid_one_time, pi_for_active_subscription]))
        cached = json.loads(mock_redis_cache_for_pis._data.get(f"{email}-payment-intents-{id}"))
        for x in pis:
            assert cached[x.id] == dict(
                StripePiAsPortalContributionCacheProvider.serializer(
                    instance=StripePiAsPortalContributionCacheProvider.converter(x)
                ).data
            ) | {"stripe_account_id": id}

    def test_upsert_overwrites(self, pi_for_active_subscription, pi_for_valid_one_time, mock_redis_cache_for_pis):
        provider = StripePiAsPortalContributionCacheProvider(
            stripe_account_id=(id := "bogus"), email_id=(email := "test@email.com")
        )
        provider.upsert([pi_for_active_subscription])
        cached = json.loads(mock_redis_cache_for_pis._data.get(f"{email}-payment-intents-{id}"))
        assert len(cached) == 1
        assert pi_for_active_subscription.id in cached
        provider.upsert([pi_for_valid_one_time])
        cached = json.loads(mock_redis_cache_for_pis._data.get(f"{email}-payment-intents-{id}"))
        assert len(cached) == 2
        assert pi_for_valid_one_time.id in cached

    def test_upsert_updates(self, pi_for_active_subscription, mock_redis_cache_for_pis):
        provider = StripePiAsPortalContributionCacheProvider(
            stripe_account_id=(id := "bogus"), email_id=(email := "test@email.com")
        )
        provider.upsert([pi_for_active_subscription])
        cached = json.loads(mock_redis_cache_for_pis._data.get(f"{email}-payment-intents-{id}"))
        assert cached[pi_for_active_subscription.id]["amount"] == pi_for_active_subscription.amount
        new_amt = 3737
        assert pi_for_active_subscription.amount != new_amt
        pi_for_active_subscription.amount = new_amt
        provider.upsert([pi_for_active_subscription])
        cached = json.loads(mock_redis_cache_for_pis._data.get(f"{email}-payment-intents-{id}"))
        assert cached[pi_for_active_subscription.id]["amount"] == new_amt

    def test_load_when_no_data(self, mock_redis_cache_for_pis):
        provider = StripePiAsPortalContributionCacheProvider(stripe_account_id="bogus", email_id="test@email.com")
        assert provider.load() == []

    def test_load_happy_path(
        self, pi_for_active_subscription, pi_for_valid_one_time, mock_redis_cache_for_pis, settings
    ):
        settings.STRIPE_CURRENT_SECRET_KEY_CONTRIBUTION = "bogus"
        provider = StripePiAsPortalContributionCacheProvider(
            stripe_account_id=(id := "bogus"), email_id="test@email.com"
        )
        provider.upsert((pis := [pi_for_active_subscription, pi_for_valid_one_time]))
        cached = provider.load()
        for i, x in enumerate(pis):
            assert cached[i] == dict(
                StripePiAsPortalContributionCacheProvider.serializer(
                    instance=StripePiAsPortalContributionCacheProvider.converter(x)
                ).data
            ) | {"stripe_account_id": id}


class TestStripeSubscriptionsCacheProvider:
    def test_key(self):
        assert (
            StripeSubscriptionsCacheProvider(stripe_account_id=(id := "foo"), email_id=(email_id := "test")).key
            == f"{email_id}-subscriptions-{id}"
        )

    def test_upsert_when_validation_error(self, subscription_data_factory, mocker):
        data = subscription_data_factory.get()
        # this should make the serializer raise a ValidationError
        data["default_payment_method"] = None
        subscription = stripe.Subscription.construct_from(data, "bogus")
        mock_logger = mocker.spy(logger, "warning")
        provider = StripeSubscriptionsCacheProvider(stripe_account_id="bogus", email_id="test")
        cached = provider.load()
        assert cached == []
        provider.upsert([subscription])
        cached = provider.load()
        assert cached == []
        mock_logger.assert_called_once_with(
            "Unable to process Subscription [%s] due to [%s]", subscription.id, type(AttributeError(""))
        )

    def test_upsert_happy_path(self, subscription_data_factory, mock_redis_cache_for_subs):
        subs = [stripe.Subscription.construct_from(subscription_data_factory.get(), "bogus") for _ in range(2)]
        provider = StripeSubscriptionsCacheProvider(
            stripe_account_id=(id := "bogus"), email_id=(email := "test@foo.com")
        )
        provider.upsert(subs)
        cached = json.loads(mock_redis_cache_for_subs._data.get(f"{email}-subscriptions-{id}"))
        assert len(cached) == len(subs)
        for x in subs:
            expected = dict(SubscriptionsSerializer(x).data) | {"stripe_account_id": id}
            for y in ["last_payment_date", "next_payment_date", "created"]:
                expected[y] = expected[y].strftime("%Y-%m-%dT%H:%M:%SZ")
            assert cached[x.id] == expected

    def test_upsert_overwrites(self, subscription_data_factory, mock_redis_cache_for_subs):
        sub1 = stripe.Subscription.construct_from(subscription_data_factory.get(), "bogus")
        sub2 = stripe.Subscription.construct_from(subscription_data_factory.get(), "bogus")
        provider = StripeSubscriptionsCacheProvider(
            stripe_account_id=(id := "bogus"), email_id=(email := "test@email.com")
        )
        provider.upsert([sub1])
        cached = json.loads(mock_redis_cache_for_subs._data.get(f"{email}-subscriptions-{id}"))
        assert len(cached) == 1
        assert sub1.id in cached
        provider.upsert([sub2])
        cached = json.loads(mock_redis_cache_for_subs._data.get(f"{email}-subscriptions-{id}"))
        assert len(cached) == 2
        assert sub2.id in cached

    def test_upsert_updates(self, mock_redis_cache_for_subs, subscription_data_factory):
        sub = stripe.Subscription.construct_from(subscription_data_factory.get(), "bogus")
        provider = StripeSubscriptionsCacheProvider(
            stripe_account_id=(id := "bogus"), email_id=(email := "test@email.com")
        )
        provider.upsert([sub])
        cached = json.loads(mock_redis_cache_for_subs._data.get(f"{email}-subscriptions-{id}"))
        assert cached[sub.id]["next_payment_date"] == (
            old_val := datetime.datetime.fromtimestamp(sub.current_period_end)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")
        new_val = old_val + datetime.timedelta(days=1)
        sub.current_period_end = new_val.timestamp()
        provider.upsert([sub])
        cached = json.loads(mock_redis_cache_for_subs._data.get(f"{email}-subscriptions-{id}"))
        assert (cached_date := cached[sub.id]["next_payment_date"]) == datetime.datetime.fromtimestamp(
            sub.current_period_end
        ).strftime("%Y-%m-%dT%H:%M:%SZ")
        assert datetime.datetime.strptime(cached_date, "%Y-%m-%dT%H:%M:%SZ") == new_val

    def test_load_when_cache_empty(self, mock_redis_cache_for_subs):
        provider = StripeSubscriptionsCacheProvider(stripe_account_id="bogus", email_id="test@email.com")
        assert provider.load() == []

    def test_load_when_cache_not_empty(self, subscription_data_factory, mock_redis_cache_for_subs):
        subs = [stripe.Subscription.construct_from(subscription_data_factory.get(), "bogus") for _ in range(2)]
        provider = StripeSubscriptionsCacheProvider(stripe_account_id=(id := "bogus"), email_id="test@foo.com")
        provider.upsert(subs)
        cached = provider.load()
        assert len(cached) == len(subs)
        for i, x in enumerate(subs):
            expected = dict(SubscriptionsSerializer(x).data) | {"stripe_account_id": id}
            for y in ["last_payment_date", "next_payment_date", "created"]:
                expected[y] = expected[y].strftime("%Y-%m-%dT%H:%M:%SZ")
            assert cached[i] == expected
