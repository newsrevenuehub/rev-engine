import datetime
import json
import logging
from functools import cached_property

from django.conf import settings
from django.core.cache import caches
from django.core.serializers.json import DjangoJSONEncoder

import stripe
from addict import Dict as AttrDict
from rest_framework import exceptions

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


class StripePaymentIntent:
    """
    Wrapper on stripe payment_intent object to extract the required details in
    apps.contributions.serializers.PaymentProviderContributionSerializer and serializable.

    If there's no Invoice associated with a Payment Intent then it's a one-time payment.
    """

    def __init__(self, payment_intent):
        self.payment_intent = payment_intent

    @property
    def invoice_line_item(self):
        if not self.payment_intent.invoice:
            return [{}]
        line_item = self.payment_intent.invoice.lines.data
        if not line_item:
            line_item = [{}]
        return line_item[0]

    @property
    def is_cancelable(self):
        if not self.payment_intent.invoice:  # one-time payment
            return False
        if self.payment_intent.invoice.subscription.status in [
            "incomplete",
            "incomplete_expired",
            "canceled",
            "unpaid",
        ]:
            return False
        # statuses "trialing", "active", and "past_due" are cancelable
        return True

    @property
    def is_modifiable(self):
        if not self.payment_intent.invoice:  # one-time payment
            return False
        if self.payment_intent.invoice.subscription.status in ["incomplete_expired", "canceled", "unpaid"]:
            return False
        # statuses "incomplete", "trialing", "active", and "past_due" are modifiable
        return True

    @property
    def interval(self):
        if not self.payment_intent.invoice:
            # if there's no invoice then it's a one-time payment
            return ContributionInterval.ONE_TIME
        interval = self.invoice_line_item.get("plan", {}).get("interval")
        interval_count = self.invoice_line_item.get("plan", {}).get("interval_count")
        if interval == "year" and interval_count == 1:
            return ContributionInterval.YEARLY
        if interval == "month" and interval_count == 1:
            return ContributionInterval.MONTHLY
        raise InvalidIntervalError(f"Invalid interval {interval} for payment_intent : {self.payment_intent.id}")

    @property
    def revenue_program(self):
        metadata = self.payment_intent.get("metadata") or self.invoice_line_item.get("metadata") or {}
        if not metadata or "revenue_program_slug" not in metadata:
            raise InvalidMetadataError(f"Metadata is invalid for payment_intent : {self.id}")
        return metadata["revenue_program_slug"]

    @property
    def subscription_id(self):
        if not self.payment_intent.invoice:  # this isn't a subscription
            return None
        return self.payment_intent.invoice.subscription.id

    @property
    def card(self):
        return getattr(self.payment_intent.payment_method, "card", None) or AttrDict(
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
        return self.payment_intent.amount

    @property
    def created(self):
        return datetime.datetime.fromtimestamp(int(self.payment_intent.created), tz=datetime.timezone.utc)

    @property
    def provider_customer_id(self):
        return self.payment_intent.customer

    @property
    def last_payment_date(self):
        if not self.payment_intent.invoice:
            return datetime.datetime.fromtimestamp(int(self.payment_intent.created), tz=datetime.timezone.utc)
        return datetime.datetime.fromtimestamp(
            int(self.payment_intent.invoice.status_transitions.paid_at), tz=datetime.timezone.utc
        )

    @property
    def status(self):
        if self.refunded:
            return ContributionStatus.REFUNDED
        if self.payment_intent.status == "succeeded":
            return ContributionStatus.PAID
        if self.payment_intent.status == "pending":
            return ContributionStatus.PROCESSING
        return ContributionStatus.FAILED

    @property
    def credit_card_expiration_date(self):
        return f"{self.card.exp_month}/{self.card.exp_year}" if self.card.exp_month else None

    @property
    def payment_type(self):
        return self.payment_intent.payment_method.type

    @property
    def refunded(self):
        """For a contribution to consider it as refunded either refunded flag will be set for full refunds
        or acount_refunded will be > 0 (will be useful in case of partial refund and we still want to set
        the status as refunded)
        https://stripe.com/docs/api/charges/object#charge_object-refunded
        https://stripe.com/docs/api/charges/object#charge_object-amount_refunded
        """
        return self.payment_intent.get("refunded", False) or self.payment_intent.get("amount_refunded", 0) > 0

    @property
    def id(self):
        return self.payment_intent.id


class StripeContributionsProvider:
    def __init__(self, email_id, stripe_account_id) -> None:
        logger.info(
            "Initializing StripeContributionsProvider for email_id %s and stripe_account_id %s",
            email_id,
            stripe_account_id,
        )
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
        logger.info(
            "Fetching customers for email_id %s and stripe_account_id %s", self.email_id, self.stripe_account_id
        )
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
        logger.info("Generating chunked customers query for %s customers", len(self.customers))
        for i in range(0, len(self.customers), MAX_STRIPE_CUSTOMERS_LIMIT):
            chunk = self.customers[i : i + MAX_STRIPE_CUSTOMERS_LIMIT]
            yield " OR ".join([f"customer:'{customer_id}'" for customer_id in chunk])

    def fetch_payment_intents(self, query=None, page=None):
        logger.info("Fetching payment intents for query %s and page %s", query, page)
        kwargs = {
            "query": query,
            "expand": ["data.invoice.subscription.default_payment_method", "data.payment_method"],
            "limit": MAX_STRIPE_RESPONSE_LIMIT,
            "stripe_account": self.stripe_account_id,
        }

        if page:
            kwargs["page"] = page

        # TODO: [DEV-2193] this should probably be refactored to fetch PaymentIntents instead of Charges and expand `invoice.subscription`
        return stripe.PaymentIntent.search(**kwargs)


class ContributionsCacheProvider:
    def __init__(self, email_id, stripe_account_id, serializer=None, converter=None) -> None:
        logger.info(
            "Initializing ContributionsCacheProvider for email_id %s and stripe_account_id %s",
            email_id,
            stripe_account_id,
        )
        self.cache = caches[DEFAULT_CACHE]
        self.serializer = serializer
        self.converter = converter
        self.stripe_account_id = stripe_account_id

        self.key = f"{email_id}-payment-intents-{self.stripe_account_id}"

    def serialize(self, contributions):
        """Serializes the stripe.PaymentIntent object into json."""
        logger.info("Serializing %s contributions for key %s", len(contributions), self.key)
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
        logger.info("Upserting %s contributions for key %s", len(contributions), self.key)
        data = self.serialize(contributions)
        # Since the Stripe objects themselves don't have a field indicating the account they came from (when they come
        # from a Connect webhook they do have this field) they get added here:
        for v in data.values():
            v["stripe_account_id"] = self.stripe_account_id

        cached_data = json.loads(self.cache.get(self.key) or "{}")
        cached_data.update(data)

        with self.cache.lock(f"{self.key}-lock"):
            logger.info("Inserting %s contributions into cache with key %s", len(data), self.key)
            self.cache.set(self.key, json.dumps(cached_data), timeout=CONTRIBUTION_CACHE_TTL.seconds)

    def load(self):
        logger.info("Loading contributions from cache with key %s", self.key)
        data = self.cache.get(self.key)
        if not data:
            return []
        data = [AttrDict(**x) for x in json.loads(data).values()]
        logger.debug("Data to be returned %s", data)
        logger.info("Retrieved %s contributions from cache with key %s", len(data), self.key)
        return data


class SubscriptionsCacheProvider:
    # TODO: [DEV-2449] reduce duplication with ContributionsCacheProvider
    def __init__(self, email_id, stripe_account_id, serializer=None) -> None:
        logger.info(
            "Initializing SubscriptionsCacheProvider for email_id %s, stripe_account_id %s", email_id, stripe_account_id
        )
        self.cache = caches[DEFAULT_CACHE]
        self.serializer = serializer
        self.stripe_account_id = stripe_account_id

        self.key = f"{email_id}-subscriptions-{self.stripe_account_id}"

    def serialize(self, subscriptions):
        """Serializes the stripe.Subscription object into json."""
        logger.info("Serializing %s subscriptions for key %s", len(subscriptions), self.key)
        data = {}
        for subscription in subscriptions:
            try:
                serialized_obj = self.serializer(instance=subscription)
                data[subscription.id] = serialized_obj.data
            except exceptions.ValidationError as ex:
                logger.warning("Unable to process Subscription [%s] due to [%s]", subscription.id, type(ex))
        return data

    def upsert(self, subscriptions):
        """Serialized and Upserts subscriptions data to cache."""
        logger.info("Upserting %s subscriptions for key %s", len(subscriptions), self.key)
        data = self.serialize(subscriptions)
        # Since the Stripe objects themselves don't have a field indicating the Stripe Account they came
        # from (when they come from a Connect webhook they do have this field)
        for k in data:
            data[k]["stripe_account_id"] = self.stripe_account_id
        cached_data = json.loads(self.cache.get(self.key) or "{}")
        cached_data.update(data)

        logger.info("Inserting %s subscriptions into cache with key %s", len(data), self.key)
        self.cache.set(self.key, json.dumps(cached_data, cls=DjangoJSONEncoder), timeout=CONTRIBUTION_CACHE_TTL.seconds)

    def load(self):
        """Gets the subscription data from cache for a specefic email and stripe account id combo."""
        logger.info("Loading subscriptions from cache with key %s", self.key)
        data = self.cache.get(self.key)
        if not data:
            return []
        data = [AttrDict(**x) for x in json.loads(data).values()]
        logger.info("Retrieved %s contributions from cache with key %s", len(data), self.key)
        return data
