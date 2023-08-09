from dataclasses import dataclass
import datetime
import json
import logging
from functools import cached_property
from typing import Generator, Literal, Optional, TypedDict

from addict import Dict as AttrDict
from django.conf import settings
from django.core.cache import caches
from django.core.serializers.json import DjangoJSONEncoder

from pydantic import BaseModel
import stripe
from rest_framework import exceptions

from revengine.settings.base import CONTRIBUTION_CACHE_TTL, DEFAULT_CACHE
from apps.contributions.serializers import (
    PaymentProviderContributionSerializer,
    SubscriptionsSerializer,
)

from apps.contributions.choices import ContributionInterval, ContributionStatus
from apps.contributions.exceptions import ContributionIgnorableError, InvalidIntervalError, InvalidMetadataError


MAX_STRIPE_RESPONSE_LIMIT = 100
MAX_STRIPE_CUSTOMERS_LIMIT = 10

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@dataclass
class StripePiAsPortalContribution:
    """
    This class is responsible for converting a Stripe PaymentIntent object into an object conforming to the schema expected
    by the portal's contributions tables in the SPA.

    Note that this class is not responsible for serializing the object into JSON. The expected caller for this class is
    `StripePaymentIntentsCacheProvider`. This class is responsible for converting the Stripe PaymentIntent object into
    that can be consumed when serialized in the cache provider.
    """

    payment_intent: stripe.PaymentIntent

    @property
    def invoice_line_item(self) -> list[stripe.InvoiceLineItem | dict]:
        if not self.payment_intent.invoice:
            return [{}]
        line_item = self.payment_intent.invoice.lines.data
        if not line_item:
            line_item = [{}]
        return line_item[0]

    @property
    def is_cancelable(self) -> bool:
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
    def is_modifiable(self) -> bool:
        if not self.payment_intent.invoice:  # one-time payment
            return False
        if self.payment_intent.invoice.subscription.status in ["incomplete_expired", "canceled", "unpaid"]:
            return False
        # statuses "incomplete", "trialing", "active", and "past_due" are modifiable
        return True

    @property
    def interval(self) -> ContributionInterval:
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
    def revenue_program(self) -> str:
        metadata = self.payment_intent.get("metadata") or self.invoice_line_item.get("metadata") or {}
        if not metadata or "revenue_program_slug" not in metadata:
            raise InvalidMetadataError(f"Metadata is invalid for payment_intent : {self.id}")
        return metadata["revenue_program_slug"]

    @property
    def subscription_id(self) -> str | None:
        if not self.payment_intent.invoice:  # this isn't a subscription
            return None
        return self.payment_intent.invoice.subscription.id

    @property
    def card(self) -> stripe.PaymentMethod | AttrDict:
        return getattr(self.payment_intent.payment_method, "card", None) or AttrDict(
            **{"brand": None, "last4": None, "exp_month": None}
        )

    @property
    def card_brand(self) -> str | None:
        return self.card.brand

    @property
    def last4(self) -> str | None:
        return self.card.last4

    @property
    def amount(self) -> int:
        return self.payment_intent.amount

    @property
    def created(self) -> datetime.datetime:
        return datetime.datetime.fromtimestamp(int(self.payment_intent.created), tz=datetime.timezone.utc)

    @property
    def provider_customer_id(self) -> str:
        return self.payment_intent.customer

    @property
    def last_payment_date(self) -> datetime.datetime:
        if not self.payment_intent.invoice:
            return datetime.datetime.fromtimestamp(int(self.payment_intent.created), tz=datetime.timezone.utc)
        return datetime.datetime.fromtimestamp(
            int(self.payment_intent.invoice.status_transitions.paid_at), tz=datetime.timezone.utc
        )

    @property
    def status(
        self,
    ) -> Literal[
        ContributionStatus.REFUNDED, ContributionStatus.PAID, ContributionStatus.PROCESSING, ContributionStatus.FAILED
    ]:
        if self.refunded:
            return ContributionStatus.REFUNDED
        if self.payment_intent.status == "succeeded":
            return ContributionStatus.PAID
        if self.payment_intent.status == "pending":
            return ContributionStatus.PROCESSING
        return ContributionStatus.FAILED

    @property
    def credit_card_expiration_date(self) -> str | None:
        return f"{self.card.exp_month}/{self.card.exp_year}" if self.card.exp_month else None

    @property
    def payment_type(self) -> str:
        return self.payment_intent.payment_method.type

    @property
    def refunded(self) -> bool:
        """For a contribution to consider it as refunded either refunded flag will be set for full refunds
        or acount_refunded will be > 0 (will be useful in case of partial refund and we still want to set
        the status as refunded)
        https://stripe.com/docs/api/charges/object#charge_object-refunded
        https://stripe.com/docs/api/charges/object#charge_object-amount_refunded
        """
        return self.payment_intent.get("refunded", False) or self.payment_intent.get("amount_refunded", 0) > 0

    @property
    def id(self) -> str:
        return self.payment_intent.id


class StripePiSearchResponse(BaseModel):
    """
    Wrapper for Stripe PaymentIntent search respons as documented here:
    https://stripe.com/docs/api/pagination/search as of August 2023.


    Its expected usage is converting the attrdict like Stripe object returned by .search to a StripePiSearchResponse.

    This is desirable from a type safety perspective as it allows us to refer to be more specific than typing.Any given
    that Stripe does not provide type hints for the objects returned by .search.
    """

    object: Literal["search_result"]
    url: str
    has_more: bool
    total_count: Optional[int]
    data: list[stripe.PaymentIntent]
    next_page: str | None = None

    class Config:
        # we do this to enable using `stripe.PaymentIntent` in data field type hint. Without this, pydantic will
        # raise an error because it expects stripe.PaymentIntent to be JSON serializable, which it is not.
        arbitrary_types_allowed = True


@dataclass
class StripeContributionsProvider:
    email_id: str
    stripe_account_id: str

    @cached_property
    def customers(self) -> list[str]:
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

    def generate_chunked_customers_query(self) -> Generator[str, None, None]:
        """
        Generates customer query in specified format in accordance with Stripe search API.
        Maximum number of customers can be provided is 10.
        https://stripe.com/docs/search.
        """
        for i in range(0, len(self.customers), MAX_STRIPE_CUSTOMERS_LIMIT):
            chunk = self.customers[i : i + MAX_STRIPE_CUSTOMERS_LIMIT]
            yield " OR ".join([f"customer:'{customer_id}'" for customer_id in chunk])

    def fetch_payment_intents(self, query: dict | None = None, page: str = "") -> StripePiSearchResponse:
        kwargs = {
            "query": query,
            "expand": ["data.invoice.subscription.default_payment_method", "data.payment_method"],
            "limit": MAX_STRIPE_RESPONSE_LIMIT,
            "stripe_account": self.stripe_account_id,
        }

        if page:
            kwargs["page"] = page

        # unfortunately, Stripe doesn't provide off the shelf types we can refer to in type hint for this method,
        # so as an alternative to typing.Any we use a this dataclass wrapper to provide some type safety
        return StripePiSearchResponse(**stripe.PaymentIntent.search(**kwargs))


@dataclass
class StripePaymentIntentsCacheProvider:
    """Explain away"""

    email_id: str
    stripe_account_id: str

    # fix this
    converter = StripePiAsPortalContribution
    serializer = PaymentProviderContributionSerializer
    cache = caches[DEFAULT_CACHE]

    @property
    def key(self) -> str:
        return f"{self.email_id}-payment-intents-{self.stripe_account_id}"

    def serialize(self, payment_intents: list[stripe.PaymentIntent]) -> dict:
        """Serializes the stripe.PaymentIntent object into json.

        The data returned is a dict whose keys are payment intent IDs found for the given email on the given stripe account.

        The values in this dict will a dictionary representing the serialized payment intent (given the serializer that
        StripePaymentIntentsCacheProvider is configured with).
        """
        data = {}
        for pi in payment_intents:
            try:
                serialized_obj = self.serializer(instance=self.converter(pi))
                data[pi.id] = serialized_obj
            except ContributionIgnorableError as ex:
                logger.warning("Unable to process payment intent [%s] due to [%s]", pi.id, type(ex))
        return data

    def upsert(self, payment_intents: list[stripe.PaymentIntent]) -> None:
        """Serializes raw Stripe payment intents and stores in cache."""
        data = self.serialize(payment_intents)
        # Since the Stripe objects themselves don't have a field indicating the account they came from (when they come
        # from a Connect webhook they do have this field) they get added here:
        for v in data.values():
            v.stripe_account_id = self.stripe_account_id

        cached_data = json.loads(self.cache.get(self.key) or "{}")
        cached_data.update(data)

        with self.cache.lock(f"{self.key}-lock"):
            logger.info("Inserting %s payment intents into cache with key %s", len(data), self.key)
            self.cache.set(self.key, json.dumps(cached_data), timeout=CONTRIBUTION_CACHE_TTL.seconds)

    def load(self) -> list[stripe.PaymentIntent]:
        logger.info("Loading payment intents from cache with key %s", self.key)
        data = self.cache.get(self.key)
        if not data:
            logger.info("No payment intents found in cache with key %s", self.key)
            return []
        data = [
            stripe.PaymentIntent.construct_from(values=x, key=settings.STRIPE_CURRENT_SECRET_KEY_CONTRIBUTION)
            for x in json.loads(data).values()
        ]
        logger.info("Retrieved and hydrated %s payment intents from cache with key %s", len(data), self.key)
        return data


class SerializedStripeSubscription(TypedDict):
    pass


@dataclass
class StripeSubscriptionsCacheProvider:
    """Explain away"""

    email_id: str
    stripe_account_id: str

    cache = caches[DEFAULT_CACHE]
    serializer = SubscriptionsSerializer

    @property
    def key(self) -> str:
        self.key = f"{self.email_id}-subscriptions-{self.stripe_account_id}"

    def upsert(self, subscriptions: list[stripe.Subscription]) -> None:
        """Upserts stripe subscriptions in the cache."""
        logger.info("Upserting %s subscriptions into cache with key %s", len(subscriptions), self.key)
        data = {}
        for s in subscriptions:
            try:
                # Since the Stripe objects themselves don't have a field indicating the Stripe Account they came
                # from (when they come from a Connect webhook they do have this field)
                data[s.id] = self.serializer(instance=s) | {"stripe_account_id": self.stripe_account_id}
            except exceptions.ValidationError as ex:
                logger.warning("Unable to process Subscription [%s] due to [%s]", s.id, type(ex))
        cached_data = json.loads(self.cache.get(self.key) or "{}") | data
        logger.info(
            "Upserting %s total subscriptions (%s new) into cache with key %s",
            len(cached_data.keys()),
            len(data.keys()),
            self.key,
        )
        self.cache.set(self.key, json.dumps(cached_data, cls=DjangoJSONEncoder), timeout=CONTRIBUTION_CACHE_TTL.seconds)

    def load(self) -> list[stripe.Subscription]:
        """Gets the subscription data from cache for a specefic email and stripe account id combo."""
        logger.info("Loading subscriptions from cache with key %s", self.key)
        cached = self.cache.get(self.key)
        if not cached:
            logger.info("No subscriptions found in cache with key %s", self.key)
            return []
        data = [stripe.Subscription.construct_from(**x) for x in json.loads(cached).values()]
        logger.info("Retrieved %s contributions from cache with key %s", len(data), self.key)
        return data
