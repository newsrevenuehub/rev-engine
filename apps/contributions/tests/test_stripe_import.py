import datetime
import json
import random
from copy import deepcopy

from django.conf import settings

import pytest
import stripe
from django_redis import get_redis_connection

import apps.common.utils as common_utils
from apps.contributions.exceptions import (
    InvalidIntervalError,
    InvalidMetadataError,
    InvalidStripeTransactionDataError,
)
from apps.contributions.models import ContributionInterval, ContributionStatus, Payment
from apps.contributions.stripe_import import (
    CACHE_KEY_PREFIX,
    RedisCachePipeline,
    StripeEventProcessor,
    StripeTransactionsImporter,
    parse_slug_from_url,
    upsert_payment_for_transaction,
)
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
    PaymentFactory,
)
from apps.contributions.types import STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory


DOMAIN_APEX = "example.com"
PAGE_SLUG = "page-slug"


@pytest.fixture
def balance_transaction():
    return {
        "id": "bt_1",
        "net": 1000,
        "amount": 1000,
        "created": datetime.datetime.now().timestamp(),
    }


@pytest.fixture
def rp(valid_metadata):
    return RevenueProgramFactory(id=valid_metadata["revenue_program_id"])


@pytest.fixture
def page(rp):
    return DonationPageFactory(revenue_program=rp, slug=PAGE_SLUG)


@pytest.fixture
def valid_metadata(valid_metadata, domain_apex, page, settings):
    """We shadow the valid_metadata from conftest.py so we can set up rp and donation page that will
    cause validation around donation page work as expected in tests.
    """
    settings.DOMAIN_APEX = domain_apex
    valid_metadata["referer"] = f"https://{domain_apex}/{page.slug}/"
    return valid_metadata


@pytest.fixture
def subscription_dict(valid_metadata):
    return {
        "id": "sub_1",
        "customer": "cus_1",
        "metadata": valid_metadata,
        "status": "active",
        "items": {"data": [{"plan": {"amount": 1000, "currency": "usd", "interval": "month", "interval_count": 1}}]},
    }


@pytest.fixture
def payment_intent_dict(valid_metadata):
    return {
        "id": "pi_1",
        "amount": 1000,
        "currency": "usd",
        "status": "succeeded",
        "metadata": valid_metadata,
        "customer": "cus_1",
    }


class TestRedisCachePipeline:

    @pytest.fixture
    def redis(self, settings):
        return get_redis_connection(settings.STRIPE_TRANSACTIONS_IMPORT_CACHE)

    @pytest.fixture
    def name(self):
        return "foo"

    @pytest.fixture
    def batch_size(self):
        return 1

    @pytest.fixture
    def redis_cache_pipeline(self, redis, name, batch_size):
        return RedisCachePipeline(
            connection_pool=redis.connection_pool,
            response_callbacks=redis.response_callbacks,
            transaction=False,
            shard_hint=None,
            entity_name=name,
            batch_size=batch_size,
        )

    def test___init__(self, redis_cache_pipeline, name, batch_size):
        assert redis_cache_pipeline.entity_name == name
        assert redis_cache_pipeline.batch_size == batch_size
        assert redis_cache_pipeline.total_inserted == 0

    @pytest.mark.parametrize("error_on_exit", (True, False))
    def test_calls_flush_on_exit(self, redis_cache_pipeline, error_on_exit, mocker):
        mock_flush = mocker.patch.object(redis_cache_pipeline, "flush")
        mock_set_kwargs = {"side_effect": Exception("ruh-roh")} if error_on_exit else {}
        mocker.patch.object(redis_cache_pipeline, "set", **mock_set_kwargs)
        if error_on_exit:
            with pytest.raises(Exception):
                with redis_cache_pipeline as pipeline:
                    pipeline.set(entity_id="id", key="key", entity={"foo": "bar"})
            mock_flush.assert_not_called()
        else:
            with redis_cache_pipeline as pipeline:
                pipeline.set(entity_id="id", key="key", entity={"foo": "bar"})
            mock_flush.assert_called_once()

    @pytest.mark.parametrize("has_prune_fn", (True, False))
    @pytest.mark.parametrize("batch_size", (1, 2))
    def test_set(self, has_prune_fn, batch_size, redis_cache_pipeline, mocker):
        prune_fn = mocker.Mock(return_value=(entity := {"foo": "bar"}))
        mock_flush = mocker.patch.object(redis_cache_pipeline, "flush")
        redis_cache_pipeline.set(entity_id="id", key="key", entity=entity, prune_fn=prune_fn if has_prune_fn else None)
        if has_prune_fn:
            prune_fn.assert_called_once_with(entity)
        if batch_size == 1:
            mock_flush.assert_called_once()
        else:
            mock_flush.assert_not_called()

    def test_flush(self, mocker, redis_cache_pipeline):
        mock_execute = mocker.patch("redis.client.Pipeline.execute")
        redis_cache_pipeline.flush()
        mock_execute.assert_called_once()


class Test_parse_slug_from_url:

    @pytest.fixture(
        params=[
            ("https://{}/slug/", "slug"),
            ("https://{}/slug", "slug"),
            ("https://{}/", None),
            ("https://{}", None),
            ("https://{}/slug/other", "slug"),
            ("https://{}/slug/other/", "slug"),
            ("https://{}/slug/?foo=bar", "slug"),
            ("https://{}/slug?foo=bar", "slug"),
        ]
    )
    def url_case(self, request, domain_apex):
        return request.param[0].format(domain_apex), request.param[1]

    def test_parse_slug_from_url_when_allowed_domain(self, url_case):
        url, expect = url_case
        if expect:
            assert parse_slug_from_url(url) == expect
        else:
            assert parse_slug_from_url(url) is None

    def test_parse_slug_from_url_when_not_allowed_domain(self):
        with pytest.raises(InvalidStripeTransactionDataError) as exc:
            parse_slug_from_url((url := "https://random-and-malicious.com/slug/"))
        assert str(exc.value) == f"URL {url} has a TLD that is not allowed for import"


@pytest.mark.django_db
class Test_upsert_payment_for_transaction:

    @pytest.fixture
    def contribution(self):
        return ContributionFactory()

    @pytest.mark.parametrize("payment_exists", (True, False))
    @pytest.mark.parametrize("is_refund", [True, False])
    def test_happy_path(self, payment_exists, is_refund, contribution, balance_transaction):
        if payment_exists:
            PaymentFactory(
                contribution=contribution,
                stripe_balance_transaction_id=balance_transaction["id"],
            )
        payment, action = upsert_payment_for_transaction(
            contribution=contribution, transaction=balance_transaction, is_refund=is_refund
        )
        contribution.refresh_from_db()
        assert contribution.payment_set.count() == 1
        assert payment.contribution == contribution
        assert payment.stripe_balance_transaction_id == balance_transaction["id"]
        assert payment.net_amount_paid == (balance_transaction["net"] if not is_refund else 0)
        assert payment.gross_amount_paid == (balance_transaction["amount"] if not is_refund else 0)
        assert payment.amount_refunded == (balance_transaction["amount"] if is_refund else 0)
        assert payment.transaction_time
        assert action == ("updated" if payment_exists else "created")

    def test_when_transaction_is_none(self, contribution, mocker):
        logger_spy = mocker.patch("apps.contributions.stripe_import.logger.warning")
        mock_upsert = mocker.patch("apps.common.utils.upsert_with_diff_check")
        payment, action = upsert_payment_for_transaction(contribution=contribution, transaction=None)
        logger_spy.assert_called_once()
        mock_upsert.assert_not_called()
        assert payment is None
        assert action is None

    def test_when_integrity_error(self, contribution, balance_transaction, mocker):
        different_contribution = ContributionFactory()
        existing_payment = PaymentFactory(
            contribution=different_contribution, stripe_balance_transaction_id=balance_transaction["id"]
        )
        logger_spy = mocker.patch("apps.contributions.stripe_import.logger.exception")
        count = Payment.objects.count()
        payment, action = upsert_payment_for_transaction(contribution=contribution, transaction=balance_transaction)
        assert Payment.objects.count() == count
        logger_spy.assert_called_once_with(
            (
                "Integrity error occurred while upserting payment with balance transaction %s for contribution %s "
                "The existing payment is %s for contribution %s"
            ),
            balance_transaction["id"],
            contribution.id,
            existing_payment.id,
            different_contribution.id,
        )
        assert payment is None
        assert action is None


@pytest.mark.django_db
class TestStripeTransactionsImporter:

    @pytest.fixture(autouse=True)
    def patch_redis(self, mocker):
        mocker.patch("apps.contributions.stripe_import.get_redis_connection", return_value=mocker.Mock())

    @pytest.fixture(autouse=True)
    def default_settings(self, settings):
        settings.DOMAIN_APEX = DOMAIN_APEX

    def test_created_query(self, mocker):
        from_date = mocker.Mock()
        to_date = mocker.Mock()
        assert StripeTransactionsImporter(
            stripe_account_id="foo", from_date=from_date, to_date=to_date
        ).created_query == {"gte": from_date, "lte": to_date}

    @pytest.mark.parametrize("already_exists", (True, False))
    def test_get_or_create_contributor(self, already_exists):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        email = "foo@bar.com"
        if already_exists:
            ContributorFactory(email=email)
        contributor, action = instance.get_or_create_contributor(email=email)
        assert contributor.email == email
        assert action == ("retrieved" if already_exists else "created")

    @pytest.mark.parametrize(
        "plan_interval,plan_interval_count,expected",
        (
            ("year", 1, ContributionInterval.YEARLY),
            ("month", 1, ContributionInterval.MONTHLY),
            ("unexpected", 1, None),
            ("year", 2, None),
            ("month", 2, None),
            ("year", 2, None),
        ),
    )
    def test_get_interval_from_plan(self, plan_interval, plan_interval_count, expected):
        plan = {"interval": plan_interval, "interval_count": plan_interval_count}
        instance = StripeTransactionsImporter(stripe_account_id="test")

        if expected is not None:
            assert instance.get_interval_from_plan(plan) == expected
        else:
            with pytest.raises(InvalidIntervalError):
                instance.get_interval_from_plan(plan)

    @pytest.fixture
    def invalid_metadata_for_schema_version(self, valid_metadata):
        metadata = deepcopy(valid_metadata)
        metadata["schema_version"] = "unsupported"
        return metadata

    @pytest.mark.parametrize(
        "metadata, expect_error",
        (("valid_metadata", False), ("invalid_metadata", True), ("invalid_metadata_for_schema_version", True)),
    )
    def test_validate_metadata(self, request, metadata, expect_error):
        metadata = request.getfixturevalue(metadata)
        instance = StripeTransactionsImporter(stripe_account_id="test")
        if expect_error:
            with pytest.raises(InvalidMetadataError):
                instance.validate_metadata(metadata)
        else:
            instance.validate_metadata(metadata)

    @pytest.mark.parametrize(
        "referer, expect_error",
        (
            (f"https://{DOMAIN_APEX}/slug/", False),
            ("https://foo.bar/slug/", True),
            (None, True),
            ("", True),
        ),
    )
    def test_validate_referer(self, referer, expect_error):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        if expect_error:
            with pytest.raises(InvalidStripeTransactionDataError):
                instance.validate_referer(referer)
        else:
            instance.validate_referer(referer)

    @pytest.mark.parametrize(
        "status, has_refunds, expected, expect_error",
        (
            ("anything", True, ContributionStatus.REFUNDED, False),
            ("succeeded", False, ContributionStatus.PAID, False),
            ("canceled", False, ContributionStatus.CANCELED, False),
            ("processing", False, ContributionStatus.PROCESSING, False),
            ("requires_action", False, ContributionStatus.PROCESSING, False),
            ("requires_capture", False, ContributionStatus.PROCESSING, False),
            ("requires_confirmation", False, ContributionStatus.PROCESSING, False),
            ("requires_payment_method", False, ContributionStatus.PROCESSING, False),
            ("unexpected", False, None, True),
        ),
    )
    def test_get_status_for_payment_intent(self, status, has_refunds, expected, expect_error):
        pi = {
            "status": status,
            "id": "pi_1",
        }
        instance = StripeTransactionsImporter(stripe_account_id="test")
        if expect_error:
            with pytest.raises(InvalidStripeTransactionDataError):
                instance.get_status_for_payment_intent(pi, has_refunds)
        else:
            assert instance.get_status_for_payment_intent(pi, has_refunds) == expected

    @pytest.mark.parametrize(
        "status, expected",
        (
            ("active", ContributionStatus.PAID),
            ("past_due", ContributionStatus.PAID),
            ("incomplete_expired", ContributionStatus.FAILED),
            ("canceled", ContributionStatus.CANCELED),
            ("anything_else_that_arrives", ContributionStatus.PROCESSING),
            ("incomplete", ContributionStatus.PROCESSING),
            ("trialing", ContributionStatus.PROCESSING),
        ),
    )
    def test_get_status_for_subscription(self, status, expected):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        assert instance.get_status_for_subscription(subscription_status=status) == expected

    def test_list_stripe_entity(self, mocker):
        entity_name = "PaymentIntent"
        instance = StripeTransactionsImporter(stripe_account_id=(stripe_id := "test"))
        mock_list = mocker.patch("stripe.PaymentIntent.list")
        mock_list.return_value.auto_paging_iter.return_value = (result := [mocker.Mock()])
        assert instance.list_stripe_entity(entity_name) == result
        mock_list.assert_called_once_with(stripe_account=stripe_id, limit=mocker.ANY)

    @pytest.mark.parametrize(
        "schema_version, referer, expected",
        (
            (
                random.choice(list(STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS.keys())),
                (_url := "https://foo.com/slug/"),
                False,
            ),
            ("unsupported", _url, True),
            (random.choice(list(STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS.keys())), None, True),
            ("unsupported", None, True),
        ),
    )
    def test_should_exclude_from_cache_because_of_metadata(self, schema_version, referer, expected, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        metadata = {"schema_version": schema_version, "referer": referer}
        assert instance.should_exclude_from_cache_because_of_metadata(mocker.Mock(metadata=metadata)) == expected

    @pytest.mark.parametrize("init_kwargs", ({}, {"from_date": (when := datetime.datetime.utcnow()), "to_date": when}))
    def test_list_kwargs(self, init_kwargs):
        instance = StripeTransactionsImporter(stripe_account_id="test", **init_kwargs)
        assert instance.list_kwargs == (
            {"created": {"gte": instance.from_date, "lte": instance.to_date}} if init_kwargs else {}
        )

    def test_list_and_cache_entities(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_cache = mocker.patch.object(instance, "cache_stripe_resources")
        mock_list = mocker.patch.object(instance, "list_stripe_entity", return_value=(result := [mocker.Mock()]))
        instance.list_and_cache_entities("PaymentIntent")
        mock_list.assert_called_once_with("PaymentIntent")
        mock_cache.assert_called_once_with(
            entity_name="PaymentIntent", resources=result, prune_fn=None, exclude_fn=None
        )

    @pytest.mark.parametrize(
        "method, entity, has_exclude, has_prune, has_list_kwargs",
        (
            ("list_and_cache_payment_intents", "PaymentIntent", True, True, True),
            ("list_and_cache_subscriptions", "Subscription", True, True, True),
            ("list_and_cache_charges", "Charge", False, True, False),
            ("list_and_cache_refunds", "Refund", False, True, False),
            ("list_and_cache_customers", "Customer", False, True, False),
            ("list_and_cache_invoices", "Invoice", False, True, False),
            ("list_and_cache_balance_transactions", "BalanceTransaction", False, True, False),
        ),
    )
    def test_list_and_cache_methods(self, method, entity, has_exclude, has_prune, has_list_kwargs, mocker):
        mock_list_and_cache = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_entities"
        )
        mock_should_exclude = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.should_exclude_from_cache_because_of_metadata"
        )
        getattr(StripeTransactionsImporter(stripe_account_id="test"), method)()
        kwargs = {"entity_name": entity}
        if has_prune:
            kwargs["prune_fn"] = mocker.ANY
        if has_list_kwargs:
            kwargs["list_kwargs"] = mocker.ANY
        if has_exclude:
            kwargs["exclude_fn"] = mock_should_exclude
        mock_list_and_cache.assert_called_once_with(**kwargs)

    def test_get_redis_pipeline(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch("apps.contributions.stripe_import.RedisCachePipeline")
        assert instance.get_redis_pipeline(entity_name="foo")

    @pytest.mark.parametrize(
        "exclude_fn, expect_exclude",
        (
            (lambda x: False, False),
            (lambda x: True, True),
        ),
    )
    @pytest.mark.parametrize(
        "prune_fn",
        (None, lambda x: x),
    )
    def test_cache_stripe_resources(self, exclude_fn, prune_fn, expect_exclude, mocker):
        mock_pipeline = mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.get_redis_pipeline")
        resources = [mocker.Mock(id=(entity_id := "foo"), to_dict=lambda: {"id": entity_id})]
        instance = StripeTransactionsImporter(stripe_account_id="test")
        instance.cache_stripe_resources(
            entity_name=(name := "PaymentIntent"), resources=resources, exclude_fn=exclude_fn, prune_fn=prune_fn
        )
        if expect_exclude:
            mock_pipeline.return_value.__enter__.return_value.set.assert_not_called()
        else:
            mock_pipeline.return_value.__enter__.return_value.set.assert_called_once_with(
                entity_id=entity_id,
                key=instance.make_key(entity_id=entity_id, entity_name=name),
                entity=resources[0].to_dict(),
                prune_fn=prune_fn if prune_fn else None,
            )

    def test_make_key(self):
        instance = StripeTransactionsImporter(stripe_account_id=(acct_id := "test"))
        assert (
            instance.make_key(entity_id=(entity_id := "foo"), entity_name=(entity_name := "bar"))
            == f"{CACHE_KEY_PREFIX}_{entity_name}_{entity_id}_{acct_id}"
        )

    def test_cache_entity_by_another_entity_id(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_get_pipeline = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_redis_pipeline"
        )
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.scan_iter.return_value = (keys := ["foo", "bar", "bizz"])
        mock_get_resource = mocker.patch.object(
            instance,
            "get_resource_from_cache",
            side_effect=[
                (charge1 := {"payment_intent": "pi_1", "id": "ch_1"}),
                {"payment_intent": None, "id": "ch_2"},
                None,
            ],
        )
        instance.cache_entity_by_another_entity_id(
            destination_entity_name=(destination_name := "ChargeByPaymentIntentId"),
            entity_name=(entity_name := "Charge"),
            by_entity_name="payment_intent",
        )
        mock_get_pipeline.assert_called_once_with(entity_name=destination_name)
        mock_redis.scan_iter.assert_called_once_with(match=instance.make_key(entity_name=f"{entity_name}_*"))
        assert mock_get_resource.call_count == 3
        mock_get_resource.assert_has_calls([mocker.call(key) for key in keys])
        mock_get_pipeline.return_value.__enter__.return_value.set.assert_called_once_with(
            entity_id=(entity_id := f"{charge1['payment_intent']}_{charge1['id']}"),
            key=instance.make_key(entity_id=entity_id, entity_name=destination_name),
            entity=charge1,
        )

    @pytest.mark.parametrize(
        "method",
        (
            "cache_charges_by_payment_intent_id",
            "cache_invoices_by_subscription_id",
            "cache_refunds_by_charge_id",
        ),
    )
    def test_cache_entity_by_another_entity_methods(self, method, mocker):
        mock_cache_entity_by_entity = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.cache_entity_by_another_entity_id"
        )
        getattr(StripeTransactionsImporter(stripe_account_id="test"), method)()
        mock_cache_entity_by_entity.assert_called_once()

    def test_list_and_cache_required_stripe_resources(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_cache_pis = mocker.patch.object(instance, "list_and_cache_payment_intents")
        mock_cache_subs = mocker.patch.object(instance, "list_and_cache_subscriptions")
        mock_cache_charges = mocker.patch.object(instance, "list_and_cache_charges")
        mock_cache_invoices = mocker.patch.object(instance, "list_and_cache_invoices")
        mock_cache_balance_transactions = mocker.patch.object(instance, "list_and_cache_balance_transactions")
        mock_cache_customers = mocker.patch.object(instance, "list_and_cache_customers")
        mock_cache_refunds = mocker.patch.object(instance, "list_and_cache_refunds")
        mock_cache_invs_by_sub_id = mocker.patch.object(instance, "cache_invoices_by_subscription_id")
        mock_cache_charges_by_pi_id = mocker.patch.object(instance, "cache_charges_by_payment_intent_id")
        mock_cache_refunds_by_charge_id = mocker.patch.object(instance, "cache_refunds_by_charge_id")
        instance.list_and_cache_required_stripe_resources()
        for mock in (
            mock_cache_pis,
            mock_cache_subs,
            mock_cache_charges,
            mock_cache_invoices,
            mock_cache_refunds,
            mock_cache_customers,
            mock_cache_balance_transactions,
            mock_cache_invs_by_sub_id,
            mock_cache_charges_by_pi_id,
            mock_cache_refunds_by_charge_id,
        ):
            mock.assert_called_once()

    @pytest.mark.parametrize("in_cache", (True, False))
    def test_get_resource_from_cache(self, in_cache, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.get.return_value = (resource := json.dumps({"id": "foo"})) if in_cache else None
        if in_cache:
            assert instance.get_resource_from_cache("foo") == json.loads(resource)
        else:
            assert instance.get_resource_from_cache("foo") is None

    @pytest.mark.parametrize(
        "plan, expected_val, expected_error",
        (
            (None, None, InvalidStripeTransactionDataError),
            ({"amount": 100, "currency": "usd", "interval": None, "interval_count": 2}, None, InvalidIntervalError),
            (
                {"amount": 100, "currency": "USD", "interval": "month", "interval_count": 1},
                {"amount": 100, "currency": "USD", "interval": ContributionInterval.MONTHLY.value},
                None,
            ),
        ),
    )
    def test_get_data_from_plan(self, mocker, plan, expected_val, expected_error):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        if expected_error:
            with pytest.raises(expected_error):
                instance.get_data_from_plan(plan)
        else:
            assert instance.get_data_from_plan(plan) == expected_val

    def test_get_invoices_for_subscription(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.scan_iter.return_value = ["foo", "bar", "bizz"]
        results = [mocker.Mock(), mocker.Mock(), mocker.Mock()]
        mocker.patch.object(instance, "get_resource_from_cache", side_effect=results)
        assert instance.get_invoices_for_subscription((sub_id := "sub_1")) == results
        mock_redis.scan_iter.assert_called_once_with(
            match=instance.make_key(entity_name="InvoiceBySubId", entity_id=sub_id)
        )

    def test_get_charges_for_subscription(self, mocker):
        invoices = [{"id": "inv_1", "charge": "ch_1"}, {"id": "inv_1", "charge": None}]
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.scan_iter.return_value = ["foo"]
        mocker.patch.object(instance, "get_invoices_for_subscription", return_value=invoices)
        mocker.patch.object(instance, "get_resource_from_cache", return_value=(charge := {"id": "ch_1"}))
        assert instance.get_charges_for_subscription("sub_1") == [charge]

    def test_get_refunds_for_charge(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.scan_iter.return_value = ["foo"]
        mocker.patch.object(instance, "get_resource_from_cache", return_value=(refund := {"id": "ref_1"}))
        assert instance.get_refunds_for_charge("ch_1") == [refund]

    def test_get_refunds_for_subscription(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch.object(instance, "get_charges_for_subscription", return_value={"id": "ch_1"})
        mocker.patch.object(instance, "get_refunds_for_charge", return_value={"id": "ref_1"})
        instance.get_refunds_for_charge("ch_1")

    @pytest.mark.parametrize("customer_in_cache", (True, False))
    def test_get_or_create_contributor_from_customer(self, mocker, customer_in_cache):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch.object(
            instance, "get_resource_from_cache", return_value={"email": "foo@bar.com"} if customer_in_cache else None
        )
        mocker.patch.object(instance, "get_or_create_contributor", return_value=mocker.Mock())
        if customer_in_cache:
            assert instance.get_or_create_contributor_from_customer("cus_1")
        else:
            with pytest.raises(InvalidStripeTransactionDataError):
                instance.get_or_create_contributor_from_customer("cus_1")

    @pytest.mark.parametrize(
        "payment_method, default_payment_method, is_one_time, invoice_settings, expect_pm",
        (
            ("something", None, True, None, True),
            (None, "something", False, None, True),
            (None, None, True, {"default_payment_method": "something"}, True),
            (None, None, False, {"default_payment_method": "something"}, True),
            (None, None, True, None, False),
        ),
    )
    def test_get_payment_method_for_stripe_entity(
        self, mocker, payment_method, default_payment_method, is_one_time, invoice_settings, expect_pm
    ):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch.object(instance, "get_resource_from_cache", return_value={"invoice_settings": invoice_settings})
        stripe_entity = (
            {"payment_method": payment_method, "id": "pi_1"}
            if is_one_time
            else {"default_payment_method": default_payment_method, "id": "sub_1"}
        )
        mocker.patch("stripe.PaymentMethod.retrieve", return_value=(pm := mocker.Mock()))
        pm = instance.get_payment_method_for_stripe_entity(
            stripe_entity=stripe_entity,
            customer_id="cus_1",
            is_one_time=is_one_time,
        )

        if expect_pm:
            assert pm
        else:
            assert pm is None

    @pytest.mark.parametrize("action", (common_utils.CREATED, common_utils.UPDATED, common_utils.LEFT_UNCHANGED, "foo"))
    def test_update_contribution_stats(self, action):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        contribution = ContributionFactory()
        instance.update_contribution_stats(action, contribution)

    @pytest.mark.parametrize("action", (common_utils.CREATED, common_utils.UPDATED, common_utils.LEFT_UNCHANGED, "foo"))
    def test_update_contributor_stats(self, action):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        contributor = ContributorFactory()
        instance.update_contributor_stats(action, contributor)

    @pytest.mark.parametrize("action", (common_utils.CREATED, common_utils.UPDATED, common_utils.LEFT_UNCHANGED, "foo"))
    def test_update_payment_stats(self, action):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        payment = PaymentFactory()
        instance.update_payment_stats(action, payment)

    @pytest.mark.parametrize("num_successful_charges", (0, 1, 2))
    def test_get_successful_charge_for_payment_intent(self, num_successful_charges, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        successful_charges = [{"status": "succeeded"} for _ in range(num_successful_charges)]
        mocker.patch.object(instance, "get_charges_for_payment_intent", return_value=successful_charges)
        if num_successful_charges > 1:
            with pytest.raises(InvalidStripeTransactionDataError):
                instance.get_successful_charge_for_payment_intent("pi_1")
        else:
            instance.get_successful_charge_for_payment_intent("pi_1")

    def test_get_charges_for_payment_intent(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.scan_iter.return_value = ["foo", "bar"]
        mocker.patch.object(
            instance, "get_resource_from_cache", side_effect=(charges := [{"id": "ch_1"}, {"id": "ch_2"}])
        )
        assert instance.get_charges_for_payment_intent("pi_1") == charges

    def test_get_refunds_for_payment_intent(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch.object(instance, "get_charges_for_payment_intent", return_value=[{"id": "ch_1"}])
        mocker.patch.object(instance, "get_refunds_for_charge", return_value=[{"id": "ref_1"}])
        assert instance.get_refunds_for_payment_intent({"id": "pi_1"})

    @pytest.mark.parametrize("interval", (ContributionInterval.ONE_TIME, ContributionInterval.MONTHLY))
    def test_upsert_payments_for_contribution(self, mocker, interval):
        # one has balance transaction, another does not so we go through both branches of code
        refunds = [{"id": "ref_1", "balance_transaction": "bt_1"}, {"id": "ref_2", "balance_transaction": None}]
        charge = {"balance_transaction": "bt_1", "id": "ch_1"}
        get_resource_from_cache_side_effects = []
        instance = StripeTransactionsImporter(stripe_account_id="test")
        if interval == ContributionInterval.ONE_TIME:
            mocker.patch.object(instance, "get_successful_charge_for_payment_intent")
            get_resource_from_cache_side_effects.append({"id": "pi_1"})
            mocker.patch.object(instance, "get_refunds_for_charge", return_value=refunds)
        else:
            mocker.patch.object(instance, "get_charges_for_subscription", return_value=[charge])
            mocker.patch.object(instance, "get_refunds_for_charge", return_value=refunds)
        get_resource_from_cache_side_effects.append({"id": "bt_1"})
        mocker.patch.object(instance, "get_resource_from_cache", side_effect=get_resource_from_cache_side_effects)
        mocker.patch.object(instance, "make_key")
        mocker.patch(
            "apps.contributions.stripe_import.upsert_payment_for_transaction", return_value=(mocker.Mock(), "created")
        )
        mocker.patch.object(instance, "get_resource_from_cache", return_value={"id": "tx_1"})
        mocker.patch.object(instance, "update_payment_stats")
        instance.upsert_payments_for_contribution(ContributionFactory(interval=interval))

    @pytest.mark.parametrize("latest_invoice", (None, {"id": "inv_1"}))
    def test_get_provider_payment_id_for_subscription(self, mocker, latest_invoice, subscription_dict):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        subscription_dict["latest_invoice"] = latest_invoice
        mocker.patch.object(
            instance, "get_resource_from_cache", return_value={"id": "inv_1", "payment_intent": (pi_id := "pi_1")}
        )
        mocker.patch.object(instance, "make_key")
        if latest_invoice:
            assert instance.get_provider_payment_id_for_subscription(subscription_dict) == pi_id
        else:
            assert instance.get_provider_payment_id_for_subscription(subscription_dict) is None

    @pytest.mark.parametrize(
        "entity,is_one_time",
        (
            ("payment_intent_dict", True),
            ("subscription_dict", False),
        ),
    )
    def test_get_default_contribution_data(self, entity, is_one_time, mocker, request):
        stripe_entity = request.getfixturevalue(entity)
        instance = StripeTransactionsImporter(stripe_account_id="test")
        kwargs = {
            "stripe_entity": stripe_entity,
            "is_one_time": is_one_time,
            "contributor": ContributorFactory(),
            "customer_id": "cus_1",
            "payment_method": {},
        }
        mocker.patch.object(instance, "get_refunds_for_payment_intent", return_value=[])
        mocker.patch.object(instance, "get_status_for_payment_intent", return_value=ContributionStatus.PAID)
        mocker.patch.object(
            instance,
            "get_data_from_plan",
            return_value={"amount": 100, "currency": "USD", "interval": ContributionInterval.MONTHLY.value},
        )
        mocker.patch.object(instance, "get_provider_payment_id_for_subscription", return_value="pi_1")
        instance.get_default_contribution_data(**kwargs)

    @pytest.mark.parametrize("donation_page_exists, contribution_has_donation_page", ((True, False), (False, False)))
    def test_conditionally_update_contribution_donation_page(
        self, donation_page_exists, contribution_has_donation_page, mocker
    ):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        donation_page = DonationPageFactory() if donation_page_exists else None
        contribution = ContributionFactory(donation_page=donation_page if contribution_has_donation_page else None)
        instance.conditionally_update_contribution_donation_page(contribution, donation_page)

    @pytest.mark.parametrize(
        "metadata_rp_id, rp_exists, referer_slug",
        ((None, False, ""), ("123", True, "slug"), ("123", False, ""), ("123", True, "")),
    )
    def test_get_donation_page_from_metadata(self, mocker, metadata_rp_id, rp_exists, referer_slug):
        if rp_exists:
            kwargs = {"id": metadata_rp_id} if metadata_rp_id else {}
            rp = RevenueProgramFactory(**kwargs)
            page = DonationPageFactory(revenue_program=rp, slug=referer_slug)
        instance = StripeTransactionsImporter(stripe_account_id="test")
        metadata = {"referer": f"https://{DOMAIN_APEX}/{referer_slug}/", "revenue_program_id": metadata_rp_id}
        assert instance.get_donation_page_from_metadata(metadata) == (page if rp_exists and referer_slug else None)

    @pytest.mark.parametrize(
        "stripe_entity, is_one_time",
        (
            ("payment_intent_dict", True),
            ("payment_intent_dict", True),
            ("subscription_dict", False),
            ("subscription_dict", False),
        ),
    )
    @pytest.mark.parametrize("donation_page_found", (True, False))
    @pytest.mark.parametrize("has_customer_id", (True, False))
    def test_upsert_contribution(
        self, mocker, stripe_entity, is_one_time, donation_page_found, has_customer_id, request, valid_metadata
    ):
        stripe_entity = request.getfixturevalue(stripe_entity)
        if not has_customer_id:
            stripe_entity.pop("customer", None)

        mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.upsert_payments_for_contribution")
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_payment_method_for_stripe_entity",
            return_value=None,
        )
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_or_create_contributor_from_customer",
            return_value=((contributor := ContributorFactory()), "created"),
        )
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_default_contribution_data",
            return_value={
                "contributor": contributor,
                "contribution_metadata": valid_metadata,
                "payment_provider_used": "stripe",
                "provider_customer_id": "cus_1",
                "provider_payment_method_id": None,
                "provider_payment_method_details": None,
                "status": ContributionStatus.PAID,
                "amount": 100,
                "currency": "USD",
                "interval": ContributionInterval.MONTHLY if not is_one_time else ContributionInterval.ONE_TIME,
                "provider_payment_id": "pi_1",
                "provider_subscription_id": "sub_1" if not is_one_time else None,
            },
        )
        if not donation_page_found:
            DonationPage.objects.filter(slug=PAGE_SLUG).delete()

        instance = StripeTransactionsImporter(stripe_account_id="test")
        if not has_customer_id or not donation_page_found:
            with pytest.raises(InvalidStripeTransactionDataError):
                instance.upsert_contribution(stripe_entity=stripe_entity, is_one_time=is_one_time)
        else:
            instance.upsert_contribution(stripe_entity=stripe_entity, is_one_time=is_one_time)

    def test_process_transactions_for_recurring_contributions(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.scan_iter.return_value = ["foo", "bar"]
        mocker.patch.object(instance, "get_resource_from_cache", return_value={"id": "sub_1"})
        mocker.patch.object(
            instance,
            "upsert_contribution",
            side_effect=[(ContributionFactory(), "created"), InvalidStripeTransactionDataError("uh oh")],
        )
        instance.process_transactions_for_recurring_contributions()

    def test_process_transactions_for_one_time_contributions(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.scan_iter.return_value = ["foo", "bar"]
        mocker.patch.object(instance, "get_resource_from_cache", return_value={"id": "pi_1"})
        mocker.patch.object(
            instance,
            "upsert_contribution",
            side_effect=[(ContributionFactory(), "created"), InvalidStripeTransactionDataError("uh oh")],
        )
        instance.process_transactions_for_one_time_contributions()

    @pytest.mark.parametrize(
        "time_delta",
        (
            datetime.timedelta(hours=2),
            datetime.timedelta(minutes=2),
            datetime.timedelta(seconds=2),
            datetime.timedelta(minutes=2, seconds=2),
        ),
    )
    def test_format_timedelta(self, time_delta):
        assert StripeTransactionsImporter(stripe_account_id="test").format_timedelta(time_delta)

    def test_import_contributions_and_payments(self, mocker):
        mock_list_cache = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_required_stripe_resources"
        )
        mock_log_memory_usage = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.log_memory_usage"
        )
        mock_process_recurring = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.process_transactions_for_recurring_contributions"
        )
        mock_process_one_time = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.process_transactions_for_one_time_contributions"
        )
        mock_log_results = mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.log_results")
        mock_clear_cache = mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.clear_cache")

        instance = StripeTransactionsImporter(stripe_account_id="test")
        instance.import_contributions_and_payments()
        for mock in (
            mock_list_cache,
            mock_log_memory_usage,
            mock_process_recurring,
            mock_process_one_time,
            mock_log_results,
            mock_clear_cache,
        ):
            mock.assert_called_once()

    def test_log_results(self):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        instance.log_results()

    def test_clear_cache(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.scan_iter.return_value = ["foo", "bar"]
        instance.clear_cache()

    @pytest.mark.parametrize(
        "size, expected",
        (
            (0, "0 bytes"),
            (1, "1 byte"),
            (2, "2 bytes"),
            (1024, "1 KB"),
            (1024**2, "1 MB"),
            (1024**3, "1 GB"),
            (1024**4, "1 TB"),
        ),
    )
    def test_convert_bytes(self, size, expected):
        assert StripeTransactionsImporter.convert_bytes(size) == expected

    def test_get_redis_memory_usage(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.scan_iter.return_value = ["foo", "bar"]
        mock_redis.memory_usage.side_effect = [(mem_usage := 1), None]
        assert instance.get_redis_memory_usage() == mem_usage

    def test_log_memory_usage(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch.object(instance, "get_redis_memory_usage", return_value=1)
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.scan_iter.return_value = ["foo", "bar"]
        instance.log_memory_usage()


class TestStripeEventProcessor:
    @pytest.fixture
    def supported_event(self):
        event_type = settings.STRIPE_WEBHOOK_EVENTS_CONTRIBUTIONS[0]
        return stripe.Event.construct_from(
            {
                "id": "evt_1",
                "type": event_type,
            },
            key="test",
        )

    @pytest.fixture
    def unsupported_event(self):
        unsupported_event_type = "unsupported_event"
        assert unsupported_event_type not in settings.STRIPE_WEBHOOK_EVENTS_CONTRIBUTIONS
        return stripe.Event.construct_from(
            {
                "id": "evt_1",
                "type": unsupported_event_type,
            },
            key="test",
        )

    @pytest.mark.parametrize("async_mode", (True, False))
    def test_sync_happy_path(self, async_mode, supported_event, mocker):
        mock_retrieve_event = mocker.patch("stripe.Event.retrieve", return_value=supported_event)
        mock_process_webhook = mocker.patch("apps.contributions.tasks.process_stripe_webhook_task")
        processor = StripeEventProcessor(
            stripe_account_id=(stripe_account := "test"), event_id=(event_id := "evt_1"), async_mode=async_mode
        )
        processor.process()
        if async_mode:
            mock_process_webhook.assert_not_called()
            mock_process_webhook.delay.assert_called_once_with(raw_event_data=supported_event)
        else:
            mock_process_webhook.assert_called_once_with(raw_event_data=supported_event)
            mock_process_webhook.delay.assert_not_called()
        mock_retrieve_event.assert_called_once_with(id=event_id, stripe_account=stripe_account)

    def test_when_event_not_supported(self, unsupported_event, mocker):
        logger_spy = mocker.patch("apps.contributions.stripe_import.logger.warning")
        mocker.patch("stripe.Event.retrieve", return_value=unsupported_event)
        mock_process_webhook = mocker.patch("apps.contributions.tasks.process_stripe_webhook_task")
        StripeEventProcessor(stripe_account_id="test", event_id="evt_1", async_mode=False).process()
        logger_spy.assert_called_once_with("Event type %s is not supported", unsupported_event.type)
        mock_process_webhook.assert_not_called()
        mock_process_webhook.delay.assert_not_called()

    def test_when_event_not_found(self, supported_event, mocker):
        logger_spy = mocker.patch("apps.contributions.stripe_import.logger.warning")
        mocker.patch("stripe.Event.retrieve", side_effect=stripe.error.StripeError("not found", "id", "evt_1"))
        mock_process_webhook = mocker.patch("apps.contributions.tasks.process_stripe_webhook_task")
        StripeEventProcessor(stripe_account_id="test", event_id="evt_1", async_mode=False).process()
        assert logger_spy.call_args == mocker.call("No event found for event id %s", supported_event.id)
        mock_process_webhook.assert_not_called()
        mock_process_webhook.delay.assert_not_called()
