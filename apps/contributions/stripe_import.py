import datetime
import itertools
import json
import logging
from dataclasses import dataclass
from typing import Any, Callable, Iterable, Tuple
from urllib.parse import urlparse

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction

import backoff
import redis
import reversion
import stripe
import tldextract

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

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")

_STRIPE_API_BACKOFF_ARGS = {
    "max_tries": 5,
    "jitter": backoff.full_jitter,
}

# by default, backoff logs to a NullHandler. We want to be able to log giveup errors.
logging.getLogger("backoff").addHandler(logging.StreamHandler())
# this will cause backoff to only log in event of an error
logging.getLogger("backoff").setLevel(logging.ERROR)


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
        payment, action = upsert_with_diff_check(
            model=Payment,
            unique_identifier={"contribution": contribution, "stripe_balance_transaction_id": transaction["id"]},
            defaults={
                "net_amount_paid": transaction["net"] if not is_refund else 0,
                "gross_amount_paid": transaction["amount"] if not is_refund else 0,
                "amount_refunded": transaction["amount"] if is_refund else 0,
                "transaction_time": datetime.datetime.fromtimestamp(
                    int(transaction["created"]), tz=datetime.timezone.utc
                ),
            },
            caller_name="upsert_payment_for_transaction",
        )
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


@dataclass
class StripeTransactionsImporter:
    """Class for importing Stripe transactions data to Revengine"""

    stripe_account_id: str
    from_date: datetime.datetime = None
    to_date: datetime.datetime = None

    _STRIPE_SEARCH_FILTER_METADATA_QUERY: str = '-metadata["referer"]:null AND -metadata["schema_version"]:null'

    def __post_init__(self) -> None:
        self.redis = redis.Redis.from_url(settings.CACHES[settings.STRIPE_TRANSACTIONS_IMPORT_CACHE]["LOCATION"])
        self.cache_ttl = settings.STRIPE_TRANSACTIONS_IMPORT_CACHE_TTL
        self.payment_intents_processed = 0
        self.subscriptions_processed = 0
        self.created_contributor_ids = set()
        self.created_contribution_ids = set()
        self.updated_contribution_ids = set()
        self.created_contributor_ids = set()
        self.created_payment_ids = set()
        self.updated_payment_ids = set()

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
        return contributor, "created" if created else "retrieved"

    @staticmethod
    def get_interval_from_plan(plan: dict) -> ContributionInterval:
        """Map Stripe splan interval to Revengine contribution interval"""
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

    def validate_referer(self, referer: str) -> None:
        """For now, we require a referer to be present in the metadata. This is because we need to know the donation page.

        This requirement may change in the future. See [DEV-4562] in JIRA for more detail.
        """
        if not referer:
            raise InvalidStripeTransactionDataError("Missing referer")
        if f"{(_:=tldextract.extract(referer)).domain}.{_.suffix}" != settings.DOMAIN_APEX:
            raise InvalidStripeTransactionDataError(f"Referer {referer} is not allowed for import")

    def get_status_for_payment_intent(self, payment_intent: dict, has_refunds: bool) -> ContributionStatus:
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
                    "Unknown status %s for payment intent %s", self.payment_intent.status, self.payment_intent.id
                )
                raise InvalidStripeTransactionDataError("Unknown status for payment intent")

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
        return not all(
            [
                entity.metadata.get("schema_version", None) in STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS,
                entity.metadata.get("referer", None),
            ]
        )

    @property
    def list_kwargs(self) -> dict:
        """Generates a query that can supplied for "created" param when listing stripe resources"""
        list_kwargs = {}
        if created_query := self.created_query:
            list_kwargs["created"] = created_query
        return list_kwargs

    def list_and_cache_payment_intents(self) -> None:
        """List and cache payment intents for a given stripe account"""
        logger.info("Listing and caching payment intents for account %s", self.stripe_account_id)
        self.cache_stripe_resources(
            resources=self.list_stripe_entity((name := "PaymentIntent"), **self.list_kwargs),
            entity_name=name,
            exclude_fn=self.should_exclude_from_cache_because_of_metadata,
        )

    def list_and_cache_subscriptions(self) -> None:
        """List and cache subscriptions for a given stripe account"""
        logger.info("Listing and caching subscriptions for account %s", self.stripe_account_id)
        self.cache_stripe_resources(
            resources=self.list_stripe_entity((name := "Subscription"), **self.list_kwargs),
            entity_name=name,
            exclude_fn=self.should_exclude_from_cache_because_of_metadata,
        )

    def list_and_cache_charges(self, **kwargs) -> None:
        """List and cache charges for a given stripe account

        Note that even if this class has been initiated with a `from_date` and `to_date`, we don't pass these to the stripe API
        for this method. This is because we want to cache all charges for the account, not just those within a specific date range, since
        the parent subscription for a charge could be in date range, but the charge itself could be outside of it. If we import a contribution,
        we want all of its charges, even if they're outside of the date range.
        """
        logger.info("Listing and caching charges for account %s", self.stripe_account_id)
        self.cache_stripe_resources(resources=self.list_stripe_entity((name := "Charge"), **kwargs), entity_name=name)

    def list_and_cache_invoices(self, **kwargs) -> None:
        """List and cache invoices for a given stripe account"""
        logger.info("Listing and caching invoices for account %s", self.stripe_account_id)
        self.cache_stripe_resources(resources=self.list_stripe_entity((name := "Invoice"), **kwargs), entity_name=name)

    def list_and_cache_refunds(self, **kwargs) -> None:
        """List and cache refunds for a given stripe account"""
        logger.info("Listing and caching refunds for account %s", self.stripe_account_id)
        self.cache_stripe_resources(resources=self.list_stripe_entity((name := "Refund"), **kwargs), entity_name=name)

    def list_and_cache_balance_transactions(self, **kwargs) -> None:
        """List and cache balance transactions for a given stripe account"""
        logger.info("Listing and caching balance transactions for account %s", self.stripe_account_id)
        self.cache_stripe_resources(
            resources=self.list_stripe_entity((name := "BalanceTransaction"), **kwargs), entity_name=name
        )

    def list_and_cache_customers(self, **kwargs) -> None:
        """List and cache customers for a given stripe account"""
        logger.info("Listing and caching customers for account %s", self.stripe_account_id)
        self.cache_stripe_resources(resources=self.list_stripe_entity((name := "Customer"), **kwargs), entity_name=name)

    def cache_stripe_resources(
        self, resources: Iterable[Any], entity_name: str, exclude_fn: Callable | None = None
    ) -> None:
        """Cache stripe resources"""
        logger.info("Caching %ss for account %s", entity_name, self.stripe_account_id)
        cached_count = 0
        excluded_count = 0
        for resource in resources:
            if exclude_fn and exclude_fn(resource):
                logger.debug("Excluding %s %s from cache because excluded by `exclude_fn`", entity_name, resource.id)
                excluded_count += 1
                continue
            self.put_in_cache(entity_id=resource.id, entity_name=entity_name, entity=resource.to_dict())
            logger.info(
                "Cached %s %s for account %s. %s cached so far",
                entity_name,
                resource.id,
                self.stripe_account_id,
                cached_count,
            )
            cached_count += 1
        logger.info(
            "Cached %s %s%s and excluded %s for account %s",
            cached_count,
            entity_name,
            "" if cached_count == 1 else "s",
            excluded_count,
            self.stripe_account_id,
        )

    def make_key(self, entity_id: str, entity_name: str) -> str:
        """Make a key for a given stripe resource"""
        return f"stripe_import_{entity_name}_{entity_id}_{self.stripe_account_id}"

    def put_in_cache(self, entity_id: str, entity_name: str, entity: dict) -> None:
        """Put a stripe resource in cache"""
        logger.debug(
            "Putting %s %s in redis cache under key %s",
            entity_name,
            entity_id,
            (key := self.make_key(entity_id=entity_id, entity_name=entity_name)),
        )
        self.redis.set(key, json.dumps(entity, cls=DjangoJSONEncoder), ex=self.cache_ttl)

    def cache_charges_by_payment_intent_id(self) -> None:
        """Cache charges by payment intent id"""
        for key in self.redis.scan_iter(match="stripe_import_Charge*"):
            charge = self.get_resource_from_cache(key)
            if charge and (pi_id := charge.get("payment_intent")):
                self.put_in_cache(
                    entity_id=f"{pi_id}_{charge['id']}", entity_name="ChargeByPaymentIntentId", entity=charge
                )

    def cache_invoices_by_subscription_id(self) -> None:
        """Cache invoices by subscription id"""
        logger.info("Caching invoices by subscription id")
        for key in self.redis.scan_iter(match="stripe_import_Invoice*"):
            invoice = self.get_resource_from_cache(key)
            if invoice and (sub_id := invoice.get("subscription")):
                self.put_in_cache(entity_id=f"{sub_id}_{invoice['id']}", entity_name="InvoiceBySubId", entity=invoice)

    def cache_refunds_by_charge_id(self) -> None:
        """Cache refunds by charge id"""
        logger.info("Caching refunds by charge id")
        for key in self.redis.scan_iter(match="stripe_import_Refund*"):
            refund = self.get_resource_from_cache(key)
            if refund and (charge_id := refund.get("charge")):
                self.put_in_cache(
                    entity_id=f"{charge_id}_{refund['id']}", entity_name="RefundByChargeId", entity=refund
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
        self.cache_invoices_by_subscription_id()
        self.cache_charges_by_payment_intent_id()

    def get_resource_from_cache(self, key: str) -> dict | None:
        logger.debug(
            "Attempting to retrieve value for key %s from redis cache",
            key,
        )
        cached = self.redis.get(key)
        return json.loads(cached) if cached else None

    @classmethod
    def get_data_from_plan(cls, plan: stripe.Plan | None) -> dict:
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
        results = []
        for key in self.redis.scan_iter(match=f"stripe_import__InvoiceBySubId*{subscription_id}*"):
            results.append(self.get_resource_from_cache(key))
        return results

    def get_charges_for_subscription(self, subscription_id: str) -> list[dict]:
        results = []
        invoices = self.get_invoices_for_subscription(subscription_id)
        for invoice in invoices:
            charge_id = invoice.get("charge", None)
            charge = (
                self.get_resource_from_cache(self.make_key(entity_id=charge_id, entity_name="Charge"))
                if charge_id
                else None
            )
            if charge:
                results.append(charge)
        return results

    def get_refunds_for_charge(self, charge_id: str) -> list[dict]:
        results = []
        for key in self.redis.scan_iter(match=f"stripe_import_RefundByChargeId*{charge_id}*"):
            results.append(self.get_resource_from_cache(key))
        return results

    def get_refunds_for_subscription(self, subscription_id: str) -> list[dict]:
        results = []
        charges = self.get_charges_for_subscription(subscription_id)
        for charge in charges:
            if charge_id := charge.get("id", None):
                results.extend(self.get_refunds_for_charge(charge_id))
        return results

    def get_or_create_contributor_from_customer(self, customer_id: str) -> Tuple[Contributor, str]:
        """Get or create a contributor from a stripe customer id"""
        customer = self.get_resource_from_cache(self.make_key(entity_id=customer_id, entity_name="Customer"))
        if not customer:
            raise InvalidStripeTransactionDataError(f"No customer found for id {customer_id}")
        return self.get_or_create_contributor(email=customer["email"])

    def get_payment_method_for_stripe_entity(
        self, stripe_entity: dict, customer_id: str, is_one_time: bool
    ) -> dict | None:
        """Get a payment method for a subscription or payment intent

        We prefer default payment method on sub/pi if present, but if not, we try getting from Stripe customer
        """
        logger.debug("Attempting to retrieve payment method for %s", stripe_entity["id"])
        customer = self.get_resource_from_cache(self.make_key(entity_id=customer_id, entity_name="Customer"))
        pm_id = (
            stripe_entity.get("payment_method", None)
            if is_one_time
            else stripe_entity.get("default_payment_method", None)
        )
        if not pm_id and customer.get("invoice_settings", None):
            pm_id = customer["invoice_settings"].get("default_payment_method", None)
        if pm_id:
            pm = stripe.PaymentMethod.retrieve(pm_id, stripe_account=self.stripe_account_id)
            return pm.to_dict() if pm else None
        return None

    @staticmethod
    def get_status_for_subscripton(subscription_status: str) -> ContributionStatus:
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
            # in practice, this would happen for incomplete and trialing
            case _:
                return ContributionStatus.PROCESSING

    def update_contribution_stats(self, action: str, contribution: Contribution | None) -> None:
        match action:
            case "created":
                self.created_contribution_ids.add(contribution.id)
            case "updated":
                self.updated_contribution_ids.add(contribution.id)
            case _:
                pass

    def update_contributor_stats(self, action: str, contributor: Contributor | None) -> None:
        match action:
            case "created":
                self.created_contributor_ids.add(contributor.id)
            case _:
                pass

    def update_payment_stats(self, action: str, payment: Payment | None) -> None:
        match action:
            case "created":
                self.created_payment_ids.add(payment.id)
            case "updated":
                self.updated_payment_ids.add(payment.id)
            case _:
                pass

    def get_charges_for_payment_intent(self, payment_intent_id: str) -> list[dict]:
        charges = []
        for key in self.redis.scan_iter(match=f"stripe_import_ChargeByPaymentIntentId*{payment_intent_id}*"):
            charge = self.get_resource_from_cache(key)
            charges.append(charge)
        return charges

    def get_successful_charge_for_payment_intent(self, payment_intent_id: str) -> dict | None:
        charges = self.get_charges_for_payment_intent(payment_intent_id)
        if len([x for x in charges if x["status"] == "succeeded"]) > 1:
            raise InvalidStripeTransactionDataError(
                f"Payment intent {payment_intent_id} has multiple successful charges associated with it"
            )
        return next((x for x in charges if x["status"] == "succeeded"), None)

    def get_refunds_for_payment_intent(self, payment_intent: dict) -> list[dict]:
        refunds = []
        for charge in self.get_charges_for_payment_intent(payment_intent["id"]):
            refunds.extend(self.get_refunds_for_charge(charge["id"]))
        return refunds

    def upsert_payments_for_contribution(self, contribution: Contribution) -> None:
        if contribution.interval == ContributionInterval.ONE_TIME:
            pi = self.get_resource_from_cache(
                self.make_key(entity_id=contribution.provider_payment_id, entity_name="PaymentIntent")
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
                self.make_key(entity_id=entity["balance_transaction"], entity_name="BalanceTransaction")
            )
            payment, action = upsert_payment_for_transaction(contribution, balance_transaction, is_refund)
            logger.info("Payment %s for contribution %s was %s", payment.id, contribution.id, action)
            self.update_payment_stats(action, payment)

    def get_provider_payment_id_for_subscription(self, subscription: dict) -> str | None:
        """Get provider payment id for a subscription"""
        provider_payment_id = None
        invoice_id = subscription.get("latest_invoice", None)
        if invoice_id:
            invoice = self.get_resource_from_cache(self.make_key(entity_id=invoice_id, entity_name="Invoice"))
            provider_payment_id = invoice.get("payment_intent", None)
        return provider_payment_id

    def get_default_contribution_data(
        self,
        stripe_entity: dict,
        is_one_time: bool,
        contributor: Contributor,
        customer_id: str,
        payment_method: dict | None,
    ) -> dict:
        """Get default contribution data for a given stripe entity"""
        shared = {
            "contributor": contributor,
            "contribution_metadata": stripe_entity["metadata"],
            "payment_provider_used": PaymentProvider.STRIPE_LABEL,
            "provider_customer_id": customer_id,
            "provider_payment_method_id": payment_method["id"] if payment_method else None,
            "provider_payment_method_details": payment_method if payment_method else None,
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
                | {"provider_payment_id": self.get_provider_payment_id_for_subscription(stripe_entity)}
            )

    def conditionally_update_contribution_donation_page(
        self, contribution: Contribution, donation_page: DonationPage | None
    ) -> Contribution:
        """If the contribution has no donation page, we'll update it with the donation page derived from payment metadata

        NB: This method assumes that validation has already occurred and that there is a valid donation page
        """
        if donation_page and not contribution.donation_page:
            logger.debug("Updating contribution %s with donation page %s", contribution.id, donation_page.id)
            contribution.donation_page = donation_page
            with reversion.create_revision():
                contribution.save(update_fields={"donation_page"})
                reversion.set_comment("Donation page was updated from Stripe metadata")
        return contribution

    def get_donation_page_from_metadata(self, metadata: dict) -> DonationPage | None:
        """Attempt to derive a donation page from stripe metadata.

        Note that this method assumes that referer has already been validated as present upstream, in which
        case it is guaranteed to have a revenue_program_id key (though it could possibly be empty string)
        """
        if not (rp_id := metadata["revenue_program_id"]):
            logger.warning("No revenue program id found in stripe metadata for %s %s", self.entity_name, self.entity_id)
            return None
        revenue_program = RevenueProgram.objects.filter(id=rp_id).first()
        if not revenue_program:
            logger.warning("No revenue program found for id %s", rp_id)
            return None
        slug = parse_slug_from_url(metadata["referer"])
        return (
            revenue_program.donationpage_set.filter(slug=slug).first()
            if slug
            else revenue_program.default_donation_page
        )

    @transaction.atomic
    def upsert_contribution(self, stripe_entity: dict, is_one_time: bool) -> Tuple[Contribution, str]:
        entity_name = "payment intent" if is_one_time else "subscription"
        logger.info("Upserting contribution for %s %s", entity_name, stripe_entity["id"])
        self.validate_metadata((metadata := stripe_entity.get("metadata", None)))
        self.validate_referer(metadata.get("referer", None))
        contributor, contributor_action = self.get_or_create_contributor_from_customer(
            (cust_id := stripe_entity["customer"])
        )
        pm = self.get_payment_method_for_stripe_entity(
            stripe_entity=stripe_entity, customer_id=cust_id, is_one_time=is_one_time
        )
        defaults = self.get_default_contribution_data(
            stripe_entity, is_one_time=is_one_time, contributor=contributor, customer_id=cust_id, payment_method=pm
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
            dont_update=["contribution_metadata"],
        )
        updated_contribution = self.conditionally_update_contribution_donation_page(
            contribution=contribution, donation_page=self.get_donation_page_from_metadata(metadata)
        )
        if not updated_contribution.donation_page:
            # NB: If we get to this point and the contribution still has no donation page, we don't want it to get created/upserted in db
            # because pageless contributions cause problems. Since this method is wrapped in @transaction.atomic, this will cause the entire
            # transaction to be rolled back
            raise InvalidStripeTransactionDataError(
                f"Could not create a contribution for {entity_name} {stripe_entity['id']} because cannot associate a donation page with it."
            )
        logger.info("Upserting payments for %s %s", entity_name, stripe_entity["id"])
        self.upsert_payments_for_contribution(updated_contribution)
        self.update_contribution_stats(contribution_action, updated_contribution)
        self.update_contributor_stats(contributor_action, contributor)
        return updated_contribution, contribution_action

    def process_transactions_for_recurring_contributions(self) -> None:
        logger.info("Processing transactions for recurring contributions")
        for key in self.redis.scan_iter(match=f"stripe_import_Subscription_*{self.stripe_account_id}*"):
            subscription = self.get_resource_from_cache(key)
            try:
                contribution, action = self.upsert_contribution(stripe_entity=subscription, is_one_time=False)
            except (InvalidStripeTransactionDataError, InvalidMetadataError, InvalidIntervalError) as exc:
                logger.info("Unable to upsert subscription %s", subscription["id"], exc_info=exc)
                continue
            logger.info(
                "Processed subscription %s. Contribution %s was %s", subscription["id"], contribution.id, action
            )
            self.subscriptions_processed += 1

    def is_for_one_time_contribution(self, charge: dict) -> bool:
        """Check if a charge is for a one-time contribution"""
        is_for_one_time = True
        invoice = charge.get("invoice", None)
        if invoice:
            invoice = self.get_resource_from_cache(self.make_key(entity_id=invoice, entity_name="Invoice"))
            if invoice.get("subscription", None):
                is_for_one_time = False
        return is_for_one_time

    def process_transactions_for_one_time_contributions(self) -> None:
        """Process transactions for one-time contributions.

        Note that the starting point here is the set of cached payment intents. Because we filter out payment intents
        without referer and schema_version, we know ahead of time that all of the PIs we're looking at are for one-time contributions.
        """
        logger.info("Processing transactions for one-time contributions")
        for key in self.redis.scan_iter(match="stripe_import_PaymentIntent_*"):
            pi = self.get_resource_from_cache(key)
            try:
                contribution, action = self.upsert_contribution(stripe_entity=pi, is_one_time=True)
            except (InvalidStripeTransactionDataError, InvalidMetadataError) as exc:
                logger.info("Unable to upsert a contribution for %s", pi["id"], exc_info=exc)
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

    def import_contributions_and_payments(self) -> None:
        """This method is responsible for upserting contributors, contributions, and payments for a given stripe account."""
        started = datetime.datetime.now()
        self.list_and_cache_required_stripe_resources()
        self.process_transactions_for_recurring_contributions()
        self.process_transactions_for_one_time_contributions()
        self.log_results()
        self.clear_cache()
        logger.info(
            "Stripe import for account %s took %s",
            self.stripe_account_id,
            self.format_timedelta(datetime.datetime.now() - started),
        )

    def log_results(self) -> None:
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

    def clear_cache(self) -> None:
        """Clear the cache"""
        logger.info("Clearing redis cache of entries related to stripe import for account %s", self.stripe_account_id)
        cursor = "0"
        while cursor != 0:
            cursor, keys = self.redis.scan(cursor=cursor, match=f"stripe_import*{self.stripe_account_id}", count=100)
            self.redis.delete(*keys)


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
