import json
import logging
from datetime import datetime
from functools import cached_property

from django.conf import settings
from django.core.cache import caches

import stripe

from apps.contributions.models import ContributionInterval, ContributionStatus
from apps.contributions.serializers import PaymentProviderContributionSerializer
from revengine.settings.base import CONTRIBUTION_CACHE_DB, CONTRIBUTION_CACHE_TTL


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


class AttrDict:
    def __init__(self, **kwargs) -> None:
        for key, val in kwargs.items():
            setattr(self, key, val)


class StripeCharge:
    """
    Wrapper on stripe charge object to extract the required details in
    apps.contributions.serializers.PaymentProviderContributionSerializer and serializable.
    """

    def __init__(self, charge):
        if not charge.invoice:
            raise NoInvoiceGeneratedError(f"No invoice object for charge : {charge.id}")
        self.charge = charge

    @property
    def interval(self):
        interval = self.charge.invoice.lines.data[0].plan.interval
        interval_count = self.charge.invoice.lines.data[0].plan.interval_count
        if interval == "year" and interval_count == 1:
            return ContributionInterval.YEARLY
        if interval == "month" and interval_count == 1:
            return ContributionInterval.MONTHLY
        raise InvalidIntervalError(f"Invalid interval {interval} for charge : {self.charge.id}")

    @property
    def revenue_program(self):
        metadata = self.charge.metadata or self.charge.invoice.lines.data[0].metadata or {}
        if not metadata or "revenue_program_slug" not in metadata:
            raise InvalidMetadataError(f"Metadata is invalid for charge : {self.id}")
        return metadata["revenue_program_slug"]

    @property
    def card_brand(self):
        card = self.charge.payment_method_details.card
        if card:
            return card.brand

    @property
    def last4(self):
        card = self.charge.payment_method_details.card
        if card:
            return card.last4

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
        if self.charge.status == "succeeded":
            return ContributionStatus.PAID
        if self.charge.status == "pending":
            return ContributionStatus.PROCESSING
        if self.refunded:
            return ContributionStatus.REFUNDED
        return ContributionStatus.FAILED

    @property
    def credit_card_expiration_date(self):
        card = self.charge.payment_method_details.card
        if card:
            return f"{card.exp_month}/{card.exp_year}"

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
        return self.charge.refunded or self.charge.amount_refunded > 0

    @property
    def id(self):
        return self.charge.id


class StripeContributionsProvider:
    def __init__(self, email_id, stripe_account_id) -> None:
        self.email_id = email_id
        self.stripe_account_id = stripe_account_id

    @cached_property
    def customers(self):
        customers_responswe = stripe.Customer.search(
            query=f"email:'{self.email_id}'",
            limit=MAX_STRIPE_RESPONSE_LIMIT,
            stripe_account=self.stripe_account_id,
        )
        return [customer.id for customer in customers_responswe.auto_paging_iter()]

    @staticmethod
    def chunk_list(data, size):
        for i in range(0, len(data), size):
            yield data[i : i + size]

    def generate_chunked_customers_query(self):
        for customers_chunk in self.chunk_list(self.customers, MAX_STRIPE_CUSTOMERS_LIMIT):
            yield " OR ".join([f"customer:'{customer_id}'" for customer_id in customers_chunk])

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
        self.cache = caches[CONTRIBUTION_CACHE_DB]
        self.serializer = serializer
        self.converter = converter

        self.key = f"{email_id}"
        if account_id:
            self.key = f"{self.key}-{account_id}"

    def serialize(self, contributions):
        data = {}
        for contribution in contributions:
            try:
                serialized_obj = PaymentProviderContributionSerializer(instance=StripeCharge(contribution))
                data[contribution.id] = serialized_obj.data
            except ContributionIgnorableError as ex:
                logger.exception("This can be ignored")
        return data

    def upsert(self, contributions):
        data = self.serialize(contributions)
        cached_data = self.cache.get(self.key)

        if cached_data:
            cached_data = json.loads(cached_data)
            data.update(cached_data)

        with self.cache.lock(f"{self.key}-lock"):
            self.cache.set(self.key, json.dumps(data), timeout=CONTRIBUTION_CACHE_TTL.seconds)

    def load(self):
        data = self.cache.get(self.key)
        if not data:
            return []
        return [AttrDict(**x) for x in json.loads(data).values()]
