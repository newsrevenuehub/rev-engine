import json
import logging
from datetime import datetime
from functools import cached_property

from django.conf import settings
from django.core.cache import caches

import stripe

from apps.contributions.models import ContributionInterval, ContributionStatus
from revengine.settings.base import CONTRIBUTION_CACHE_TTL, DEFAULT_CACHE


MAX_STRIPE_RESPONSE_LIMIT = 100
MAX_STRIPE_CUSTOMERS_LIMIT = 10

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class ContributionIgnorableError(Exception):
    """
    Base contribution exception where the type of exception should be ignored.
    """

    pass


class InvalidIntervalError(ContributionIgnorableError):
    pass


class InvalidMetadataError(ContributionIgnorableError):
    pass


class NoInvoiceGeneratedError(ContributionIgnorableError):
    pass


class AttrDict(dict):
    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        for key, val in kwargs.items():
            setattr(self, key, val)


class StripeCharge:
    """
    Wrapper on stripe charge object to extract the required details in
    apps.contributions.serializers.PaymentProviderContributionSerializer and serializable.
    """

    def __init__(self, charge):
        if not hasattr(charge, "invoice") or not charge.invoice:
            raise NoInvoiceGeneratedError(f"No invoice object for charge : {charge.id}")
        self.charge = charge

    @property
    def invoice_line_item(self):
        line_item = self.charge.invoice.lines.data
        if not line_item:
            line_item = [{}]
        return line_item[0]

    @property
    def interval(self):
        interval = self.invoice_line_item.get("plan", {}).get("interval")
        interval_count = self.invoice_line_item.get("plan", {}).get("interval_count")
        if interval == "year" and interval_count == 1:
            return ContributionInterval.YEARLY
        if interval == "month" and interval_count == 1:
            return ContributionInterval.MONTHLY
        raise InvalidIntervalError(f"Invalid interval {interval} for charge : {self.charge.id}")

    @property
    def revenue_program(self):
        metadata = self.charge.get("metadata") or self.invoice_line_item.get("metadata") or {}
        if not metadata or "revenue_program_slug" not in metadata:
            raise InvalidMetadataError(f"Metadata is invalid for charge : {self.id}")
        return metadata["revenue_program_slug"]

    @property
    def card(self):
        return getattr(self.charge.payment_method_details, "card", None) or AttrDict(
            **{"brand": None, "last4": None, "exp_month": None}
        )

    @property
    def card_brand(self):
        return self.card.brand

    @property
    def last4(self):
        return self.card.last4

    @property
    def amount(self):
        return self.charge.amount

    @property
    def created(self):
        return datetime.utcfromtimestamp(int(self.charge.created))

    @property
    def provider_customer_id(self):
        return self.charge.customer

    @property
    def last_payment_date(self):
        return datetime.utcfromtimestamp(int(self.charge.invoice.status_transitions.paid_at))

    @property
    def status(self):
        if self.refunded:
            return ContributionStatus.REFUNDED
        if self.charge.status == "succeeded":
            return ContributionStatus.PAID
        if self.charge.status == "pending":
            return ContributionStatus.PROCESSING
        return ContributionStatus.FAILED

    @property
    def credit_card_expiration_date(self):
        return f"{self.card.exp_month}/{self.card.exp_year}" if self.card.exp_month else None

    @property
    def payment_type(self):
        return self.charge.payment_method_details.type

    @property
    def next_payment_date(self):
        next_attempt = self.charge.invoice.next_payment_attempt
        if next_attempt:
            return datetime.utcfromtimestamp(int(next_attempt))

    @property
    def refunded(self):
        """For a contribution to consider it as refunded either refunded flag will be set for full refunds
        or acount_refunded will be > 0 (will be useful in case of partial refund and we still want to set
        the status as refunded)
        https://stripe.com/docs/api/charges/object#charge_object-refunded
        https://stripe.com/docs/api/charges/object#charge_object-amount_refunded
        """
        return self.charge.get("refunded", False) or self.charge.get("amount_refunded", 0) > 0

    @property
    def id(self):
        return self.charge.id


class StripeContributionsProvider:
    def __init__(self, email_id, stripe_account_id) -> None:
        self.email_id = email_id
        self.stripe_account_id = stripe_account_id

    @cached_property
    def customers(self):
        """
        Cached Property.
        Gets all the customers associated with an email for a given stripe account

        Returns:
        --------
        List: List of customer ids starting with cus_.
        """
        customers_response = stripe.Customer.search(
            query=f"email:'{self.email_id}'",
            limit=MAX_STRIPE_RESPONSE_LIMIT,
            stripe_account=self.stripe_account_id,
        )
        return [customer.id for customer in customers_response.auto_paging_iter()]

    def generate_chunked_customers_query(self):
        """
        Generates customer query in specified format in accordance with Stripe search API.
        Maximum number of customers can be provided is 10.
        https://stripe.com/docs/search.
        """
        for i in range(0, len(self.customers), MAX_STRIPE_CUSTOMERS_LIMIT):
            chunk = self.customers[i : i + MAX_STRIPE_CUSTOMERS_LIMIT]
            yield " OR ".join([f"customer:'{customer_id}'" for customer_id in chunk])

    def fetch_charges(self, query=None, page=None):
        kwargs = {
            "query": query,
            "expand": ["data.invoice", "data.payment_method_details"],
            "limit": MAX_STRIPE_RESPONSE_LIMIT,
            "stripe_account": self.stripe_account_id,
        }

        if page:
            kwargs["page"] = page

        return stripe.Charge.search(**kwargs)


class ContributionsCacheProvider:
    def __init__(self, email_id, account_id=None, serializer=None, converter=None) -> None:
        self.cache = caches[DEFAULT_CACHE]
        self.serializer = serializer
        self.converter = converter

        self.key = f"{email_id}"
        if account_id:
            self.key = f"{self.key}-{account_id}"

    def serialize(self, contributions):
        """Serializes the stripe.Charge object into json."""
        data = {}
        for contribution in contributions:
            try:
                serialized_obj = self.serializer(instance=self.converter(contribution))
                data[contribution.id] = serialized_obj.data
            except ContributionIgnorableError as ex:
                logger.warning("Unable to process Contribution [%s] due to [%s]", contribution.id, type(ex))
        return data

    def upsert(self, contributions):
        """Serialized and Upserts contributions data to cache."""
        data = self.serialize(contributions)
        cached_data = json.loads(self.cache.get(self.key) or "{}")
        cached_data.update(data)

        with self.cache.lock(f"{self.key}-lock"):
            logger.info("Inserting %s contributions into cache with key %s", len(data), self.key)
            self.cache.set(self.key, json.dumps(cached_data), timeout=CONTRIBUTION_CACHE_TTL.seconds)

    def load(self):
        """Gets the contributions data from cache for a specefic email and stripe account id combo."""
        data = self.cache.get(self.key)
        if not data:
            return []
        logger.info("Retrieved %s contributions from cache with key %s", len(data), self.key)
        return [AttrDict(**x) for x in json.loads(data).values()]
