import datetime
import json
import logging
from dataclasses import dataclass
from functools import cached_property
from typing import Generator, Literal, Optional, TypedDict

from django.conf import settings
from django.core.cache import caches
from django.core.serializers.json import DjangoJSONEncoder

import stripe
from addict import Dict as AttrDict
from pydantic import BaseModel

from apps.contributions.choices import CardBrand, ContributionInterval, ContributionStatus
from apps.contributions.exceptions import (
    ContributionIgnorableError,
    InvalidIntervalError,
    InvalidMetadataError,
)
from apps.contributions.serializers import (
    PaymentProviderContributionSerializer,
    SubscriptionsSerializer,
)
from revengine.settings.base import CONTRIBUTION_CACHE_TTL, DEFAULT_CACHE


MAX_STRIPE_RESPONSE_LIMIT = 100
MAX_STRIPE_CUSTOMERS_LIMIT = 10

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@dataclass
class StripePiAsPortalContribution:
    """
    This class is responsible for converting a Stripe PaymentIntent object into an object conforming to the schema expected
    by the portal's contributions tables in the SPA.

    Note that this class is not responsible for serializing the object into JSON. The expected caller for this class is
    `StripePiAsPortalContributionCacheProvider`. This class is responsible for converting the Stripe PaymentIntent object into
    that can be consumed when serialized in the cache provider.
    """

    payment_intent: stripe.PaymentIntent

    CANCELABLE_SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due"]
    MODIFIABLE_SUBSCRIPTION_STATUSES = ["incomplete", "trialing", "active", "past_due"]

    def ensure_payment_intent_expanded(self) -> None:
        """Ensures that the PaymentIntent has the necessary attributes expanded

        There are several methods in this class that assume that in case of PI for a recurring payment, the returned
        PaymentIntent has expanded:
            - invoice.subscription.default_payment_method
            - payment_method

        """
        logger.info("Ensuring payment_intent %s has necessary attributes expanded", {self.id})
        problems = []
        # recurring payments have an invoice but one-time do not
        if invoice := self.payment_intent.invoice:
            if not invoice.subscription:
                problems.append("invoice.subscription")
        # relevant to both one-time and recurring
        if not self.payment_intent.payment_method:
            problems.append("payment_method")
        if problems:
            raise ContributionIgnorableError(f"PaymentIntent {self.id} does not have required attributes: {problems}")

    def __post_init__(self) -> None:
        self.ensure_payment_intent_expanded()

    @property
    def invoice_line_item(self) -> AttrDict:
        line_item = AttrDict({})
        if invoice := self.payment_intent.invoice:
            line_item = AttrDict(invoice.lines.data[0].to_dict())
        return line_item

    @property
    def is_cancelable(self) -> bool:
        if not (invoice := self.payment_intent.invoice):  # one-time payment
            return False
        return invoice.subscription.status in self.CANCELABLE_SUBSCRIPTION_STATUSES

    @property
    def is_modifiable(self) -> bool:
        if not (invoice := self.payment_intent.invoice):  # one-time payment
            return False
        return invoice.subscription.status in self.MODIFIABLE_SUBSCRIPTION_STATUSES

    @property
    def interval(self) -> ContributionInterval:
        if not (invoice := self.payment_intent.invoice):
            return ContributionInterval.ONE_TIME
        if (count := (plan := invoice.subscription.plan).interval_count) != 1:
            raise InvalidIntervalError(f"Unexpected interval_count ({count}) for payment_intent {self.id}")
        if plan.interval not in ["month", "year"]:
            raise InvalidIntervalError(f"Unexpected plan interval ({plan.interval}) for payment_intent {self.id}")
        return ContributionInterval.MONTHLY if plan.interval == "month" else ContributionInterval.YEARLY

    @property
    def revenue_program(self) -> str:
        metadata = None
        if self.payment_intent.metadata:
            metadata = self.payment_intent.metadata
            source = "payment intent"
        else:
            metadata = self.invoice_line_item.metadata
            source = "invoice line item"
        if metadata is None:
            raise InvalidMetadataError(
                f"Cannot determine revenue_program for payment intent {self.id} because metadata is missing"
            )
        if "revenue_program_slug" not in metadata:
            raise InvalidMetadataError(
                f"Cannot determine revenue_program for payment intent {self.id} because metadata in {source} doesn't have revenue_program_slug"
            )
        return metadata["revenue_program_slug"]

    @property
    def subscription_id(self) -> str | None:
        if not (invoice := self.payment_intent.invoice):  # this isn't a subscription
            return None
        return invoice.subscription.id

    @property
    def card(self) -> AttrDict:
        if card := getattr(self.payment_intent.payment_method, "card", None):
            return AttrDict(card.to_dict())
        return AttrDict({"brand": None, "last4": None, "exp_month": None})

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
        # NB: this is in original code but is not a valid status for Stripe PIs.
        # https://web.archive.org/web/20200907115209/https://stripe.com/docs/api/payment_intents/object
        # (note that must use wayback machine to see API docs for non-current versions of Stripe API).
        # Maybe the status that's wanted is "requires_action" and/or "processing"??
        # TODO: [DEV-3855] Determine business logic for StripePiAsPortalContribution.status when it should be "pending"
        if self.payment_intent.status == "pending":
            return ContributionStatus.PROCESSING
        return ContributionStatus.FAILED

    @property
    def credit_card_expiration_date(self) -> str | None:
        return f"{self.card.exp_month}/{self.card.exp_year}" if all([self.card.exp_month, self.card.exp_year]) else None

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
    Wrapper for Stripe PaymentIntent search response as documented here:
    https://stripe.com/docs/api/pagination/search as of August 2023.


    Its expected usage is converting the attrdict like Stripe object returned by .search to a StripePiSearchResponse.

    This is desirable from a type safety perspective as it allows us to refer to be more specific than typing.Any given
    that Stripe does not provide type hints for the objects returned by .search.
    """

    url: str
    has_more: bool
    data: list[stripe.PaymentIntent]
    next_page: str | None = None
    object: Literal["search_result"] = "search_result"

    class Config:
        # we do this to enable using `stripe.PaymentIntent` in data field type hint. Without this, pydantic will
        # raise an error because it expects stripe.PaymentIntent to be JSON serializable, which it is not.
        arbitrary_types_allowed = True


@dataclass
class StripePaymentIntentsProvider:
    """
    This is a wrapper for retrieving Stripe PaymentIntents for a given email and stripe account combo.
    """

    email_id: str
    stripe_account_id: str

    EXPAND_FIELDS = [
        "data.invoice.subscription.default_payment_method",
        "data.payment_method",
    ]

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

    def fetch_payment_intents(self, query: str, page: str = "") -> StripePiSearchResponse:
        kwargs = {
            "query": query,
            "expand": self.EXPAND_FIELDS,
            "limit": MAX_STRIPE_RESPONSE_LIMIT,
            "stripe_account": self.stripe_account_id,
        }

        if page:
            kwargs["page"] = page

        # unfortunately, Stripe doesn't provide off the shelf types we can refer to in type hint for this method,
        # so as an alternative to typing.Any we use a this dataclass wrapper to provide some type safety
        return StripePiSearchResponse(**stripe.PaymentIntent.search(**kwargs))


class StripeEntityAsPortalEntityBase(TypedDict):
    id: str
    is_modifiable: bool
    is_cancelable: bool
    status: Literal[
        ContributionStatus.REFUNDED, ContributionStatus.PAID, ContributionStatus.PROCESSING, ContributionStatus.FAILED
    ]
    card_brand: Literal[
        CardBrand.AMEX, CardBrand.DISCOVER, CardBrand.MASTERCARD, CardBrand.VISA, CardBrand.UNKNOWN
    ] | None
    last4: int | None
    payment_type: str
    amount: int
    credit_card_expiration_date: str | None
    created: str
    last_payment_date: str
    stripe_account_id: str


class StripePiAsPortalContributionCacheResult(StripeEntityAsPortalEntityBase):
    """This is the data that we store in the cache for a given email and stripe account combo."""

    subscription_id: Optional[str]
    interval: Literal[ContributionInterval.MONTHLY, ContributionInterval.YEARLY, ContributionInterval.ONE_TIME]
    revenue_program: str
    provider_customer_id: str


@dataclass
class StripePiAsPortalContributionCacheProvider:
    """This class provides an interface with our cache to store and retrieve Stripe PaymentIntents for a given email and stripe account.

    The `StripePiAsPortalContribution` in the class name relates to the converter below. This is meant to communicate that we're taking
    Stripe PaymentIntents and converting them to data that the SPA uses in the contributor portal to display the user's contribution history.

    """

    email_id: str
    stripe_account_id: str

    converter = StripePiAsPortalContribution
    serializer = PaymentProviderContributionSerializer
    cache = caches[DEFAULT_CACHE]

    @property
    def key(self) -> str:
        return f"{self.email_id}-payment-intents-{self.stripe_account_id}"

    def serialize(self, payment_intents: list[stripe.PaymentIntent]) -> dict:
        """Serializes the stripe.PaymentIntent object into serializable data"""
        data = {}
        for pi in payment_intents:
            try:
                # This code is a bit convoluted. Our converter returns a value that cannot be serialized by DRF via `data=`,
                # which means that we would be unable to validate.  So we first serialize the data via `instance=`, and that gives
                # us a value that can be serialized by DRF via `data=`, which we then validate.
                initial_serialized = self.serializer(instance=self.converter(AttrDict(pi.to_dict())))
                serialized = self.serializer(data=initial_serialized.data)
                if not serialized.is_valid():
                    messages = []
                    for field, err in serialized.errors.items():
                        messages.append(f"{field}: {err[0]}")
                    logger.info(
                        "Unable to serialize payment intent %s because %s",
                        pi.id,
                        messages,
                    )
                    raise ContributionIgnorableError(
                        f"Unable to serialize payment intent {pi.id} because: {serialized.errors}"
                    )
                data[pi.id] = serialized
            # this can happen because of above raise or because it happens in `self.converter()` above
            except ContributionIgnorableError as exc:
                logger.info("Unable to serialize payment intent %s", pi.id, exc_info=exc)
        return data

    def upsert(self, payment_intents: list[stripe.PaymentIntent]) -> None:
        """Serializes raw Stripe payment intents and stores in cache"""
        data = self.serialize(payment_intents)
        # Since the Stripe objects themselves don't have a field indicating the account they came from they get added here.
        # Also, our serializer instances will not be directly JSON serializable, so we need to extract the data from them
        for k, v in data.items():
            data[k] = v.data | {"stripe_account_id": self.stripe_account_id}
        cached_data = json.loads(self.cache.get(self.key) or "{}")
        cached_data.update(data)

        with self.cache.lock(f"{self.key}-lock"):
            logger.info(
                "Inserting %s payment intents as portal contributions into cache with key %s", len(data), self.key
            )
            self.cache.set(self.key, json.dumps(cached_data), timeout=CONTRIBUTION_CACHE_TTL.seconds)

    def load(self) -> list[StripePiAsPortalContributionCacheResult]:
        logger.info("Loading payment intents as portal contributions from cache with key %s", self.key)
        data = self.cache.get(self.key)
        if not data:
            logger.info("No payment intents as portal contributions found in cache with key %s", self.key)
            return []
        data = [StripePiAsPortalContributionCacheResult(**x) for x in json.loads(data).values()]
        logger.info(
            "Retrieved and hydrated %s payment intents as portal contributions from cache with key %s",
            len(data),
            self.key,
        )
        return data


class StripeSubscriptionsCacheResult(StripeEntityAsPortalEntityBase):
    next_payment_date: str
    interval: Literal[ContributionInterval.MONTHLY, ContributionInterval.YEARLY]
    revenue_program_slug: str
    customer_id: str


@dataclass
class StripeSubscriptionsCacheProvider:
    """This class provides an interface with our cache to store and retrieve Stripe subscriptions for a given email and stripe account."""

    email_id: str
    stripe_account_id: str

    cache = caches[DEFAULT_CACHE]
    serializer = SubscriptionsSerializer

    @property
    def key(self) -> str:
        return f"{self.email_id}-subscriptions-{self.stripe_account_id}"

    def upsert(self, subscriptions: list[stripe.Subscription]) -> None:
        """Upserts stripe subscriptions in the cache."""
        logger.info("Upserting %s subscriptions into cache with key %s", len(subscriptions), self.key)
        data = {}
        for s in subscriptions:
            try:
                # Since the Stripe objects themselves don't have a field indicating the Stripe Account they came
                # from (when they come from a Connect webhook they do have this field)
                data[s.id] = self.serializer(instance=s).data | {"stripe_account_id": self.stripe_account_id}
            # this will happen if for some reason the subscription does not have data that the serializer expects.
            # For instance, if it gets passed a subscription that doesn't have default payment method expanded, then
            # this could occur
            except AttributeError as ex:
                logger.warning(
                    "Unable to process Subscription [%s] due to [%s]", getattr(s, "id", "<missing-id>"), type(ex)
                )
        cached_data = json.loads(self.cache.get(self.key) or "{}") | data
        logger.info(
            "Upserting %s total subscriptions (%s new) into cache with key %s",
            len(cached_data.keys()),
            len(data.keys()),
            self.key,
        )
        self.cache.set(self.key, json.dumps(cached_data, cls=DjangoJSONEncoder), timeout=CONTRIBUTION_CACHE_TTL.seconds)

    def load(self) -> list[StripeSubscriptionsCacheResult]:
        """Gets the subscription data from cache for a specefic email and stripe account id combo."""
        logger.info("Loading subscriptions from cache with key %s", self.key)
        cached = self.cache.get(self.key)
        if not cached:
            logger.info("No subscriptions found in cache with key %s", self.key)
            return []
        data = [StripeSubscriptionsCacheResult(**x) for x in json.loads(cached).values()]
        logger.info("Retrieved %s contributions from cache with key %s", len(data), self.key)
        return data
