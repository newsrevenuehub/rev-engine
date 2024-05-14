import datetime
import itertools
import json
import logging
from dataclasses import dataclass
from typing import Any, Callable, Iterable, Tuple
from urllib.parse import urlparse

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import IntegrityError, transaction

import backoff
import stripe
import tldextract
from django_redis import get_redis_connection
from redis import Redis
from redis.client import Pipeline

import apps.common.utils as common_utils
from apps.common.utils import upsert_with_diff_check
from apps.contributions.exceptions import (
    InvalidIntervalError,
    InvalidMetadataError,
    InvalidStripeTransactionDataError,
)
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
    Payment,
)
from apps.contributions.types import (
    STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS,
    cast_metadata_to_stripe_payment_metadata_schema,
)
from apps.organizations.models import PaymentProvider, RevenueProgram
from apps.pages.models import DonationPage


MAX_STRIPE_RESPONSE_LIMIT = 100
CACHE_KEY_PREFIX = settings.STRIPE_TRANSACTIONS_IMPORT_CACHE
CACHED_CHARGE_FIELDS = ["id", "payment_intent", "status", "balance_transaction"]
CACHED_INVOICE_FIELDS = [
    "charge",
    "id",
    "payment_intent",
    "subscription",
]
CACHED_BALANCE_TRANSACTION_FIELDS = ["amount", "created", "id", "net", "amount"]
CACHED_PAYMENT_INTENT_FIELDS = ["amount", "customer", "currency", "id", "metadata", "payment_method", "status"]
CACHED_SUBSCRIPTION_FIELDS = [
    "id",
    "customer",
    "currency",
    "default_payment_method",
    "items",
    "metadata",
    "plan",
    "status",
    "latest_invoice",
]
CACHED_CUSTOMER_FIELDS = [
    "id",
    "email",
    "invoice_settings",
]
CACHED_REFUND_FIELDS = ["charge", "id", "balance_transaction"]
# Determines how many keys get pulled in to be deleted in a single batch via redis pipeline
# This seems like a good value. There are typically ~10s of thousands of keys in cache per account, so
# this will limit the number of back and forths with redis to clear cache.
REDIS_CACHE_DELETE_BATCH_SIZE = 10000

# This is the threshold at which we want to warn that the cache is getting close to expiring after command has run
TTL_WARNING_THRESHOLD_PERCENT = 0.75

# We set up some custom logging for this module so we get timestamps, which are helpful
# in running down timing/rate limiting issues we're facing when this code runs.
logger = logging.getLogger(
    f"{settings.DEFAULT_LOGGER}.{__name__}",
)
logger_handler = logging.StreamHandler()
logger_handler.setFormatter(
    logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s:%(lineno)d - [%(funcName)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
)
logger.addHandler(logger_handler)


def log_backoff(details):
    """ """
    if isinstance((exc := details["value"]), stripe.error.RateLimitError):
        logger.warning(
            "Backing off %s seconds after %s tries due to rate limit error. "
            "Error message: %s. "
            "Status code: %s. "
            "Stripe request ID: %s. "
            "Stripe error: %s.",
            details["wait"],
            details["tries"],
            exc.user_message,
            exc.http_status,
            exc.request_id,
            exc.error,
            exc_info=True,
        )
    else:
        logger.warning(
            "Backing off seconds after {details['tries']} tries. Error: {exc}",
            details["wait"],
            details["tries"],
            exc=exc,
            exc_info=True,
        )


_STRIPE_API_BACKOFF_ARGS = {
    "max_tries": 5,
    "jitter": backoff.full_jitter,
    "on_backoff": log_backoff,
}


def upsert_payment_for_transaction(
    contribution: Contribution, transaction: stripe.BalanceTransaction, is_refund: bool = False
) -> Tuple[Payment | None, str | None]:
    """Upsert a payment object for a given stripe balance transaction and contribution"""
    logger.debug(
        "Upserting payment for contribution %s and transaction %s",
        contribution.id,
        (getattr(transaction, "id", "<no transaction>")),
    )
    if transaction:
        try:
            payment, action = upsert_with_diff_check(
                model=Payment,
                unique_identifier={"contribution": contribution, "stripe_balance_transaction_id": transaction["id"]},
                defaults={
                    "net_amount_paid": transaction["net"] if not is_refund else 0,
                    "gross_amount_paid": transaction["amount"] if not is_refund else 0,
                    # we negate transaction amount if it's a refund because Stripe represents refunds as negative amounts in balance transactions
                    # and our system represents refunds as positive amounts
                    "amount_refunded": -transaction["amount"] if is_refund else 0,
                    "transaction_time": datetime.datetime.fromtimestamp(
                        int(transaction["created"]), tz=datetime.timezone.utc
                    ),
                },
                caller_name="upsert_payment_for_transaction",
            )
        # There is an infrequently occurring edge case. If it happens, we should log exception so record in Sentry, and
        # then move on. See DEV-4666 for more detail.
        except IntegrityError:
            existing = Payment.objects.filter(stripe_balance_transaction_id=transaction["id"]).first()
            logger.exception(
                (
                    "Integrity error occurred while upserting payment with balance transaction %s for contribution %s "
                    "The existing payment is %s for contribution %s"
                ),
                transaction["id"],
                contribution.id,
                existing.id if existing else None,
                existing.contribution.id if existing else None,
            )
            return None, None
        logger.info("%s payment %s for contribution %s", action, payment.id, contribution.id)
        return payment, action
    else:
        # NB. This is a rare case. It happened running locally with test Stripe. Seems unlikely in prod, but need to handle so command
        # works in all cases
        logger.warning(
            "Data associated with contribution %s has no balance transaction associated with it. No payment will be created.",
            contribution.id,
        )
        return None, None


def parse_slug_from_url(url: str) -> str | None:
    """Parse RP slug, if any, from a given URL"""
    if tldextract.extract(url).domain not in settings.DOMAIN_APEX:
        logger.warning("URL %s has a TLD that is not allowed for import", url)
        raise InvalidStripeTransactionDataError(f"URL {url} has a TLD that is not allowed for import")
    parsed = urlparse(url)
    path_segments = [segment for segment in parsed.path.split("/") if segment]
    return path_segments[0] if len(path_segments) else None


class RedisCachePipeline(Pipeline):
    """Subclass Redis pipeline to get custom enter and exit methods and set and flush methods"""

    def __init__(self, entity_name: str, batch_size: int = 100, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.batch_size = batch_size
        self.entity_name = entity_name
        self.total_inserted = 0

    def __exit__(self, exc_type, exc_value, traceback):
        """Flush the pipeline on exit. By default Pipeline does not do this."""
        if exc_type is None:
            self.flush()
        else:
            logger.warning("Cannot flush pipeline because of exception %s", exc_value)
        super().__exit__(exc_type, exc_value, traceback)

    def set(self, entity_id: str, key: str, entity: dict, prune_fn: Callable | None = None) -> None:
        """Set a stripe resource in cache"""
        logger.debug(
            "Setting %s %s in redis cache under key %s",
            self.entity_name,
            entity_id,
            key,
        )
        if prune_fn:
            logger.debug("Pruning %s %s before caching", self.entity_name, entity_id)
            entity = prune_fn(entity)
        super().set(
            name=key, value=json.dumps(entity, cls=DjangoJSONEncoder), ex=settings.STRIPE_TRANSACTIONS_IMPORT_CACHE_TTL
        )
        if len(self) and len(self) % self.batch_size == 0:
            self.flush()

    def flush(self) -> None:
        """Flush the pipeline by caching its resources in Redis"""
        logger.debug("Flushing redis pipeline")
        insert_count = len(self)
        self.execute()
        self.total_inserted += insert_count
        logger.info("Inserted %s %ss so far", self.total_inserted, self.entity_name)


@dataclass
class StripeTransactionsImporter:
    """Class for importing Stripe transactions data to Revengine"""

    stripe_account_id: str
    from_date: datetime.datetime = None
    to_date: datetime.datetime = None

    def __post_init__(self) -> None:
        self.redis = self.get_redis_for_transactions_import()
        self.cache_ttl = settings.STRIPE_TRANSACTIONS_IMPORT_CACHE_TTL
        self.payment_intents_processed = 0
        self.subscriptions_processed = 0
        self.created_contributor_ids = set()
        self.created_contribution_ids = set()
        self.updated_contribution_ids = set()
        self.created_contributor_ids = set()
        self.created_payment_ids = set()
        self.updated_payment_ids = set()

    @staticmethod
    def get_redis_for_transactions_import() -> Redis:
        """Get a Redis connection for transactions import"""
        return get_redis_connection(settings.STRIPE_TRANSACTIONS_IMPORT_CACHE)

    @property
    def created_query(self) -> dict:
        """Generates a query that can supplied for "created" param when listing stripe resources"""
        return {k: v for k, v in {"gte": self.from_date, "lte": self.to_date}.items() if v}

    def get_or_create_contributor(self, email: str) -> Tuple[Contributor, str]:
        """Get or create a contributor"""
        logger.debug("Retrieving or creating a contributor for email %s", email)
        contributor, created = Contributor.objects.get_or_create(email=email)
        if created:
            logger.info("Created new contributor %s for %s", contributor.id, email)
        return contributor, common_utils.CREATED if created else common_utils.LEFT_UNCHANGED

    @staticmethod
    def get_interval_from_plan(plan: dict) -> ContributionInterval:
        """Map Stripe plan interval to Revengine contribution interval"""
        interval = plan["interval"]
        interval_count = plan["interval_count"]

        if interval == "year" and interval_count == 1:
            return ContributionInterval.YEARLY
        if interval == "month" and interval_count == 1:
            return ContributionInterval.MONTHLY
        raise InvalidIntervalError(f"Invalid interval {interval}")

    def validate_metadata(self, metadata: dict) -> None:
        """Validate the metadata associated with the stripe entity"""
        if (schema_version := metadata.get("schema_version", None)) not in STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS:
            raise InvalidMetadataError(f"Invalid schema version {schema_version}")
        # Calling this will raise a `InvalidMetadataError` if the metadata is invalid
        cast_metadata_to_stripe_payment_metadata_schema(metadata)

    def get_referer_from_metadata(self, metadata: dict) -> str | None:
        """ """
        referer = metadata.get("referer", None)
        if referer and f"{(_:=tldextract.extract(referer)).domain}.{_.suffix}" != settings.DOMAIN_APEX:
            logger.info("Referer %s is not allowed for import", referer)
            referer = None
        return referer

    def validate_referer_or_revenue_program(self, metadata: dict) -> None:
        """ """
        valid = True
        referer = self.get_referer_from_metadata(metadata)
        if not referer:
            valid = metadata.get("revenue_program_id", False) or False
        if not valid:
            raise InvalidMetadataError(
                f"Invalid metadata: must have valid referer or revenue_program_id, but got {metadata}"
            )

    @staticmethod
    def get_status_for_payment_intent(payment_intent: dict, has_refunds: bool) -> ContributionStatus:
        """Map Stripe payment intent status to Revengine contribution status."""
        match (has_refunds, payment_intent["status"]):
            case (True, _):
                return ContributionStatus.REFUNDED
            case (False, "succeeded"):
                return ContributionStatus.PAID
            case (False, "canceled"):
                return ContributionStatus.CANCELED
            # We'll use processing as catch all if we receive another known Stripe status.
            case (
                False,
                "processing"
                | "requires_action"
                | "requires_capture"
                | "requires_confirmation"
                | "requires_payment_method",
            ):
                return ContributionStatus.PROCESSING
            case _:
                logger.warning(
                    "Unknown status %s for payment intent %s", payment_intent["status"], payment_intent["id"]
                )
                raise InvalidStripeTransactionDataError("Unknown status for payment intent")

    @staticmethod
    def get_status_for_subscription(subscription_status: str) -> ContributionStatus:
        """Map Stripe subscription status to Revengine contribution status."""
        match subscription_status:
            # TODO: [DEV-4506] Look into inconsistencies between Stripe subscription statuses and Revengine contribution statuses
            # In revengine terms, we conflate active and past due because we don't have an internal status
            # for past due, and paid is closest given current statuses
            case "active" | "past_due":
                return ContributionStatus.PAID
            # happens after time period for incomplete, when expired no longer can be charged
            case "incomplete_expired":
                return ContributionStatus.FAILED
            case "canceled":
                return ContributionStatus.CANCELED
            case "incomplete" | "trialing":
                return ContributionStatus.PROCESSING
            case _:
                logger.warning("Unexpected status %s for subscription", subscription_status)
                return ContributionStatus.PROCESSING

    @backoff.on_exception(backoff.expo, stripe.error.RateLimitError, **_STRIPE_API_BACKOFF_ARGS)
    def list_stripe_entity(self, entity_name: str, **kwargs) -> Iterable[Any]:
        """List stripe entities for a given stripe account"""
        logger.debug("Listing %s for account %s", entity_name, self.stripe_account_id)
        return (
            getattr(stripe, entity_name)
            .list(stripe_account=self.stripe_account_id, limit=MAX_STRIPE_RESPONSE_LIMIT, **kwargs)
            .auto_paging_iter()
        )

    def should_exclude_from_cache_because_of_metadata(self, entity: dict) -> bool:
        """Determine if a payment intent should be excluded from cache"""
        return entity.metadata.get("schema_version", None) not in STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS

    @property
    def list_kwargs(self) -> dict:
        """Generates a query that can supplied for "created" param when listing stripe resources"""
        list_kwargs = {}
        if created_query := self.created_query:
            list_kwargs["created"] = created_query
        return list_kwargs

    def list_and_cache_entities(
        self,
        entity_name: str,
        prune_fn: Callable | None = None,
        exclude_fn: Callable | None = None,
        list_kwargs: dict | None = None,
    ) -> None:
        """List and cache entities for a given stripe account"""
        logger.info("Listing and caching %ss for account %s", entity_name, self.stripe_account_id)
        self.cache_stripe_resources(  # pragma: no branch  This is here because of false report of miss in coverage `exitline... didn't jump to the function exit`
            resources=self.list_stripe_entity(entity_name, **(list_kwargs or {})),
            entity_name=entity_name,
            exclude_fn=exclude_fn,
            prune_fn=prune_fn,
        )

    def list_and_cache_payment_intents(self) -> None:
        """List and cache payment intents for a given stripe account"""
        self.list_and_cache_entities(  # pragma: no branch This is here because of false report of miss in coverage `exitline... didn't jump to the function exit`
            entity_name="PaymentIntent",
            exclude_fn=self.should_exclude_from_cache_because_of_metadata,
            prune_fn=lambda x: {k: v for k, v in x.items() if k in CACHED_PAYMENT_INTENT_FIELDS},
            list_kwargs=self.list_kwargs,
        )

    def list_and_cache_subscriptions(self) -> None:
        """List and cache subscriptions for a given stripe account"""
        self.list_and_cache_entities(  # pragma: no branch This is here because of false report of miss in coverage `exitline... didn't jump to the function exit`
            entity_name="Subscription",
            exclude_fn=self.should_exclude_from_cache_because_of_metadata,
            prune_fn=lambda x: {k: v for k, v in x.items() if k in CACHED_SUBSCRIPTION_FIELDS},
            list_kwargs=self.list_kwargs,
        )

    def list_and_cache_charges(self) -> None:
        """List and cache charges for a given stripe account

        Note that even if this class has been initiated with a `from_date` and `to_date`, we don't pass these to the stripe API
        when retrieving charges. This is because we want to cache all charges for the account, not just those within a specific date range, since
        the parent subscription for a charge could be in date range, but the charge itself could be outside of it. If we import a contribution,
        we want all of its charges, even if they're outside of the date range.
        """
        self.list_and_cache_entities(  # pragma: no branch This is here because of false report of miss in coverage `exitline... didn't jump to the function exit`
            entity_name="Charge",
            prune_fn=lambda x: {k: v for k, v in x.items() if k in CACHED_CHARGE_FIELDS},
        )

    def list_and_cache_invoices(self, **kwargs) -> None:
        """List and cache invoices for a given stripe account"""
        self.list_and_cache_entities(  # pragma: no branch This is here because of false report of miss in coverage `exitline... didn't jump to the function exit`
            entity_name="Invoice",
            prune_fn=lambda x: {k: v for k, v in x.items() if k in CACHED_INVOICE_FIELDS},
        )

    def list_and_cache_refunds(self, **kwargs) -> None:
        """List and cache refunds for a given stripe account"""
        self.list_and_cache_entities(  # pragma: no branch This is here because of false report of miss in coverage `exitline... didn't jump to the function exit`
            entity_name="Refund",
            prune_fn=lambda x: {k: v for k, v in x.items() if k in CACHED_REFUND_FIELDS},
        )

    def list_and_cache_balance_transactions(self, **kwargs) -> None:
        """List and cache balance transactions for a given stripe account"""
        self.list_and_cache_entities(  # pragma: no branch This is here because of false report of miss in coverage `exitline... didn't jump to the function exit`
            entity_name="BalanceTransaction",
            prune_fn=lambda x: {k: v for k, v in x.items() if k in CACHED_BALANCE_TRANSACTION_FIELDS},
        )

    def list_and_cache_customers(self, **kwargs) -> None:
        """List and cache customers for a given stripe account"""
        self.list_and_cache_entities(  # pragma: no branch This is here because of false report of miss in coverage `exitline... didn't jump to the function exit`
            entity_name="Customer",
            prune_fn=lambda x: {k: v for k, v in x.items() if k in CACHED_CUSTOMER_FIELDS},
        )

    def get_redis_pipeline(self, entity_name) -> RedisCachePipeline:
        """Get a Redis pipeline"""
        return RedisCachePipeline(
            connection_pool=self.redis.connection_pool,
            response_callbacks=self.redis.response_callbacks,
            transaction=False,
            shard_hint=None,
            entity_name=entity_name,
        )

    def cache_stripe_resources(
        self,
        resources: Iterable[Any],
        entity_name: str,
        exclude_fn: Callable | None = None,
        prune_fn: Callable | None = None,
    ) -> None:
        """Cache stripe resources"""
        logger.info("Caching %ss for account %s", entity_name, self.stripe_account_id)
        excluded_count = 0
        with self.get_redis_pipeline(entity_name=entity_name) as pipeline:
            for resource in resources:
                if exclude_fn and exclude_fn(resource):
                    logger.debug(
                        "Excluding %s %s from cache because excluded by `exclude_fn`", entity_name, resource.id
                    )
                    excluded_count += 1
                    continue
                pipeline.set(
                    entity_id=resource.id,
                    key=self.make_key(entity_name=entity_name, entity_id=resource.id),
                    entity=resource.to_dict(),
                    prune_fn=prune_fn,
                )
        logger.info(
            "Cached %s %s%s and excluded %s for account %s",
            pipeline.total_inserted,
            entity_name,
            "" if pipeline.total_inserted == 1 else "s",
            excluded_count,
            self.stripe_account_id,
        )

    def make_key(self, entity_name: str | None = None, entity_id: str | None = None) -> str:
        """Make a key for a given stripe resource"""
        parts = [x for x in [entity_name, entity_id] if x]
        return f"{CACHE_KEY_PREFIX}_{'_'.join(parts)}{'_' if parts else ''}{self.stripe_account_id}"

    def cache_entity_by_another_entity_id(
        self, destination_entity_name: str, entity_name: str, by_entity_name: str
    ) -> None:
        """Cache an entity by another entity id"""
        logger.info("Caching %ss by %s id", entity_name, by_entity_name)
        with self.get_redis_pipeline(entity_name=destination_entity_name) as pipeline:
            for key in self.redis.scan_iter(match=self.make_key(entity_name=f"{entity_name}_*")):
                entity = self.get_resource_from_cache(key)
                if entity and (by_id := entity.get(by_entity_name)):
                    pipeline.set(
                        entity_id=(entity_id := f"{by_id}_{entity['id']}"),
                        key=self.make_key(entity_name=destination_entity_name, entity_id=entity_id),
                        entity=entity,
                    )

    def cache_charges_by_payment_intent_id(self) -> None:
        """Cache charges by payment intent id"""
        self.cache_entity_by_another_entity_id(
            destination_entity_name="ChargeByPaymentIntentId", entity_name="Charge", by_entity_name="payment_intent"
        )

    def cache_invoices_by_subscription_id(self) -> None:
        """Cache invoices by subscription id"""
        self.cache_entity_by_another_entity_id(
            destination_entity_name="InvoiceBySubId", entity_name="Invoice", by_entity_name="subscription"
        )

    def cache_refunds_by_charge_id(self) -> None:
        """Cache refunds by charge id"""
        self.cache_entity_by_another_entity_id(
            destination_entity_name="RefundByChargeId", entity_name="Refund", by_entity_name="charge"
        )

    def list_and_cache_required_stripe_resources(self) -> None:
        """List and cache required stripe resources for a given stripe account"""
        logger.info("Listing and caching required stripe resources for account %s", self.stripe_account_id)
        self.list_and_cache_payment_intents()
        self.list_and_cache_subscriptions()
        self.list_and_cache_charges()
        self.list_and_cache_invoices()
        self.list_and_cache_balance_transactions()
        self.list_and_cache_customers()
        self.list_and_cache_refunds()
        self.cache_invoices_by_subscription_id()
        self.cache_charges_by_payment_intent_id()
        self.cache_refunds_by_charge_id()

    def get_resource_from_cache(self, key: str) -> dict | None:
        """Get a stripe resource from cache, loading JSON"""
        logger.debug(
            "Attempting to retrieve value for key %s from redis cache",
            key,
        )
        if cached := self.redis.get(key):
            return json.loads(cached)

    @classmethod
    def get_data_from_plan(cls, plan: dict | None) -> dict:
        """Get data from a stripe plan"""
        if not plan:
            raise InvalidStripeTransactionDataError("No plan data present")
        return {
            "amount": plan["amount"],
            # NB: Stripe currency as returned by API is lowercased, but when we create contributions in revengine
            # donation page flow, we use uppercase currency (see organizations.models.PaymentProvider.currency default of USD), so
            # we need to uppercase it here, lest we superfluously update a large number of records from "USD" to "usd"
            "currency": plan["currency"].upper(),
            # .get_interval_from_plan will raise an `InvalidIntervalError` if the interval is invalid
            "interval": cls.get_interval_from_plan(plan),
        }

    def get_invoices_for_subscription(self, subscription_id: str) -> list[dict]:
        """Get cached invoices, if any for a given subscription id"""
        results = []
        for key in self.redis.scan_iter(
            match=self.make_key(entity_name="InvoiceBySubId", entity_id=f"{subscription_id}*")
        ):
            results.append(self.get_resource_from_cache(key))
        return results

    def get_charges_for_subscription(self, subscription_id: str) -> list[dict]:
        """Get cached charges, if any for a given subscription id"""
        results = []
        invoices = self.get_invoices_for_subscription(subscription_id)
        for x in filter(lambda x: x.get("charge", None), invoices):
            results.append(self.get_resource_from_cache(self.make_key(entity_name="Charge", entity_id=x["charge"])))
        return list(filter(lambda x: bool(x), results))

    def get_refunds_for_charge(self, charge_id: str) -> list[dict]:
        """Get cached refunds, if any for a given charge id"""
        results = []

        for key in self.redis.scan_iter(match=self.make_key(entity_name="RefundByChargeId", entity_id=f"{charge_id}*")):
            results.append(self.get_resource_from_cache(key))
        return results

    def get_refunds_for_subscription(self, subscription_id: str) -> list[dict]:
        """Get cached refunds, if any for a given subscription id"""
        results = []
        for charge in self.get_charges_for_subscription(subscription_id):
            results.extend(self.get_refunds_for_charge(charge["id"]))
        return results

    def get_or_create_contributor_from_customer(self, customer_id: str) -> Tuple[Contributor, str]:
        """Get or create a contributor from a stripe customer id"""
        customer = self.get_resource_from_cache(self.make_key(entity_name="Customer", entity_id=customer_id))
        if not customer:
            raise InvalidStripeTransactionDataError(f"No customer found for id {customer_id}")
        return self.get_or_create_contributor(email=customer["email"])

    @backoff.on_exception(backoff.expo, stripe.error.RateLimitError, **_STRIPE_API_BACKOFF_ARGS)
    def get_payment_method(self, pm_id: str) -> stripe.PaymentMethod:
        """Get a payment method from stripe"""
        return stripe.PaymentMethod.retrieve(pm_id, stripe_account=self.stripe_account_id)

    def get_payment_method_id_for_stripe_entity(
        self, stripe_entity: dict, customer_id: str, is_one_time: bool
    ) -> str | None:
        """Get the payment method ID associated with Stripe payment intent or subscription.

        We prefer default payment method on sub/pi if present, but if not, we try getting from Stripe customer.
        """
        logger.debug("Getting payment method ID for %s", stripe_entity["id"])
        customer = self.get_resource_from_cache(self.make_key(entity_name="Customer", entity_id=customer_id))
        pm_id = (
            stripe_entity.get("payment_method", None)
            if is_one_time
            else stripe_entity.get("default_payment_method", None)
        )
        if not pm_id and customer.get("invoice_settings", None):
            pm_id = customer["invoice_settings"].get("default_payment_method", None)
        return pm_id

    def update_contribution_stats(self, action: str, contribution: Contribution | None) -> None:
        match action:
            case common_utils.CREATED:
                self.created_contribution_ids.add(contribution.id)
            case common_utils.UPDATED:
                self.updated_contribution_ids.add(contribution.id)
            case common_utils.LEFT_UNCHANGED:
                pass
            case _:
                logger.warning("Unexpected action %s for contribution %s", action, contribution.id)

    def update_contributor_stats(self, action: str, contributor: Contributor | None) -> None:
        match action:
            case common_utils.CREATED:
                self.created_contributor_ids.add(contributor.id)
            case common_utils.UPDATED | common_utils.LEFT_UNCHANGED:
                pass
            case _:
                logger.warning("Unexpected action %s for contributor %s", action, contributor.id)

    def update_payment_stats(self, action: str, payment: Payment) -> None:
        match action:
            case common_utils.CREATED:
                self.created_payment_ids.add(payment.id)
            case common_utils.UPDATED:
                self.updated_payment_ids.add(payment.id)
            case common_utils.LEFT_UNCHANGED:
                pass
            case _:
                logger.warning("Unexpected action %s for payment %s", action, payment.id)

    def get_charges_for_payment_intent(self, payment_intent_id: str) -> list[dict]:
        """Get charges for a payment intent from cache"""
        charges = []
        for key in self.redis.scan_iter(
            match=self.make_key(entity_name="ChargeByPaymentIntentId", entity_id=f"{payment_intent_id}*")
        ):
            charge = self.get_resource_from_cache(key)
            charges.append(charge)
        return charges

    def get_successful_charge_for_payment_intent(self, payment_intent_id: str) -> dict | None:
        """Get single successful charge for a PI. If >1 successful, raises an error"""
        successful = [x for x in self.get_charges_for_payment_intent(payment_intent_id) if x["status"] == "succeeded"]
        if len(successful) > 1:
            raise InvalidStripeTransactionDataError(
                f"Payment intent {payment_intent_id} has multiple successful charges associated with it"
            )
        if successful:
            return successful[0]

    def get_refunds_for_payment_intent(self, payment_intent: dict) -> list[dict]:
        """Get refunds for a payment intent"""
        refunds = []
        for charge in self.get_charges_for_payment_intent(payment_intent["id"]):
            refunds.extend(self.get_refunds_for_charge(charge["id"]))
        return refunds

    def upsert_payments_for_contribution(self, contribution: Contribution) -> None:
        """Upsert payments for a given contribution

        For each charge and each refund associated with a contribution, we'll upsert a payment object
        """
        if contribution.interval == ContributionInterval.ONE_TIME:
            pi = self.get_resource_from_cache(
                self.make_key(entity_name="PaymentIntent", entity_id=contribution.provider_payment_id)
            )
            # will raise an `InvalidStripeTransactionDataError` if there's more than one charge with status other than failed
            successful_charge = self.get_successful_charge_for_payment_intent(pi["id"])
            charges = [successful_charge] if successful_charge else []
            refunds = self.get_refunds_for_charge(successful_charge["id"]) if successful_charge else []
        else:
            charges = self.get_charges_for_subscription(contribution.provider_subscription_id)
            refunds = self.get_refunds_for_subscription(contribution.provider_subscription_id)
        for entity, is_refund in itertools.chain(
            zip(charges, itertools.repeat(False)), zip(refunds, itertools.repeat(True))
        ):
            if not entity or not entity.get("balance_transaction", None):
                logger.info(
                    "Data associated with %s %s for contribution %s has no balance transaction associated with it. No payment will be created.",
                    "refund" if is_refund else "charge",
                    entity["id"] if entity else "None",
                    contribution.id,
                )
                continue
            balance_transaction = self.get_resource_from_cache(
                self.make_key(
                    entity_name="BalanceTransaction",
                    entity_id=entity["balance_transaction"],
                )
            )
            payment, action = upsert_payment_for_transaction(contribution, balance_transaction, is_refund)
            if payment:
                logger.info("Payment %s for contribution %s was %s", payment.id, contribution.id, action)
            else:
                logger.info(
                    "No payment created for contribution %s and balance transaction %s",
                    contribution.id,
                    balance_transaction["id"],
                )
            self.update_payment_stats(action, payment)

    def get_provider_payment_id_for_subscription(self, subscription: dict) -> str | None:
        """Get provider payment id for a subscription"""
        if invoice_id := subscription.get("latest_invoice", None):
            invoice = self.get_resource_from_cache(self.make_key(entity_name="Invoice", entity_id=invoice_id))
            return invoice.get("payment_intent", None)

    def get_default_contribution_data(
        self,
        stripe_entity: dict,
        is_one_time: bool,
        contributor: Contributor,
        customer_id: str,
        payment_method_id: str | None,
        payment_method: dict | None,
    ) -> dict:
        """Get default contribution data for a given stripe entity"""
        shared = {
            "contributor": contributor,
            "contribution_metadata": stripe_entity["metadata"],
            "payment_provider_used": PaymentProvider.STRIPE_LABEL,
            "provider_customer_id": customer_id,
            "provider_payment_method_id": payment_method_id,
            "provider_payment_method_details": payment_method,
        }
        if is_one_time:
            has_refunds = len(self.get_refunds_for_payment_intent(stripe_entity)) > 0
            return shared | {
                "amount": stripe_entity["amount"],
                # NB: Stripe currency as returned by API is lowercased, but when we create contributions in revengine
                # donation page flow, we use uppercase currency (see organizations.models.PaymentProvider.currency default of USD), so
                # we need to uppercase it here, lest we superfluously update a large number of records from "USD" to "usd"
                "currency": stripe_entity["currency"].upper(),
                "interval": ContributionInterval.ONE_TIME,
                "status": self.get_status_for_payment_intent(payment_intent=stripe_entity, has_refunds=has_refunds),
            }
        else:
            plan = stripe_entity["items"]["data"][0]["plan"] if stripe_entity["items"]["data"] else None
            return (
                shared
                | self.get_data_from_plan(plan)
                | {
                    "provider_payment_id": self.get_provider_payment_id_for_subscription(stripe_entity),
                    "status": self.get_status_for_subscription(stripe_entity["status"]),
                }
            )

    def get_revenue_program_from_metadata(self, metadata: dict) -> RevenueProgram | None:
        """Get a revenue program from stripe metadata"""
        if not (rp_id := metadata.get("revenue_program_id", None)):
            logger.warning("No revenue program id found in stripe metadata %s", metadata)
            return None
        return RevenueProgram.objects.filter(id=rp_id).first()

    def get_donation_page_from_metadata(self, metadata: dict) -> DonationPage | None:
        """Attempt to derive a donation page from stripe metadata.

        Note that this method assumes that referer has already been validated as present upstream, in which
        case it is guaranteed to have a revenue_program_id key (though it could possibly be empty string)
        """
        if not (rp_id := metadata["revenue_program_id"]):
            logger.warning("No revenue program id found in stripe metadata %s", metadata)
            return None
        revenue_program = RevenueProgram.objects.filter(id=rp_id).first()
        if not revenue_program:
            logger.warning("No revenue program found for id %s", rp_id)
            return None
        if (_slug := metadata.get("referer")) and (slug := parse_slug_from_url(_slug)):
            return revenue_program.donationpage_set.filter(slug=slug).first()

    @transaction.atomic
    def upsert_contribution(self, stripe_entity: dict, is_one_time: bool) -> Tuple[Contribution, str]:
        """Upsert a contribution for a given stripe entity"""
        entity_name = "payment intent" if is_one_time else "subscription"
        logger.info("Upserting contribution for %s %s", entity_name, stripe_entity["id"])
        self.validate_metadata((metadata := stripe_entity.get("metadata", None)))
        self.validate_referer_or_revenue_program(metadata)
        cust_id = stripe_entity.get("customer", None)
        if not cust_id:
            raise InvalidStripeTransactionDataError(f"No customer found for {entity_name} {stripe_entity['id']}")
        contributor, contributor_action = self.get_or_create_contributor_from_customer(cust_id)
        pm_id = self.get_payment_method_id_for_stripe_entity(
            stripe_entity=stripe_entity, customer_id=cust_id, is_one_time=is_one_time
        )
        pm = None
        if self.retrieve_payment_method and pm_id:
            retrieved = self.get_payment_method(pm_id)
            if retrieved:
                pm = retrieved.to_dict()
        defaults = self.get_default_contribution_data(
            stripe_entity,
            is_one_time=is_one_time,
            contributor=contributor,
            customer_id=cust_id,
            payment_method_id=pm_id,
            payment_method=pm,
        )
        donation_page = self.get_donation_page_from_metadata(metadata)
        if donation_page:
            defaults["donation_page"] = donation_page
        elif rp := self.get_revenue_program_from_metadata(metadata):
            defaults["_revenue_program"] = rp
        if not defaults.get("donation_page") and not defaults.get("_revenue_program"):
            raise InvalidStripeTransactionDataError(
                f"Could not create a contribution for {entity_name} {stripe_entity['id']} because cannot "
                f"associate a donation page or revenue program with it."
            )

        contribution, contribution_action = upsert_with_diff_check(
            model=Contribution,
            unique_identifier={
                "provider_payment_id" if is_one_time else "provider_subscription_id": stripe_entity["id"]
            },
            defaults=defaults,
            caller_name="StripeTransactionsImporter.upsert_contribution",
            # If there's contribution metadata, we want to leave it intact.
            # Otherwise we see spurious updates because of key ordering in the
            # metadata and conversions of null <-> None.
            # We also don't want to update the _revenue program or donation page if they are already
            # set on off chance that we would provide both by updating (which would cause an integrity error because
            # one or the other must be set, but not both)
            dont_update=["contribution_metadata", "_revenue_program", "donation_page"],
        )

        logger.info("Upserting payments for %s %s", entity_name, stripe_entity["id"])
        self.upsert_payments_for_contribution(contribution)
        self.update_contribution_stats(contribution_action, contribution)
        self.update_contributor_stats(contributor_action, contributor)
        return contribution, contribution_action

    def process_transactions_for_recurring_contributions(self) -> None:
        """Assemble data and ultimately upsert data for a recurring contribution."""
        logger.info("Processing transactions for recurring contributions")
        for key in self.redis.scan_iter(match=self.make_key(entity_name="Subscription_*")):
            subscription = self.get_resource_from_cache(key)
            try:
                contribution, action = self.upsert_contribution(stripe_entity=subscription, is_one_time=False)
            except (InvalidStripeTransactionDataError, InvalidMetadataError, InvalidIntervalError) as exc:
                logger.info(
                    "Unable to upsert subscription %s because %s %s; skipping",
                    subscription["id"],
                    type(exc).__name__,
                    exc,
                )
                continue
            logger.info(
                "Processed subscription %s. Contribution %s was %s", subscription["id"], contribution.id, action
            )
            self.subscriptions_processed += 1

    def process_transactions_for_one_time_contributions(self) -> None:
        """Process transactions for one-time contributions.

        Note that the starting point here is the set of cached payment intents. Because we filter out payment intents
        without referer and schema_version, we know ahead of time that all of the PIs we're looking at are for one-time contributions.
        """
        logger.info("Processing transactions for one-time contributions")
        for key in self.redis.scan_iter(match=self.make_key(entity_name="PaymentIntent_*")):
            pi = self.get_resource_from_cache(key)
            try:
                contribution, action = self.upsert_contribution(stripe_entity=pi, is_one_time=True)
            except (InvalidStripeTransactionDataError, InvalidMetadataError) as exc:
                logger.info("Unable to upsert a contribution for %s because %s %s ", pi["id"], type(exc).__name__, exc)
                continue
            logger.info("Processed payment intent %s. Contribution %s was %s", pi["id"], contribution.id, action)
            self.payment_intents_processed += 1

    def format_timedelta(self, td: datetime.timedelta) -> str:
        """Format a timedelta"""
        total_seconds = int(td.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)

        if hours > 0:
            return f"{hours} hours and {minutes} minutes"
        elif minutes > 0:
            # Format minutes to include fractions if there are additional seconds
            if seconds > 0:
                fraction = seconds / 60
                total_minutes = minutes + fraction
                return f"{total_minutes:.3f} minutes"
            else:
                return f"{minutes} minutes"
        else:
            return f"{seconds} seconds"

    def log_ttl_concerns(self, start_time: datetime.datetime) -> None:
        """Log concerns about TTLs"""
        elapsed = datetime.datetime.now(datetime.timezone.utc) - start_time
        if elapsed.seconds > settings.STRIPE_TRANSACTIONS_IMPORT_CACHE_TTL * TTL_WARNING_THRESHOLD_PERCENT:
            logger.warning(
                (
                    "Stripe import for account %s took %s, which is longer than %s%% of the cache TTL (%s). "
                    "Consider increasing TTLs for cache entries related to stripe import."
                ),
                self.stripe_account_id,
                self.format_timedelta(elapsed),
                TTL_WARNING_THRESHOLD_PERCENT * 100,
                self.format_timedelta(datetime.timedelta(seconds=settings.STRIPE_TRANSACTIONS_IMPORT_CACHE_TTL)),
            )

    def import_contributions_and_payments(self) -> None:
        """This method is responsible for upserting contributors, contributions, and payments for a given stripe account."""
        started = datetime.datetime.now(datetime.timezone.utc)
        self.list_and_cache_required_stripe_resources()
        self.log_memory_usage()
        self.process_transactions_for_recurring_contributions()
        self.process_transactions_for_one_time_contributions()
        self.log_results()
        self.clear_cache_for_account()
        logger.info(
            "Stripe import for account %s took %s",
            self.stripe_account_id,
            self.format_timedelta(datetime.datetime.now(datetime.timezone.utc) - started),
        )
        self.log_ttl_concerns(started)

    def log_results(self) -> None:
        """Log the results of the stripe import"""
        logger.info(
            (
                "Here's what happened: \n"
                "%s Stripe payment intents for one-time contributions were processed.\n"
                "%s Stripe subscriptions for recurring contributions were processed.\n"
                "%s contributions were created and %s were updated.\n"
                "%s payments were created and %s were updated.\n"
                "%s contributors were created."
            ),
            self.payment_intents_processed,
            self.subscriptions_processed,
            len(self.created_contribution_ids),
            len(self.updated_contribution_ids),
            len(self.created_payment_ids),
            len(self.updated_payment_ids),
            len(self.created_contributor_ids),
        )

    @classmethod
    def _clear_cache(cls, redis: Redis, match: str) -> None:
        """Clear cache for a given match"""
        logger.info("Clearing cache for match %s", match)
        pipeline = redis.pipeline()
        to_clear = 0
        for key in redis.scan_iter(match=match):
            pipeline.delete(key)
            to_clear += 1
        pipeline.execute()
        logger.info("Cleared %s entries from cache", to_clear)

    @classmethod
    def clear_all_stripe_transactions_cache(cls) -> None:
        """Clear all stripe transactions cache"""
        logger.info("Clearing all stripe transactions cache")
        cls._clear_cache(redis=cls.get_redis_for_transactions_import(), match=f"{CACHE_KEY_PREFIX}*")
        logger.info("Cleared all stripe transactions cache")

    def clear_cache_for_account(self) -> None:
        """Clear the cache of entries related to specific Stripe account"""
        logger.info("Clearing redis cache of entries related to stripe import for account %s", self.stripe_account_id)
        self._clear_cache(match=self.make_key(entity_name="*"), redis=self.redis)
        logger.info("Cleared redis cache of entries related to stripe import for account %s", self.stripe_account_id)

    @staticmethod
    def convert_bytes(size: int) -> str:
        """Convert bytes to human readable format"""
        # Hat tip: https://stackoverflow.com/a/12912296
        UNITS_MAPPING = [
            (1 << 50, " PB"),
            (1 << 40, " TB"),
            (1 << 30, " GB"),
            (1 << 20, " MB"),
            (1 << 10, " KB"),
            (1, (" byte", " bytes")),
        ]
        for factor, suffix in UNITS_MAPPING:
            if size >= factor:
                break
        amount = int(size / factor)

        if isinstance(suffix, tuple):
            singular, multiple = suffix
            if amount == 1:
                suffix = singular
            else:
                suffix = multiple
        return str(amount) + suffix

    def get_redis_memory_usage(self) -> int:
        """Get redis memory usage for a given stripe account in bytes"""
        total_memory = 0
        for key in self.redis.scan_iter(match=self.make_key(entity_name="*")):
            memory_usage = self.redis.memory_usage(key)
            if memory_usage:
                total_memory += memory_usage
        return total_memory

    def log_memory_usage(self):
        """Log memory usage for a given stripe account"""
        num_subs_in_cache = len(list(self.redis.scan_iter(match=self.make_key(entity_name="Subscription_*"))))
        num_pis_in_cache = len(list(self.redis.scan_iter(match=self.make_key(entity_name="PaymentIntent_*"))))
        num_invoices_in_cache = len(list(self.redis.scan_iter(match=self.make_key(entity_name="Invoice_*"))))
        num_charges_in_cache = len(list(self.redis.scan_iter(match=self.make_key(entity_name="Charge_*"))))
        num_refunds_in_cache = len(list(self.redis.scan_iter(match=self.make_key(entity_name="Refund_*"))))
        num_customers_in_cache = len(list(self.redis.scan_iter(match=self.make_key(entity_name="Customer_*"))))
        num_bts_in_cache = len(list(self.redis.scan_iter(match=self.make_key(entity_name="BalanceTransaction_*"))))

        logger.info(
            (
                "With %s cached subscriptions, "
                "%s cached payment intents, "
                "%s cached invoices, "
                "%s cached charges, "
                "%s cached refunds, "
                "%s cached customers, "
                "and %s cached balance transactions, "
                "Redis memory usage for transactions "
                "import for stripe account %s is: %s"
            ),
            num_subs_in_cache,
            num_pis_in_cache,
            num_invoices_in_cache,
            num_charges_in_cache,
            num_refunds_in_cache,
            num_customers_in_cache,
            num_bts_in_cache,
            self.stripe_account_id,
            self.convert_bytes(self.get_redis_memory_usage()),
        )


@dataclass(frozen=True)
class StripeEventProcessor:
    """Class for processing a stripe event. Uses existing webhook processor for this."""

    event_id: str
    stripe_account_id: str
    async_mode: bool = False

    def get_event(self) -> stripe.Event | None:
        """Gets a stripe event for a given event id and stripe account id."""
        try:
            return stripe.Event.retrieve(id=self.event_id, stripe_account=self.stripe_account_id)
        except stripe.error.StripeError as exc:
            logger.warning(
                "Unable to retrieve stripe event with ID %s for stripe account %s",
                self.event_id,
                self.stripe_account_id,
                exc_info=exc,
            )

    def process(self) -> None:
        # vs. circular import
        from .tasks import process_stripe_webhook_task

        if not (event := self.get_event()):
            logger.warning("No event found for event id %s", self.event_id)
            return
        if event.type not in settings.STRIPE_WEBHOOK_EVENTS_CONTRIBUTIONS:
            logger.warning("Event type %s is not supported", event.type)
            return
        if self.async_mode:
            process_stripe_webhook_task.delay(raw_event_data=event)
        else:
            process_stripe_webhook_task(raw_event_data=event)
