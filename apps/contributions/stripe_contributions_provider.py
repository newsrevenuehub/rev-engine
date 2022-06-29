import json
import logging
from datetime import datetime

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


class ChargeDetails:
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


def chunk_list(data, size):
    for i in range(0, len(data), size):
        yield data[i : i + size]


def prepare_customers_query(customers):
    for customers_chunk in chunk_list(customers, MAX_STRIPE_CUSTOMERS_LIMIT):
        yield " OR ".join([f"customer:'{customer_id}'" for customer_id in customers_chunk])


def fetch_stripe_customers(email_id):
    results = stripe.Customer.search(query=f"email:'{email_id}'", limit=MAX_STRIPE_RESPONSE_LIMIT)

    return [customer.id for customer in results.auto_paging_iter()]


def fetch_stripe_charges(query=None, page=None):
    kwargs = {
        "query": query,
        "expand": ["data.invoice", "data.payment_method_details"],
        "limit": MAX_STRIPE_RESPONSE_LIMIT,
    }

    if page:
        kwargs["page"] = page

    return stripe.Charge.search(**kwargs)


def serialize_stripe_charges(charges):
    data = {}
    for charge in charges:
        try:
            serializer = PaymentProviderContributionSerializer(instance=StripeCharge(charge))
            data[charge.id] = serializer.data
        except ContributionIgnorableError as ex:
            logger.info(ex)
    return data


def save_stripe_charges_to_cache(email_id, charges):
    serialized_charges = serialize_stripe_charges(charges)
    caches[CONTRIBUTION_CACHE_DB].set(email_id, json.dumps(serialized_charges), timeout=CONTRIBUTION_CACHE_TTL.seconds)


def append_stripe_charges_to_cache(email_id, charges):
    serialized_charges = serialize_stripe_charges(charges)
    cached_data = caches[CONTRIBUTION_CACHE_DB].get(email_id)
    if cached_data:
        serialized_charges.update(json.loads(cached_data))
    caches[CONTRIBUTION_CACHE_DB].set(email_id, json.dumps(serialized_charges), timeout=CONTRIBUTION_CACHE_TTL.seconds)


def load_stripe_data_from_cache(email_id):
    data = caches[CONTRIBUTION_CACHE_DB].get(email_id)
    if not data:
        return []
    return [ChargeDetails(**x) for x in json.loads(data).values()]
