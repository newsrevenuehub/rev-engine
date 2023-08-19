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
from apps.contributions.serializers import (
    PaymentProviderContributionSerializer,
    SubscriptionsSerializer,
)
from apps.contributions.types import StripePiAsPortalContribution, StripePiSearchResponse
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

    CANCELABLE_STATUSES = ["trialing", "active", "past_due"]
    MODIFIABLE_STATUSES = ["incomplete", "trialing", "active", "past_due"]

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
        return self.payment_intent.invoice.subscription.status in self.CANCELABLE_STATUSES

    @property
    def is_modifiable(self):
        if not self.payment_intent.invoice:  # one-time payment
            return False
        return self.payment_intent.invoice.subscription.status in self.MODIFIABLE_STATUSES

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
    def last_payment_date(self) -> datetime.datetime | None:
        if not self.payment_intent.invoice:
            return datetime.datetime.fromtimestamp(int(self.payment_intent.created), tz=datetime.timezone.utc)
        # Unclear if this can happen in prod, but in review app, and working on DEV-3762, there was at least one
        # payment intent encountered that had None for invoice.status_transitions.paid_at, which caused an error here.
        paid_at = getattr(self.payment_intent.invoice.status_transitions, "paid_at", None)
        return paid_at if paid_at is None else datetime.datetime.fromtimestamp(int(paid_at), tz=datetime.timezone.utc)

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
    FETCH_PI_EXPAND_FIELDS = ["data.invoice.subscription.default_payment_method", "data.payment_method"]
    FETCH_SUB_EXPAND_FIELDS = ["data.default_payment_method"]

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

    def fetch_payment_intents(self, query=None, page=None) -> StripePiSearchResponse:
        kwargs = {
            "query": query,
            "expand": self.FETCH_PI_EXPAND_FIELDS,
            "limit": MAX_STRIPE_RESPONSE_LIMIT,
            "stripe_account": self.stripe_account_id,
        }

        if page:
            kwargs["page"] = page

        # unfortunately, Stripe doesn't provide off the shelf types we can refer to in type hint for this method,
        # so as an alternative to typing.Any we use a this dataclass wrapper to provide some type safety

        # add big warning about how counterintuitive the returned stripe object is!
        return StripePiSearchResponse(**stripe.PaymentIntent.search(**kwargs))

    def fetch_uninvoiced_subscriptions_for_customer(self, customer_id: str) -> list[stripe.Subscription]:
        """Gets all the uninvoiced subscriptions for a given customer id (for a given connected tripe account)"""
        logger.info("Fetching uninvoiced active subscriptions for stripe customer id %s", customer_id)
        subs = stripe.Subscription.list(
            customer=customer_id,
            expand=self.FETCH_SUB_EXPAND_FIELDS,
            limit=MAX_STRIPE_RESPONSE_LIMIT,
            stripe_account=self.stripe_account_id,
            status="active",
        )
        return [sub for sub in subs.auto_paging_iter() if not getattr(sub, "latest_invoice", None)]

    def fetch_uninvoiced_subscriptions_for_contributor(self) -> list[stripe.Subscription]:
        """Gets all the uninvoiced subscriptions for a given contributor (for a given connected tripe account)

        Note there is a distinction between a revengine contributor and a Stripe customer. A revengine contributor
        has a unique email address (for a given RP) and can have more than one Stripe customer associated with it,
        as we create a new customer for each contribution.
        """
        logger.info("Fetching uninvoiced active subscriptions for contributor with email %s", self.email_id)
        subs = []
        for cus in self.customers:
            subs.extend(self.fetch_uninvoiced_subscriptions_for_customer(cus))
        logger.info("Fetched %s uninvoiced subscriptions for contributor with email %s", len(subs), self.email_id)
        return subs

    def get_interval_from_subscription(self, subscription: stripe.Subscription) -> ContributionInterval:
        """Gets the ContributionInterval from a stripe.Subscription object."""
        interval = subscription.plan.interval
        interval_count = subscription.plan.interval_count
        if interval == "year" and interval_count == 1:
            return ContributionInterval.YEARLY
        if interval == "month" and interval_count == 1:
            return ContributionInterval.MONTHLY
        raise InvalidIntervalError(f"Invalid interval {interval} for subscription : {subscription.id}")

    def cast_subscription_to_pi_for_portal(self, subscription: stripe.Subscription) -> StripePiAsPortalContribution:
        """Casts a Subscription object to a PaymentIntent object for use in the Stripe Customer Portal.

        The primary use case for this is retrieving subscriptions that have been imported into revengine from legacy system.
        Those subscriptions get imported via Switchboard, and have a future date for billing anchor, and no proration behavior, as the
        contributor has already paid for the given interval on the old subscription. This method casts those subscriptions to the same
        form that "normal" subscriptions take, so that they can be managed in the contributor portal.
        """
        logger.debug("Casting subscription %s to a portal contribution", subscription.id)
        try:
            card = subscription.default_payment_method.card or AttrDict(
                **{"brand": None, "last4": None, "exp_month": None}
            )
            return StripePiAsPortalContribution(
                amount=subscription.plan.amount,
                created=datetime.datetime.fromtimestamp(int(subscription.created), tz=datetime.timezone.utc),
                card_brand=card.brand,
                credit_card_expiration_date=f"{card.exp_month}/{card.exp_year}" if card.exp_month else None,
                id=subscription.id,
                interval=self.get_interval_from_subscription(subscription),
                is_cancelable=subscription.status in StripePaymentIntent.CANCELABLE_STATUSES,
                is_modifiable=subscription.status in StripePaymentIntent.MODIFIABLE_STATUSES,
                last_payment_date=None,
                last4=card.last4,
                payment_type=subscription.default_payment_method.type,
                provider_customer_id=subscription.customer,
                revenue_program=subscription.metadata.revenue_program_slug,
                # note that subscriptions don't quite map to how we're using status when representing a Stripe PaymentIntent.
                # For serialization etc. to work out, we need to have a status though. From contributors and org's perspective,
                # these subscriptions are "paid" in the sense that user has already been invoice in legacy system. So we use PAID instead
                # of introducing a new ContributionStatus just to represent this case.
                status=ContributionStatus.PAID,
                stripe_account_id=self.stripe_account_id,
                subscription_id=subscription.id,
            )
        # We don't expect this to happen, but it's conceivable that a subscription could be missing a default payment method or card thereon
        except AttributeError as exc:
            raise ContributionIgnorableError(
                f"Unable to cast subscription {subscription.id} to a portal contribution"
            ) from exc


class ContributionsCacheProvider:
    cache = caches[DEFAULT_CACHE]
    serializer = PaymentProviderContributionSerializer
    converter = StripePaymentIntent

    def __init__(self, email_id, stripe_account_id) -> None:
        self.cache = caches[DEFAULT_CACHE]
        self.stripe_account_id = stripe_account_id

        self.key = f"{email_id}-payment-intents-{self.stripe_account_id}"

    def serialize(self, payment_intents: list[stripe.PaymentIntent]) -> dict[str, dict]:
        """Serializes the stripe.PaymentIntent object into json."""
        data = {}
        for pi in payment_intents:
            try:
                serialized_obj = self.serializer(instance=self.converter(pi))
                data[pi.id] = serialized_obj.data
            except ContributionIgnorableError as ex:
                logger.warning("Unable to process Contribution [%s]", pi.id, exc_info=ex)
        return data

    def upsert_uninvoiced_subscriptions(self, subscriptions: list[StripePiAsPortalContribution]) -> None:
        """"""
        data = {x.id: dict(x) for x in subscriptions}
        cached_data = json.loads(self.cache.get(self.key) or "{}")
        cached_data.update(data)
        logger.info(
            "Inserting %s stripe subscriptions cast as portal contributions into cache with key %s", len(data), self.key
        )
        self.cache.set(self.key, json.dumps(cached_data, cls=DjangoJSONEncoder), timeout=CONTRIBUTION_CACHE_TTL.seconds)

    def upsert(self, contributions):
        """Serialized and Upserts contributions data to cache."""
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

    def load(self) -> list[StripePiAsPortalContribution]:
        data = self.cache.get(self.key)
        if not data:
            return []
        data = [StripePiAsPortalContribution(**x) for x in json.loads(data).values()]
        logger.debug("Data to be returned %s", data)
        logger.info("Retrieved %s contributions from cache with key %s", len(data), self.key)
        return data


class SubscriptionsCacheProvider:
    cache = caches[DEFAULT_CACHE]
    serializer = SubscriptionsSerializer

    def __init__(self, email_id, stripe_account_id) -> None:
        self.stripe_account_id = stripe_account_id
        self.key = f"{email_id}-subscriptions-{self.stripe_account_id}"

    def serialize(self, subscriptions):
        """Serializes the stripe.Subscription object into json."""
        data = {}
        for subscription in subscriptions:
            try:
                serialized_obj = self.serializer(instance=subscription)
                data[subscription.id] = serialized_obj.data
            # Note: I don't think there's a way to reach this path, as we are not initializing the serializer with data
            # and then calling .is_valid(exception=True), but not changing for now.
            except exceptions.ValidationError as ex:
                logger.warning("Unable to process Subscription [%s] due to [%s]", subscription.id, type(ex))
        return data

    def upsert(self, subscriptions: list[stripe.Subscription]):
        """Serialized and Upserts subscriptions data to cache."""
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
        data = self.cache.get(self.key)
        if not data:
            return []
        data = [AttrDict(**x) for x in json.loads(data).values()]
        logger.info("Retrieved %s contributions from cache with key %s", len(data), self.key)
        return data
