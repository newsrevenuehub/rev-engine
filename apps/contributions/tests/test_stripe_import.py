import datetime
import importlib
import json
import random
from copy import deepcopy

from django.conf import settings

import backoff
import pytest
import stripe
from django_redis import get_redis_connection

import apps.common.utils as common_utils
from apps.contributions import stripe_import
from apps.contributions.exceptions import (
    InvalidIntervalError,
    InvalidMetadataError,
    InvalidStripeTransactionDataError,
)
from apps.contributions.models import ContributionInterval, ContributionStatus, Payment
from apps.contributions.stripe_import import (
    CACHE_KEY_PREFIX,
    REDIS_SCAN_ITER_COUNT,
    STRIPE_API_BACKOFF_ARGS,
    TTL_WARNING_THRESHOLD_PERCENT,
    RedisCachePipeline,
    StripeEventProcessor,
    StripeTransactionsImporter,
    log_backoff,
    parse_slug_from_url,
    upsert_payment_for_transaction,
)
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
    PaymentFactory,
)
from apps.contributions.typings import STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS
from apps.organizations.models import RevenueProgram
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
        "created": datetime.datetime.now(datetime.timezone.utc).timestamp(),
    }


@pytest.fixture
def rp(valid_metadata):
    return RevenueProgramFactory(id=valid_metadata["revenue_program_id"])


@pytest.fixture
def page(rp):
    return DonationPageFactory(revenue_program=rp, slug=PAGE_SLUG)


@pytest.fixture
def valid_metadata(valid_metadata, domain_apex, page, settings):
    """Shadow the valid_metadata from conftest.py.

    So we can set up rp and donation page that will cause validation around donation page work as expected in tests.
    """
    settings.DOMAIN_APEX = domain_apex
    valid_metadata["revenue_program_id"] = page.revenue_program.id
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


@pytest.fixture
def stripe_rate_limit_error():
    return stripe.error.RateLimitError(
        message="message",
        http_body="something",
        http_status=429,
        json_body={"error": {"message": "message"}},
        headers={},
        code="code",
    )


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

    @pytest.mark.parametrize("error_on_exit", [True, False])
    def test_calls_flush_on_exit(self, redis_cache_pipeline, error_on_exit, mocker):
        mock_flush = mocker.patch.object(redis_cache_pipeline, "flush")
        mock_set_kwargs = {"side_effect": Exception("ruh-roh")} if error_on_exit else {}
        mocker.patch.object(redis_cache_pipeline, "set", **mock_set_kwargs)
        if error_on_exit:
            with pytest.raises(Exception, match="ruh-roh"), redis_cache_pipeline as pipeline:
                pipeline.set(entity_id="id", key="key", entity={"foo": "bar"})
            mock_flush.assert_not_called()
        else:
            with redis_cache_pipeline as pipeline:
                pipeline.set(entity_id="id", key="key", entity={"foo": "bar"})
            mock_flush.assert_called_once()

    @pytest.mark.parametrize("has_prune_fn", [True, False])
    @pytest.mark.parametrize("batch_size", [1, 2])
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


@pytest.mark.django_db
class Test_parse_slug_from_url:

    @pytest.fixture
    def custom_host(self):
        return "bizz.bang.com"

    @pytest.fixture
    def referer_url_with_unsupported_host(self):
        def _build_url(trailing_slash):
            return f"https://something.random.com/donate{'/' if trailing_slash else ''}"

        return _build_url

    @pytest.fixture
    def referer_url_with_subdomain_on_domain_apex(self, domain_apex, revenue_program):
        def _build_url(trailing_slash):
            return f"https://sub.{domain_apex}/{revenue_program.slug}{'/' if trailing_slash else ''}"

        return _build_url

    @pytest.fixture
    def referer_url_with_custom_host(self, custom_host, revenue_program):
        def _build_url(trailing_slash):
            return f"https://{custom_host}/{revenue_program.slug}{'/' if trailing_slash else ''}"

        return _build_url

    @pytest.fixture
    def referer_url_with_domain_apex_value(self, domain_apex, revenue_program):
        def _build_url(trailing_slash):
            return f"https://{domain_apex}/{revenue_program.slug}{'/' if trailing_slash else ''}"

        return _build_url

    @pytest.fixture
    def referer_url_with_no_slug(self, domain_apex):
        def _build_url(trailing_slash):
            return f"https://{domain_apex}{'/' if trailing_slash else ''}"

        return _build_url

    @pytest.fixture
    def referer_url_with_slug_and_other_path(self, domain_apex, revenue_program):
        def _build_url(trailing_slash):
            return f"https://{domain_apex}/{revenue_program.slug}/other{'/' if trailing_slash else ''}"

        return _build_url

    @pytest.fixture
    def referer_url_with_slug_and_query_params(self, domain_apex, revenue_program):
        def _build_url(trailing_slash):
            return f"https://{domain_apex}/{revenue_program.slug}?foo=bar{'/' if trailing_slash else ''}"

        return _build_url

    @pytest.fixture
    def _settings_empty_host_map(self, settings):
        settings.HOST_MAP = {}

    @pytest.fixture
    def _settings_rp_in_host_map(self, revenue_program, custom_host, settings):
        settings.HOST_MAP = {custom_host: revenue_program.slug}

    @pytest.mark.parametrize(
        ("referer_url_fixture", "host_map_fixture", "get_expected_slug_fn", "expect_error"),
        [
            ("referer_url_with_unsupported_host", "_settings_empty_host_map", None, True),
            ("referer_url_with_unsupported_host", "_settings_rp_in_host_map", None, True),
            ("referer_url_with_custom_host", "_settings_empty_host_map", None, True),
            ("referer_url_with_custom_host", "_settings_rp_in_host_map", lambda rp: rp.slug, False),
            ("referer_url_with_domain_apex_value", "_settings_empty_host_map", lambda rp: rp.slug, False),
            ("referer_url_with_no_slug", "_settings_empty_host_map", lambda rp: None, False),
            ("referer_url_with_slug_and_other_path", "_settings_empty_host_map", lambda rp: rp.slug, False),
            ("referer_url_with_slug_and_query_params", "_settings_empty_host_map", lambda rp: rp.slug, False),
            ("referer_url_with_subdomain_on_domain_apex", "_settings_empty_host_map", lambda rp: rp.slug, False),
        ],
    )
    @pytest.mark.parametrize("trailing_slash", [True, False])
    def test_parse_slug_from_url(
        self,
        referer_url_fixture,
        host_map_fixture,
        get_expected_slug_fn,
        expect_error,
        revenue_program,
        request,
        trailing_slash,
    ):
        # Dynamically resolve the referer_url fixture and use the trailing_slash parameter
        referer_url_builder = request.getfixturevalue(referer_url_fixture)
        referer_url = referer_url_builder(trailing_slash)

        # Resolve and activate the host_map_fixture
        request.getfixturevalue(host_map_fixture)

        # Perform the test assertions
        if expect_error:
            with pytest.raises(InvalidStripeTransactionDataError) as exc:
                parse_slug_from_url(referer_url)
            assert str(exc.value) == f"URL {referer_url} has a host that is not allowed for import"
        else:
            assert parse_slug_from_url(referer_url) == get_expected_slug_fn(revenue_program)


@pytest.mark.django_db
class Test_upsert_payment_for_transaction:
    @pytest.fixture
    def contribution(self):
        return ContributionFactory()

    @pytest.mark.parametrize("payment_exists", [True, False])
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
        assert payment.amount_refunded == (-balance_transaction["amount"] if is_refund else 0)
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
            "Integrity error occurred while upserting payment with balance transaction %s for contribution %s"
            " The existing payment is %s for contribution %s",
            balance_transaction["id"],
            contribution.id,
            existing_payment.id,
            different_contribution.id,
        )
        assert payment is None
        assert action is None


def test_module_logger(mocker):
    """Test to narrowly execute an otherwise untested path with module logger."""
    mock_logger = mocker.Mock(handlers=(handlers := ["foo", "bar"]))
    mocker.patch("logging.getLogger", return_value=mock_logger)
    importlib.reload(stripe_import)
    assert mock_logger.removeHandler.call_count == len(handlers)
    assert mock_logger.removeHandler.call_args_list == [mocker.call(handler) for handler in handlers]


@pytest.mark.django_db
class TestStripeTransactionsImporter:
    @pytest.fixture(autouse=True)
    def _patch_redis(self, mocker):
        mocker.patch("apps.contributions.stripe_import.get_redis_connection", return_value=mocker.Mock())

    @pytest.fixture(autouse=True)
    def _default_settings(self, settings):
        settings.DOMAIN_APEX = DOMAIN_APEX

    @pytest.mark.parametrize(
        "status",
        [
            None,
            "uncanceled",
        ],
    )
    def test_subscription_status(self, status):
        instance = StripeTransactionsImporter(stripe_account_id="test", subscription_status=status)
        if status == "uncanceled":
            assert instance.subscription_status is None

    @pytest.mark.parametrize("include_recurring", [True, False])
    @pytest.mark.parametrize("include_one_off", [True, False])
    def test_list_and_cache_required_stripe_resources(self, mocker, include_recurring, include_one_off):

        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_get_recurring = mocker.patch.object(
            instance, "list_and_cache_stripe_resources_for_recurring_contributions"
        )
        mock_get_one_times = mocker.patch.object(instance, "list_and_cache_stripe_resources_for_one_time_contributions")
        mock_get_shared = mocker.patch.object(instance, "list_and_cache_resources_shared")
        instance.include_one_time_contributions = include_one_off
        instance.include_recurring_contributions = include_recurring
        instance.list_and_cache_required_stripe_resources()
        if include_recurring:
            mock_get_recurring.assert_called_once()
        else:
            mock_get_recurring.assert_not_called()
        if include_one_off:
            mock_get_one_times.assert_called_once()
        else:
            mock_get_one_times.assert_not_called()
        if include_recurring or include_one_off:
            mock_get_shared.assert_called_once()
        else:
            mock_get_shared.assert_not_called()

    def test_created_query(self, mocker):
        from_date = mocker.Mock()
        to_date = mocker.Mock()
        assert StripeTransactionsImporter(
            stripe_account_id="foo", from_date=from_date, to_date=to_date
        ).created_query == {
            "gte": from_date,
            "lte": to_date,
        }

    @pytest.mark.parametrize(
        ("plan_interval", "plan_interval_count", "expected"),
        [
            ("year", 1, ContributionInterval.YEARLY),
            ("month", 1, ContributionInterval.MONTHLY),
            ("unexpected", 1, None),
            ("year", 2, None),
            ("month", 2, None),
        ],
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
        ("metadata", "expect_error"),
        [("valid_metadata", False), ("invalid_metadata", True), ("invalid_metadata_for_schema_version", True)],
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
        ("referer", "revenue_program", "expect_error"),
        [
            (f"https://{DOMAIN_APEX}/slug/", None, False),
            (f"https://{DOMAIN_APEX}/slug/", "2", False),
            ("https://foo.bar/slug/", "2", False),
            (None, "2", False),
            (None, None, True),
        ],
    )
    def test_validate_referer_or_revenue_program(self, referer, revenue_program, expect_error):
        metadata = {
            "referer": referer,
            "revenue_program_id": revenue_program,
        }
        instance = StripeTransactionsImporter(stripe_account_id="test")
        if expect_error:
            with pytest.raises(InvalidMetadataError):
                instance.validate_referer_or_revenue_program(metadata)
        else:
            instance.validate_referer_or_revenue_program(metadata)

    @pytest.mark.parametrize(
        ("status", "has_refunds", "expected", "expect_error"),
        [
            ("anything", True, ContributionStatus.REFUNDED, False),
            ("succeeded", False, ContributionStatus.PAID, False),
            ("canceled", False, ContributionStatus.CANCELED, False),
            ("processing", False, ContributionStatus.PROCESSING, False),
            ("requires_action", False, ContributionStatus.PROCESSING, False),
            ("requires_capture", False, ContributionStatus.PROCESSING, False),
            ("requires_confirmation", False, ContributionStatus.PROCESSING, False),
            ("requires_payment_method", False, ContributionStatus.PROCESSING, False),
            ("unexpected", False, None, True),
        ],
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
        ("status", "expected"),
        [
            ("active", ContributionStatus.PAID),
            ("past_due", ContributionStatus.FAILED),
            ("incomplete_expired", ContributionStatus.FAILED),
            ("canceled", ContributionStatus.CANCELED),
            ("anything_else_that_arrives", ContributionStatus.PROCESSING),
            ("incomplete", ContributionStatus.PROCESSING),
            ("trialing", ContributionStatus.PROCESSING),
        ],
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
        ("schema_version", "expected"),
        [
            (
                random.choice(list(STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS.keys())),
                False,
            ),
            ("unsupported", True),
            (None, True),
        ],
    )
    def test_should_exclude_from_cache_because_of_metadata(self, schema_version, expected, mocker, valid_metadata):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        valid_metadata["schema_version"] = schema_version
        assert instance.should_exclude_from_cache_because_of_metadata(mocker.Mock(metadata=valid_metadata)) == expected

    @pytest.mark.parametrize(
        "init_kwargs", [{}, {"from_date": (when := datetime.datetime.now(datetime.timezone.utc)), "to_date": when}]
    )
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
        ("method", "entity", "has_exclude", "has_prune", "has_list_kwargs"),
        [
            ("list_and_cache_payment_intents", "PaymentIntent", True, True, True),
            ("list_and_cache_charges", "Charge", False, True, False),
            ("list_and_cache_refunds", "Refund", False, True, False),
            ("list_and_cache_customers", "Customer", False, True, False),
            ("list_and_cache_invoices", "Invoice", False, True, False),
            ("list_and_cache_balance_transactions", "BalanceTransaction", False, True, False),
        ],
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

    def test_list_and_cache_subscriptions(self, mocker):
        mock_list_and_cache = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_entities"
        )
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.should_exclude_from_cache_because_of_metadata"
        )
        importer = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.list_kwargs",
            new_callable=mocker.PropertyMock,
            return_value=(default_kwargs := {"foo": "bar"}),
        )
        importer.list_and_cache_subscriptions()
        assert mock_list_and_cache.call_count == 1
        assert mock_list_and_cache.call_args[1].get("list_kwargs") == default_kwargs | {"status": "all"}

    def test_list_and_cache_payment_intents_with_metadata_version(self, mocker):
        mock_list_and_patch = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_entities"
        )
        StripeTransactionsImporter(stripe_account_id="test").list_and_cache_payment_intents_with_metadata_version(
            metadata_version=(version := "v1"),
            prune_fn=(prune_fn := mocker.Mock()),
        )
        mock_list_and_patch.assert_called_once_with(
            entity_name="PaymentIntent",
            prune_fn=prune_fn,
            list_kwargs={"query": f'metadata["schema_version"]:"{version}"'},
            use_search_api=True,
        )

    def test_list_and_cache_subscriptions_with_metadata_version(self, mocker):
        mock_list_and_patch = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_entities"
        )
        StripeTransactionsImporter(stripe_account_id="test").list_and_cache_subscriptions_with_metadata_version(
            metadata_version=(version := "v1"),
            prune_fn=(prune_fn := mocker.Mock()),
        )
        mock_list_and_patch.assert_called_once_with(
            entity_name="Subscription",
            prune_fn=prune_fn,
            list_kwargs={"query": f'metadata["schema_version"]:"{version}"'},
            use_search_api=True,
        )

    def test_search_stripe_entity(self, mocker):
        entity_name = "PaymentIntent"
        instance = StripeTransactionsImporter(stripe_account_id=(stripe_id := "test"))
        mock_list = mocker.patch("stripe.PaymentIntent.search")
        mock_list.return_value.auto_paging_iter.return_value = (result := [mocker.Mock()])
        assert instance.search_stripe_entity(entity_name) == result
        mock_list.assert_called_once_with(stripe_account=stripe_id, limit=mocker.ANY, query=None)

    def test_get_redis_pipeline(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch("apps.contributions.stripe_import.RedisCachePipeline")
        assert instance.get_redis_pipeline(entity_name="foo")

    @pytest.mark.parametrize(
        ("exclude_fn", "expect_exclude"),
        [
            (lambda x: False, False),
            (lambda x: True, True),
        ],
    )
    @pytest.mark.parametrize(
        "prune_fn",
        [None, lambda x: x],
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
        assert instance.make_key(entity_id="foo", entity_name="bar") == f"{CACHE_KEY_PREFIX}_bar_foo_{acct_id}"

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
        mock_redis.scan_iter.assert_called_once_with(
            match=instance.make_key(entity_name=f"{entity_name}_*"), count=1000
        )
        assert mock_get_resource.call_count == 3
        mock_get_resource.assert_has_calls([mocker.call(key) for key in keys])
        mock_get_pipeline.return_value.__enter__.return_value.set.assert_called_once_with(
            entity_id=(entity_id := f"{charge1['payment_intent']}_{charge1['id']}"),
            key=instance.make_key(entity_id=entity_id, entity_name=destination_name),
            entity=charge1,
        )

    @pytest.mark.parametrize(
        "method",
        [
            "cache_charges_by_payment_intent_id",
            "cache_invoices_by_subscription_id",
            "cache_refunds_by_charge_id",
        ],
    )
    def test_cache_entity_by_another_entity_methods(self, method, mocker):
        mock_cache_entity_by_entity = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.cache_entity_by_another_entity_id"
        )
        getattr(StripeTransactionsImporter(stripe_account_id="test"), method)()
        mock_cache_entity_by_entity.assert_called_once()

    @pytest.mark.parametrize("in_cache", [True, False])
    def test_get_resource_from_cache(self, in_cache, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.get.return_value = (resource := json.dumps({"id": "foo"})) if in_cache else None
        if in_cache:
            assert instance.get_resource_from_cache("foo") == json.loads(resource)
        else:
            assert instance.get_resource_from_cache("foo") is None

    @pytest.mark.parametrize(
        ("plan", "expected_val", "expected_error"),
        [
            (None, None, InvalidStripeTransactionDataError),
            ({"amount": 100, "currency": "usd", "interval": None, "interval_count": 2}, None, InvalidIntervalError),
            (
                {"amount": 100, "currency": "USD", "interval": "month", "interval_count": 1},
                {"amount": 100, "currency": "USD", "interval": ContributionInterval.MONTHLY.value},
                None,
            ),
        ],
    )
    def test_get_data_from_plan(self, mocker, plan, expected_val, expected_error):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        if expected_error:
            with pytest.raises(expected_error):
                instance.get_data_from_plan(plan)
        else:
            assert instance.get_data_from_plan(plan) == expected_val

    def test_get_invoices_for_subscription(self, mocker):
        sub_id = "sub_1"
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_redis = mocker.patch.object(instance, "redis")

        mock_redis.scan_iter.return_value = [f"foo_{sub_id}", f"bar_{sub_id}", f"bizz_{sub_id}"]
        results = [mocker.Mock(), mocker.Mock(), mocker.Mock()]
        mocker.patch.object(instance, "get_resource_from_cache", side_effect=results)
        assert instance.get_invoices_for_subscription(sub_id) == results
        mock_redis.scan_iter.assert_called_once_with(
            match=instance.make_key(entity_name="InvoiceBySubId", entity_id="*"), count=REDIS_SCAN_ITER_COUNT
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
        charge_id = "ch_1"
        mock_redis.scan_iter.return_value = [f"foo_{charge_id}", "bar_some_other_id"]
        mocker.patch.object(instance, "get_resource_from_cache", return_value=(refund := {"id": "ch_1"}))
        assert instance.get_refunds_for_charge(charge_id) == [refund]

    def test_get_refunds_for_subscription(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch.object(instance, "get_charges_for_subscription", return_value={"id": "ch_1"})
        mocker.patch.object(instance, "get_refunds_for_charge", return_value={"id": "ref_1"})
        instance.get_refunds_for_charge("ch_1")

    @pytest.mark.parametrize("customer_has_email", [True, False])
    def test_get_or_create_contributor_from_customer(self, mocker, customer_has_email):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch(
            "apps.contributions.models.Contributor.get_or_create_contributor_by_email",
            return_value=mocker.Mock(),
        )
        mocker.patch.object(
            instance,
            "get_resource_from_cache",
            return_value={"email": "foo@bar.com" if customer_has_email else None},
        )
        if customer_has_email:
            assert instance.get_or_create_contributor_from_customer("cus_1")
        else:
            with pytest.raises(InvalidStripeTransactionDataError):
                instance.get_or_create_contributor_from_customer("cus_1")

    def test_get_or_create_contributor_from_customer_when_no_customer_in_cache(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch.object(instance, "get_resource_from_cache", return_value=None)
        with pytest.raises(InvalidStripeTransactionDataError):
            instance.get_or_create_contributor_from_customer("cus_1")

    @pytest.mark.parametrize(
        ("payment_method", "default_payment_method", "is_one_time", "invoice_settings", "expect_pm_id"),
        [
            ("something", None, True, None, True),
            (None, "something", False, None, True),
            (None, None, True, {"default_payment_method": "something"}, True),
            (None, None, False, {"default_payment_method": "something"}, True),
            (None, None, True, None, False),
        ],
    )
    def test_get_payment_method_id_for_stripe_entity(
        self, mocker, payment_method, default_payment_method, is_one_time, invoice_settings, expect_pm_id
    ):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch.object(instance, "get_resource_from_cache", return_value={"invoice_settings": invoice_settings})
        stripe_entity = (
            {"payment_method": payment_method, "id": "pi_1"}
            if is_one_time
            else {"default_payment_method": default_payment_method, "id": "sub_1"}
        )
        pm_id = instance.get_payment_method_id_for_stripe_entity(
            stripe_entity=stripe_entity,
            customer_id="cus_1",
            is_one_time=is_one_time,
        )

        if expect_pm_id:
            assert pm_id
        else:
            assert pm_id is None

    @pytest.mark.parametrize("action", [common_utils.CREATED, common_utils.UPDATED, common_utils.LEFT_UNCHANGED, "foo"])
    def test_update_contribution_stats(self, action):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        contribution = ContributionFactory()
        instance.update_contribution_stats(action, contribution)

    @pytest.mark.parametrize("action", [common_utils.CREATED, common_utils.UPDATED, common_utils.LEFT_UNCHANGED, "foo"])
    def test_update_contributor_stats(self, action):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        contributor = ContributorFactory()
        instance.update_contributor_stats(action, contributor)

    @pytest.mark.parametrize("action", [common_utils.CREATED, common_utils.UPDATED, common_utils.LEFT_UNCHANGED, "foo"])
    def test_update_payment_stats(self, action):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        payment = PaymentFactory()
        instance.update_payment_stats(action, payment)

    @pytest.mark.parametrize("num_successful_charges", [0, 1, 2])
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
        pi_id = "pi_1"
        mock_redis.scan_iter.return_value = [f"foo_{pi_id}", f"bar_{pi_id}"]
        mocker.patch.object(
            instance, "get_resource_from_cache", side_effect=(charges := [{"id": "ch_1"}, {"id": "ch_2"}])
        )
        assert instance.get_charges_for_payment_intent(pi_id) == charges

    def test_get_refunds_for_payment_intent(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mocker.patch.object(instance, "get_charges_for_payment_intent", return_value=[{"id": "ch_1"}])
        mocker.patch.object(instance, "get_refunds_for_charge", return_value=[{"id": "ref_1"}])
        assert instance.get_refunds_for_payment_intent({"id": "pi_1"})

    @pytest.mark.parametrize("interval", [ContributionInterval.ONE_TIME, ContributionInterval.MONTHLY])
    @pytest.mark.parametrize("pre_existing_payment_for_bt", [True, False])
    def test_upsert_payments_for_contribution(self, mocker, interval, pre_existing_payment_for_bt):
        # one has balance transaction, another does not so we go through both branches of code
        refunds = [
            [{"id": "ref_1", "balance_transaction": "bt_1"}, {"id": "ref_2", "balance_transaction": None}],
            [
                {"id": "ref_3", "balance_transaction": "bt_3"},
            ],
        ]
        charge = {"balance_transaction": "bt_1", "id": "ch_1"}
        get_resource_from_cache_side_effects = []
        instance = StripeTransactionsImporter(stripe_account_id="test")
        if interval == ContributionInterval.ONE_TIME:
            mocker.patch.object(instance, "get_successful_charge_for_payment_intent")
            get_resource_from_cache_side_effects.append({"id": "pi_1"})
            mocker.patch.object(instance, "get_refunds_for_charge", return_value=[refunds[0][0]])
        else:
            # we want to return 2 charges to trigger two calls to get_refunds_for_charge
            mocker.patch.object(instance, "get_charges_for_subscription", return_value=[charge, charge])
            mocker.patch.object(instance, "get_refunds_for_charge", side_effect=refunds)
        get_resource_from_cache_side_effects.append({"id": "bt_1"})
        mocker.patch.object(instance, "get_resource_from_cache", side_effect=get_resource_from_cache_side_effects)
        mocker.patch.object(instance, "make_key")
        mocker.patch(
            "apps.contributions.stripe_import.upsert_payment_for_transaction",
            return_value=(mocker.Mock(), "created") if not pre_existing_payment_for_bt else (None, None),
        )
        mocker.patch.object(instance, "get_resource_from_cache", return_value={"id": "tx_1"})
        mocker.patch.object(instance, "update_payment_stats")
        instance.upsert_payments_for_contribution(ContributionFactory(interval=interval))

    @pytest.mark.parametrize("latest_invoice", [None, {"id": "inv_1"}])
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

    def test_get_payment_method(self, mocker):
        mocker.patch("stripe.PaymentMethod.retrieve")
        instance = StripeTransactionsImporter(stripe_account_id="test")
        assert instance.get_payment_method("pm_1")

    @pytest.mark.parametrize(
        ("entity", "is_one_time"),
        [
            ("payment_intent_dict", True),
            ("subscription_dict", False),
        ],
    )
    @pytest.mark.parametrize("pm_found", [True, False])
    def test_get_default_contribution_data(self, entity, is_one_time, pm_found, mocker, request):
        stripe_entity = request.getfixturevalue(entity)
        instance = StripeTransactionsImporter(stripe_account_id="test", retrieve_payment_method=True)
        kwargs = {
            "stripe_entity": stripe_entity,
            "is_one_time": is_one_time,
            "contributor": ContributorFactory(),
            "customer_id": "cus_1",
            "payment_method_id": "pm_1",
        }
        mocker.patch.object(instance, "get_refunds_for_payment_intent", return_value=[])
        mocker.patch.object(instance, "get_status_for_payment_intent", return_value=ContributionStatus.PAID)
        mocker.patch.object(
            instance,
            "get_data_from_plan",
            return_value={"amount": 100, "currency": "USD", "interval": ContributionInterval.MONTHLY.value},
        )
        mocker.patch.object(instance, "get_provider_payment_id_for_subscription", return_value="pi_1")
        mocker.patch.object(instance, "get_payment_method", return_value={"id": "pm_1"} if pm_found else None)
        instance.get_default_contribution_data(**kwargs)

    @pytest.mark.parametrize("has_rp_id", [True, False])
    def test_get_revenue_program_from_metadata(self, has_rp_id, valid_metadata):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        if not has_rp_id:
            valid_metadata["revenue_program_id"] = None
            assert instance.get_revenue_program_from_metadata(valid_metadata) is None
        else:
            assert instance.get_revenue_program_from_metadata(valid_metadata) == RevenueProgram.objects.get(
                id=valid_metadata["revenue_program_id"]
            )

    @pytest.mark.parametrize(
        ("metadata_rp_id", "rp_exists", "referer_slug", "default_donation_page_exists", "expect_page"),
        [
            (None, False, "", False, False),
            (None, True, "", True, False),
            ("123", True, "slug", False, True),
            ("123", False, "", False, False),
            ("123", True, "", False, False),
            ("123", False, "", True, False),
            ("123", True, "", True, False),
        ],
    )
    def test_get_donation_page_from_metadata(
        self, metadata_rp_id, rp_exists, referer_slug, default_donation_page_exists, expect_page
    ):
        if rp_exists:
            kwargs = {"id": metadata_rp_id} if metadata_rp_id else {}
            rp = RevenueProgramFactory(**kwargs)
            page = DonationPageFactory(revenue_program=rp, slug=referer_slug)
            if default_donation_page_exists:
                rp.default_donation_page = DonationPageFactory()
                rp.save()
        instance = StripeTransactionsImporter(stripe_account_id="test")
        metadata = {"referer": f"https://{DOMAIN_APEX}/{referer_slug}/", "revenue_program_id": metadata_rp_id}
        if expect_page:
            assert instance.get_donation_page_from_metadata(metadata) == page
        else:
            assert instance.get_donation_page_from_metadata(metadata) is None

    @pytest.mark.parametrize(
        ("stripe_entity", "is_one_time"),
        [
            ("payment_intent_dict", True),
            ("subscription_dict", False),
        ],
    )
    @pytest.mark.parametrize("donation_page_found", [True, False])
    @pytest.mark.parametrize("revenue_program_found", [True, False])
    @pytest.mark.parametrize("has_customer_id", [True, False])
    def test_upsert_contribution(
        self,
        mocker,
        stripe_entity,
        is_one_time,
        donation_page_found,
        revenue_program_found,
        has_customer_id,
        request,
        valid_metadata,
    ):
        stripe_entity = request.getfixturevalue(stripe_entity)
        if not has_customer_id:
            stripe_entity.pop("customer", None)

        mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.upsert_payments_for_contribution")
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_payment_method_id_for_stripe_entity",
            return_value=None,
        )
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_or_create_contributor_from_customer",
            return_value=((contributor := ContributorFactory()), "created"),
        )
        if not donation_page_found:
            DonationPage.objects.filter(slug=PAGE_SLUG).delete()
        if not revenue_program_found:
            RevenueProgram.objects.filter(id=valid_metadata["revenue_program_id"]).delete()

        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_default_contribution_data",
            return_value={
                "contributor": contributor,
                "contribution_metadata": valid_metadata,
                "payment_provider_used": "stripe",
                "provider_customer_id": "cus_1",
                "provider_payment_method_id": None,
                "status": ContributionStatus.PAID,
                "amount": 100,
                "currency": "USD",
                "interval": ContributionInterval.MONTHLY if not is_one_time else ContributionInterval.ONE_TIME,
                "provider_payment_id": "pi_1",
                "provider_subscription_id": "sub_1" if not is_one_time else None,
            },
        )
        instance = StripeTransactionsImporter(stripe_account_id="test")
        if not has_customer_id or not revenue_program_found:
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
        [
            datetime.timedelta(hours=2),
            datetime.timedelta(minutes=2),
            datetime.timedelta(seconds=2),
            datetime.timedelta(minutes=2, seconds=2),
        ],
    )
    def test_format_timedelta(self, time_delta):
        assert StripeTransactionsImporter(stripe_account_id="test").format_timedelta(time_delta)

    @pytest.mark.parametrize(
        ("time_percent", "expect_warning"),
        [(TTL_WARNING_THRESHOLD_PERCENT, False), (TTL_WARNING_THRESHOLD_PERCENT + 0.1, True)],
    )
    def test_log_ttl_concerns(self, time_percent, expect_warning, mocker, settings):
        now = datetime.datetime.now(datetime.timezone.utc)
        mock_date_time = mocker.patch("datetime.datetime")
        mock_date_time.now.return_value = now
        mock_logger = mocker.patch("apps.contributions.stripe_import.logger.warning")
        instance = StripeTransactionsImporter(stripe_account_id="test")
        start_time = now - datetime.timedelta(seconds=(settings.STRIPE_TRANSACTIONS_IMPORT_CACHE_TTL * time_percent))
        instance.log_ttl_concerns(start_time)
        if expect_warning:
            mock_logger.assert_called_once_with(
                "Stripe import for account %s took %s, which is longer than %s%% of the cache TTL (%s)."
                " Consider increasing TTLs for cache entries related to stripe import.",
                instance.stripe_account_id,
                instance.format_timedelta(now - start_time),
                TTL_WARNING_THRESHOLD_PERCENT * 100,
                instance.format_timedelta(datetime.timedelta(seconds=settings.STRIPE_TRANSACTIONS_IMPORT_CACHE_TTL)),
            )
        else:
            mock_logger.assert_not_called()

    @pytest.mark.parametrize("include_recurring", [True, False])
    @pytest.mark.parametrize("include_one_off", [True, False])
    def test_import_contributions_and_payments(self, mocker, include_recurring, include_one_off):
        importer = StripeTransactionsImporter(stripe_account_id="test")
        importer.include_one_time_contributions = include_one_off
        importer.include_recurring_contributions = include_recurring
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter._subscription_keys",
            new_callable=mocker.PropertyMock,
        )
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter._payment_intent_keys",
            new_callable=mocker.PropertyMock,
        )
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
        mock_clear_cache = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.clear_cache_for_account"
        )
        mock_log_ttl_concerns = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.log_ttl_concerns"
        )
        importer.import_contributions_and_payments()
        mock_log_memory_usage.assert_called_once()
        mock_log_results.assert_called_once()
        mock_clear_cache.assert_called_once()
        mock_log_ttl_concerns.assert_called_once()
        mock_list_cache.assert_called_once()
        if include_recurring:
            mock_process_recurring.assert_called_once()
        else:
            mock_process_recurring.assert_not_called()
        if include_one_off:
            mock_process_one_time.assert_called_once()
        else:
            mock_process_one_time.assert_not_called()

    def test_list_and_cache_stripe_resources_for_recurring_contributions(self, mocker):
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_subscriptions", return_value=[]
        )
        mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_invoices")
        mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.cache_entity_by_another_entity_id")
        importer = StripeTransactionsImporter(stripe_account_id="test")
        importer.list_and_cache_stripe_resources_for_recurring_contributions()

    def test_list_and_cache_stripe_resources_for_one_time_contributions(self, mocker):
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_payment_intents",
            return_value=[],
        )
        mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_charges")
        mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.cache_entity_by_another_entity_id")
        importer = StripeTransactionsImporter(stripe_account_id="test")
        importer.list_and_cache_stripe_resources_for_one_time_contributions()

    def test_list_and_cache_resources_shared(self, mocker):
        mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_charges")
        mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_balance_transactions")
        mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_customers")
        mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.list_and_cache_refunds")
        mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.cache_refunds_by_charge_id")
        importer = StripeTransactionsImporter(stripe_account_id="test")
        importer.list_and_cache_resources_shared()

    def test_log_results(self):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        instance.log_results()

    def test__clear_cache(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_redis = mocker.patch.object(instance, "redis")
        mock_redis.scan_iter.return_value = [key := "foo"]
        instance._clear_cache(redis=mock_redis, match="test*")
        mock_redis.pipeline.return_value.delete.assert_called_once_with(key)
        mock_redis.pipeline.return_value.execute.assert_called_once()

    def test_clear_cache_for_account(self, mocker):
        instance = StripeTransactionsImporter(stripe_account_id="test")
        mock_clear_cache = mocker.patch.object(instance, "_clear_cache")
        instance.clear_cache_for_account()
        mock_clear_cache.assert_called_once_with(match=instance.make_key(entity_name="*"), redis=instance.redis)

    def test_clear_all_stripe_transactions_cache(self, mocker):
        mock__clear_cache = mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter._clear_cache")
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_redis_for_transactions_import",
            return_value=(mock_redis := mocker.Mock()),
        )
        StripeTransactionsImporter.clear_all_stripe_transactions_cache()
        mock__clear_cache.assert_called_once_with(match=f"{CACHE_KEY_PREFIX}*", redis=mock_redis)

    def test_get_redis_for_transactions_import(self, mocker, settings):
        mock_get_redis = mocker.patch("apps.contributions.stripe_import.get_redis_connection")
        StripeTransactionsImporter.get_redis_for_transactions_import()
        mock_get_redis.assert_called_once_with(settings.STRIPE_TRANSACTIONS_IMPORT_CACHE)

    @pytest.mark.parametrize(
        ("size", "expected"),
        [
            (0, "0 bytes"),
            (1, "1 byte"),
            (2, "2 bytes"),
            (1024, "1 KB"),
            (1024**2, "1 MB"),
            (1024**3, "1 GB"),
            (1024**4, "1 TB"),
        ],
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

    @pytest.mark.parametrize("async_mode", [True, False])
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


class Test_log_backoff:

    @pytest.fixture(params=["stripe_rate_limit_error", "other_error"])
    def valid_details_args(self, request):
        # Full details on details at https://pypi.org/project/backoff/#event-handlers
        return {
            "exception": request.getfixturevalue(request.param),
            "wait": 10,
            "tries": 3,
        }

    @pytest.fixture
    def invalid_details_args(self):
        return {"arbitrary": "keys"}

    @pytest.fixture
    def other_error(self):
        return Exception("message")

    def test_happy_path(self, mocker, valid_details_args):
        mock_logger = mocker.patch("apps.contributions.stripe_import.logger.warning")
        log_backoff(valid_details_args)
        if isinstance(valid_details_args["exception"], stripe.error.RateLimitError):
            mock_logger.assert_called_once_with(
                "Backing off %s seconds after %s tries due to rate limit error. Error message: %s."
                " Status code: %s. Stripe request ID: %s. Stripe error: %s.",
                valid_details_args["wait"],
                valid_details_args["tries"],
                valid_details_args["exception"].user_message,
                valid_details_args["exception"].http_status,
                valid_details_args["exception"].request_id,
                valid_details_args["exception"].error,
                exc_info=True,
            )
        else:
            mock_logger.assert_called_once_with(
                "Backing off %s seconds after %s tries. Error: %s",
                valid_details_args["wait"],
                valid_details_args["tries"],
                valid_details_args["exception"],
            )

    def test_when_details_arg_unexpected(self, invalid_details_args, mocker):
        mock_logger = mocker.patch("apps.contributions.stripe_import.logger.exception")
        log_backoff(invalid_details_args)
        mock_logger.assert_called_once_with("Error parsing backoff details: %s", invalid_details_args)

    def test_in_decorator_context(self, mocker, stripe_rate_limit_error):
        assert isinstance(stripe_rate_limit_error, stripe.error.RateLimitError)
        mock_logger = mocker.patch("apps.contributions.stripe_import.logger")

        @backoff.on_exception(
            backoff.expo, stripe.error.RateLimitError, **STRIPE_API_BACKOFF_ARGS | {"max_tries": (max_tries := 2)}
        )
        def my_function():
            raise stripe_rate_limit_error

        with pytest.raises(stripe.error.RateLimitError):
            my_function()
        assert mock_logger.warning.call_count == max_tries - 1
        assert mock_logger.warning.call_args == mocker.call(
            "Backing off %s seconds after %s tries due to rate limit error. Error message: %s."
            " Status code: %s. Stripe request ID: %s. Stripe error: %s.",
            mocker.ANY,
            mocker.ANY,
            stripe_rate_limit_error.user_message,
            stripe_rate_limit_error.http_status,
            stripe_rate_limit_error.request_id,
            stripe_rate_limit_error.error,
            exc_info=True,
        )
