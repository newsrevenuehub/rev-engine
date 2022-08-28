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


class AttrDict(dict):
    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        for key, val in kwargs.items():
            setattr(self, key, val)


class StripeCharge:
    """
    Wrapper on stripe charge object to extract the required details in
    apps.contributions.serializers.PaymentProviderContributionSerializer and serializable.

    If there's no Invoice associated with a Charge object then it's a one-time payment.
    """

    def __init__(self, charge):
        self.charge = charge

    @property
    def invoice_line_item(self):
        if not self.charge.invoice:
            return [{}]
        line_item = self.charge.invoice.lines.data
        if not line_item:
            line_item = [{}]
        return line_item[0]

    @property
    def is_cancelable(self):
        if not self.charge.invoice:  # one-time payment
            return False
        if self.charge.invoice.subscription.status in ["incomplete", "incomplete_expired", "canceled", "unpaid"]:
            return False
        # statuses "trialing", "active", and "past_due" are cancelable
        return True

    @property
    def is_modifiable(self):
        if not self.charge.invoice:  # one-time payment
            return False
        if self.charge.invoice.subscription.status in ["incomplete_expired", "canceled", "unpaid"]:
            return False
        # statuses "incomplete", "trialing", "active", and "past_due" are modifiable
        return True

    @property
    def interval(self):
        if not self.charge.invoice:
            # if there's no invoice then it's a one-time payment
            return ContributionInterval.ONE_TIME
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
    def subscription_id(self):
        if not self.charge.invoice:  # this isn't a subscription
            return None
        return self.charge.invoice.subscription.id

    @property
    def card(self):
        return getattr(self.charge.payment_method, "card", None) or AttrDict(
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
        if not self.charge.invoice:
            return datetime.utcfromtimestamp(int(self.charge.created))
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
        # TODO: [DEV-2192] this isn't the next payment date; fix this
        if not self.charge.invoice:
            return None
        next_attempt = self.charge.invoice.next_payment_attempt
        if next_attempt:
            return datetime.utcfromtimestamp(int(next_attempt))
        return None

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


class StripeSubscription:
    """
    Wrapper on stripe Subscription object to extract the required details in
    """

    def __init__(self, subscription):
        self.subscription = subscription
        self.id = subscription.id

    @property
    def is_cancelable(self):
        if self.subscription.status in ["incomplete", "incomplete_expired", "canceled", "unpaid"]:
            return False
        # statuses "trialing", "active", and "past_due" are cancelable
        return True

    @property
    def is_modifiable(self):
        if self.subscription.status in ["incomplete_expired", "canceled", "unpaid"]:
            return False
        # statuses "incomplete", "trialing", "active", and "past_due" are modifiable
        return True

    @property
    def interval(self):
        interval = self.subscription.plan.get("interval")
        interval_count = self.subscription.plan.get("interval_count")
        if interval == "year" and interval_count == 1:
            return ContributionInterval.YEARLY
        if interval == "month" and interval_count == 1:
            return ContributionInterval.MONTHLY
        raise InvalidIntervalError(f"Invalid interval {interval} for subscription : {self.subscription.id}")

    @property
    def revenue_program(self):
        metadata = self.subscription.get("metadata") or {}
        if not metadata or "revenue_program_slug" not in metadata:
            raise InvalidMetadataError(f"Metadata is invalid for subscription : {self.subscription.id}")
        return metadata["revenue_program_slug"]

    @property
    def card(self):
        return getattr(self.subscription.default_payment_method, "card", None) or AttrDict(
            **{"brand": None, "last4": None, "exp_month": None}
        )

    @property
    def card_brand(self):
        return self.card.brand

    @property
    def last4(self):
        return self.card.last4

    @property
    def credit_card_expiration_date(self):
        return f"{self.card.exp_month}/{self.card.exp_year}" if self.card.exp_month else None

    @property
    def amount(self):
        return self.subscription.plan.amount

    @property
    def created(self):
        return datetime.utcfromtimestamp(int(self.subscription.created))

    @property
    def provider_customer_id(self):
        return self.subscription.customer

    @property
    def last_payment_date(self):
        return datetime.utcfromtimestamp(int(self.subscription.current_period_start))

    @property
    def next_payment_date(self):
        return datetime.utcfromtimestamp(int(self.subscription.current_period_end))

    @property
    def status(self):
        return self.subscription.status

    @property
    def payment_type(self):
        return self.subscription.payment_method.type


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
            "expand": ["data.invoice.subscription", "data.payment_method"],
            "limit": MAX_STRIPE_RESPONSE_LIMIT,
            "stripe_account": self.stripe_account_id,
        }

        if page:
            kwargs["page"] = page

        # TODO: [DEV-2193] this should probably be refactored to fetch PaymentIntents instead of Charges and expand `invoice.subscription`

        return stripe.PaymentIntent.search(**kwargs)


class PaymentIntentsCacheProvider:
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


class SubscriptionsCacheProvider:
    def __init__(self, email_id, account_id=None, serializer=None, converter=None) -> None:
        self.cache = caches[DEFAULT_CACHE]
        self.serializer = serializer
        self.converter = converter

        self.key = f"{email_id}-subscriptions"
        if account_id:
            self.key = f"{self.key}-{account_id}"

    def serialize(self, subscriptions):
        """Serializes the stripe.Subscription object into json."""
        data = {}
        for subscription in subscriptions:
            try:
                serialized_obj = self.serializer(instance=self.converter(subscription))
                data[subscription.id] = serialized_obj.data
            except ContributionIgnorableError as ex:
                logger.warning("Unable to process Subscription [%s] due to [%s]", subscription.id, type(ex))
        return data

    def upsert(self, subscriptions):
        """Serialized and Upserts subscriptions data to cache."""
        data = self.serialize(subscriptions)
        cached_data = json.loads(self.cache.get(self.key) or "{}")
        cached_data.update(data)

        with self.cache.lock(f"{self.key}-lock"):
            logger.info("Inserting %s subscriptions into cache with key %s", len(data), self.key)
            self.cache.set(self.key, json.dumps(cached_data), timeout=CONTRIBUTION_CACHE_TTL.seconds)

    def load(self):
        """Gets the subscription data from cache for a specefic email and stripe account id combo."""
        data = self.cache.get(self.key)
        if not data:
            return []
        logger.info("Retrieved %s contributions from cache with key %s", len(data), self.key)
        return [AttrDict(**x) for x in json.loads(data).values()]
