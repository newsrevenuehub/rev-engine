import json
import logging
from datetime import datetime

from django.conf import settings
from django.core.cache import caches

import stripe

from apps.contributions.serializers import PaymentProviderContributionSerializer


RESPONSE_LIMIT = 100
TTL = 60 * 60 * 4

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class StripeIgnorableEventException(Exception):
    pass


class InvalidIntervalException(StripeIgnorableEventException):
    pass


class InvalidMetadataException(StripeIgnorableEventException):
    pass


class NoInvoiceGeneratedException(StripeIgnorableEventException):
    pass


class ChargeDetails:
    def __init__(self, **kwargs) -> None:
        for key, val in kwargs.items():
            setattr(self, key, val)


class StripeCharge:
    def __init__(self, charge):
        if not charge.invoice:
            raise NoInvoiceGeneratedException(f"No invoice object for charge : {charge.id}")
        self.charge = charge

    @property
    def interval(self):
        interval = self.charge.invoice.lines.data[0].plan.interval
        interval_count = self.charge.invoice.lines.data[0].plan.interval_count
        if interval == "year" and interval_count == 1:
            return "yearly"
        if interval == "month" and interval_count == 1:
            return "monthly"
        raise InvalidIntervalException(f"Interval is invalid for charge : {self.id}")

    @property
    def revenue_program(self):
        metadata = self.charge.metadata or self.charge.invoice.lines.data[0].metadata or {}
        if not metadata or "revenue_program_slug" not in metadata:
            raise InvalidMetadataException(f"Metadata is invalid for charge : {self.id}")
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
        return self.charge.status

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


class StripePaymentDetailsProvider:
    def __init__(self, stripe_account_id, email_id):
        self.stripe_account_id = stripe_account_id
        self.email_id = email_id
        results = stripe.Customer.search(query=f"email:'{self.email_id}'", limit=RESPONSE_LIMIT)
        self.customers = [customer.id for customer in results.auto_paging_iter()]

    def get_charges(self):
        limit = 10
        for i in range(0, len(self.customers), limit):
            customers_query = " OR ".join(
                [f"customer:'{customer_id}'" for customer_id in self.customers[i : i + limit]]
            )

            charge_response = stripe.Charge.search(
                query=customers_query,
                expand=["data.invoice", "data.payment_method_details"],
                limit=RESPONSE_LIMIT,
                # stripe_account=self.stripe_account_id,
            )
            for charge in charge_response.auto_paging_iter():
                yield charge


def put_in_cache(key, data):
    caches["default"].set(key, json.dumps(data), timeout=TTL)


def pull_stripe_data_to_cache(stripe_account_id, email_id):
    stripe_provider = StripePaymentDetailsProvider(stripe_account_id, email_id)
    data = {}
    for charge in stripe_provider.get_charges():
        try:
            serializer = PaymentProviderContributionSerializer(instance=StripeCharge(charge))
            data[f"{email_id}::{charge.id}"] = serializer.data
        except StripeIgnorableEventException as ex:
            logger.info(ex)

    put_in_cache(email_id, data)


def load_stripe_data_from_cache(email_id):
    data = json.loads(caches["default"].get(email_id))
    return [ChargeDetails(**x) for x in data.values()]
