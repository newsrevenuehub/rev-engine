from dataclasses import dataclass
import datetime
import json
import logging
from functools import cached_property

from celery import shared_task
import pydantic
from django.conf import settings
from django.core.cache import caches
from django.core.serializers.json import DjangoJSONEncoder

import stripe
from addict import Dict as AttrDict
from rest_framework import exceptions
from stripe.stripe_object import StripeObject

from apps.common.utils import rate_limiter
from apps.contributions.models import ContributionInterval, ContributionStatus, Contribution
from apps.contributions.serializers import (
    PaymentProviderContributionSerializer,
    SubscriptionsSerializer,
)
from apps.contributions.types import (
    StripePiAsPortalContribution,
    StripePiSearchResponse,
)
from revengine.settings.base import CONTRIBUTION_CACHE_TTL, DEFAULT_CACHE
from apps.organizations.models import PaymentProvider


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
    _apps.contributions.serializers.PaymentProviderContributionSerializer and serializable.


    If there's no Invoice associated with a Payment Intent then it's a one-time payment.
    """

    CANCELABLE_STATUSES = ["trialing", "active", "past_due"]
    MODIFIABLE_STATUSES = ["incomplete", "trialing", "active", "past_due"]

    DUMMY_CARD = AttrDict(**{"brand": None, "last4": None, "exp_month": None, "exp_year": None})

    def __init__(self, payment_intent):
        self.payment_intent = payment_intent

    @property
    def payment_method(self) -> StripeObject | None:
        # this is the most commonly expected path for NRE-generated PMs where the checkout process goes through the Stripe PaymentElement workflow
        # in the spa, after having gone through the initial page that collects contribution data. In this scenario, the user's contribution has
        # been approved by our system, and we have already created a payment intent. When the user completes the PaymentElement form, they are immediately
        # charged. Our implementation of the PaymentElement will cause the payment method to appear on the payment intent.
        if self.payment_intent.payment_method and isinstance(self.payment_intent.payment_method, StripeObject):
            return self.payment_intent.payment_method
        # However, some NRE payment intents intents will not have a payment method attached directly to the PaymentIntent. There may be other ways to end
        # up in this state, but one is when instead of creating a payment intent we create a setup intent (which is case when a contribution exceeds threshold
        # to be marked as "bad" by bad actor API when signing up for a recurring contribution). In this case, a payment intent only later gets created when
        # the setup intent is completed, and that does not result in the payment method automatically being attached to the pi.
        elif (invoice := self.payment_intent.invoice) and isinstance(
            invoice, StripeObject
        ):  # could be a string so that's why type check
            return (invoice.get("subscription", {}) or {}).get("default_payment_method", None)
        # in the case of imported legacy subscriptions, it seems that the payment method is not directly on the
        # payment intent, though it is available through this route. This probably has to do with how the original PI
        # was created. PIs are not guaranteed to have a payment method attached, even if they're associated with a subscription.
        # In general, NRE-generated PIs will have a payment method attached, but for these legacy PIs this is not necessarily (or even usually
        # the case)
        elif getattr(self.payment_intent, "charges", None) and self.payment_intent.charges.total_count > 0:
            most_recent = max(self.payment_intent.charges.data, key=lambda x: x.created)
            return most_recent.payment_method_details

        return None

    @property
    def invoice_line_item(self):
        default = AttrDict({})
        if not self.payment_intent.invoice:
            return default
        if lines_data := self.payment_intent.invoice.lines.data:
            return lines_data[0]
        return default

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
            raise InvalidMetadataError(f"Metadata is invalid for payment_intent : {self.id}, {metadata}")
        return metadata["revenue_program_slug"]

    @property
    def subscription_id(self):
        if not self.payment_intent.invoice:  # this isn't a subscription
            return None
        return self.payment_intent.invoice.subscription.id

    @property
    def card(self):
        card = self.DUMMY_CARD
        if self.payment_method and self.payment_method.card:
            card = self.payment_method.card
        return card

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
        # NB: There is a bug with our .refunded property to be addressed in DEV-3987 which means
        # that .refunded will never be True.
        if self.refunded:
            return ContributionStatus.REFUNDED
        if self.canceled:
            return ContributionStatus.CANCELED
        if self.payment_intent.status == "succeeded":
            return ContributionStatus.PAID
        if self.payment_intent.status == "pending":
            return ContributionStatus.PROCESSING
        return ContributionStatus.FAILED

    @property
    def credit_card_expiration_date(self):
        return f"{self.card.exp_month}/{self.card.exp_year}" if self.card.exp_month else None

    @property
    def payment_type(self) -> str | None:
        return None if self.payment_method is None else self.payment_method.type

    @property
    def canceled(self):
        if not self.payment_intent.invoice:  # it's not a subscription
            return False
        return self.payment_intent.invoice.subscription.status == "canceled"

    # TODO: [DEV-3987] Fix StripePaymentIntent.refunded property
    @property
    def refunded(self):
        """For a contribution to be considered as refunded either refunded flag will be set for full refunds
        or amount_refunded will be > 0 (will be useful in case of partial refund and we still want to set
        the status as refunded)
        https://stripe.com/docs/api/charges/object#charge_object-refunded
        https://stripe.com/docs/api/charges/object#charge_object-amount_refunded
        """
        if "refunded" in self.payment_intent:
            return self.payment_intent.refunded
        if "amount_refunded" in self.payment_intent:
            return self.payment_intent.amount_refunded > 0
        return False

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
        return StripePiSearchResponse(**stripe.PaymentIntent.search(**kwargs))

    def fetch_uninvoiced_subscriptions_for_customer(self, customer_id: str) -> list[stripe.Subscription]:
        """Gets all the uninvoiced subscriptions for a given customer id (for a given connected Stripe account)"""
        logger.info(
            "Fetching uninvoiced active subscriptions for stripe customer id %s and stripe account %s",
            customer_id,
            self.stripe_account_id,
        )
        subs = stripe.Subscription.list(
            customer=customer_id,
            expand=self.FETCH_SUB_EXPAND_FIELDS,
            limit=MAX_STRIPE_RESPONSE_LIMIT,
            stripe_account=self.stripe_account_id,
            status="active",
        )
        returned_subs = [sub for sub in subs.auto_paging_iter() if not getattr(sub, "latest_invoice", None)]
        logger.info(
            "Fetched %s uninvoiced subscriptions for customer with customer_id %s", len(returned_subs), customer_id
        )
        return returned_subs

    def fetch_uninvoiced_subscriptions_for_contributor(self) -> list[stripe.Subscription]:
        """Gets all the uninvoiced subscriptions for a given contributor (for a given connected Stripe account)

        Note there is a distinction between a revengine contributor and a Stripe customer. A revengine contributor
        has a unique email address (for a given RP) and can have more than one Stripe customer associated with it,
        as we create a new customer for each contribution.
        """
        logger.info(
            "Fetching uninvoiced active subscriptions for contributor with email %s for stripe account %s",
            self.email_id,
            self.stripe_account_id,
        )
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
                **{"brand": None, "last4": None, "exp_month": None, "exp_year": None}
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
    _serializer = PaymentProviderContributionSerializer

    converter = StripePaymentIntent

    def __init__(self, email_id, stripe_account_id) -> None:
        self.email_id = email_id
        self.stripe_account_id = stripe_account_id
        self.key = f"{email_id}-payment-intents-{self.stripe_account_id}".lower()

    def serialize(self, payment_intents: list[stripe.PaymentIntent]) -> dict[str, dict]:
        """Serializes the stripe.PaymentIntent object into json."""
        data = {}
        for pi in payment_intents:
            try:
                serialized_obj = self.serializer(instance=self.converter(pi))
                data[pi.id] = serialized_obj.data
            except (ContributionIgnorableError, InvalidMetadataError) as ex:
                logger.warning("Unable to process Contribution [%s]", pi.id, exc_info=ex)
        return data

    def convert_uninvoiced_subs_into_contributions(
        self, subscriptions: list[stripe.Subscription]
    ) -> list[StripePiAsPortalContribution]:
        """ """
        logger.debug("Converting %s subscriptions to portal contributions", len(subscriptions))
        converted = []
        provider = StripeContributionsProvider(self.email_id, self.stripe_account_id)
        for x in subscriptions:
            try:
                converted.append(provider.cast_subscription_to_pi_for_portal(x))
            # if there's a problem converting one, we don't let it effect the rest
            except ContributionIgnorableError as exc:
                logger.warning("Unable to cast subscription %s to a portal contribution", x.id, exc_info=exc)
        logger.info(
            "Converted %s subscriptions to portal contributions. %s could not be converted",
            len(converted),
            len(subscriptions) - len(converted),
        )
        return converted

    def upsert_uninvoiced_subscriptions(self, subscriptions: list[StripePiAsPortalContribution]) -> None:
        """Upsert uninvoiced subscriptions into the cache as though they were "normal" contributions (that always have a payment intent
        associated with them).
        """
        data = {x.id: dict(x) for x in subscriptions}
        cached_data = json.loads(self.cache.get(self.key) or "{}")
        cached_data.update(data)
        logger.info(
            "Inserting %s stripe subscriptions cast as portal contributions into cache with key %s",
            len(data),
            self.key,
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
        self.key = f"{email_id}-subscriptions-{self.stripe_account_id}".lower()

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


    
@dataclass(frozen=True)
class StripeClientForConnectedAccount:
    """A wrapper around Stripe library for a connected account.
    
    Gets initialized with an account id, and when making requests to stripe, that account ID is included as the
    stripe_account parameter.
    """
    account_id: str
    lte: datetime.datetime = None
    gte: datetime.datetime = None

    ALL_METADATA_SCHEMA_VERSIONS = ("1.0", "1.1", "1.2", "1.3", "1.4", "1.5")
    SUPPORTED_METADATA_SCHEMA_VERSIONS = ("1.4", "1.5")
    # https://stripe.com/docs/rate-limits
    STRIPE_SEARCH_MAX_REQUESTS_PER_SECOND = 20
    # make this dynamic based on django settings -- it's 25 in test, and 100 in live
    STRIPE_DEFAULT_MAX_REQUESTS_PER_SECOND = 100


    def __post_init__(self):
        logger.info("Initializing StripeClientForConnectedAccount with account_id %s", self.account_id)

    @rate_limiter(max_requests=STRIPE_SEARCH_MAX_REQUESTS_PER_SECOND)
    def _search(self, stripe_object: stripe.Invoice | stripe.PaymentIntent | stripe.Subscription, query: str, **kwargs) -> stripe.Invoice | stripe.PaymentIntent | stripe.Subscription:
        logger.info("Searching for %s with query %s for account %s", stripe_object, query, self.account_id)
        return stripe_object.search(query, **(self._default_stripe_kwargs | kwargs))
    
    def _do_paginated_search(self, stripe_object, query: str) -> list[stripe.Invoice] | list[stripe.PaymentIntent] | list[stripe.Subscription]:
        """Does a paginated search for a given stripe object and query.
        
        Note that we have opted to use search API instead of list in this class because search allows us to filter
        by created date range (among other criteria), which is relevant for our immediate use case. The tradeoff
        here is that Stripe's search function in Python library does not provide a convenience method around
        iterating over paginated results. We have to do that ourselves in this method.
        """
        logger.info("Doing paginated search for %s with query %s for account %s", stripe_object, query, self.account_id)
        results = []
        last_id = None
        has_more = True
        while has_more:
            response = self._search(stripe_object=stripe_object, query=query, starting_after=last_id) 
            results.extend(response.data)
            has_more = response.has_more
            last_id = response.data[-1].id
        return results


    @property
    def created_query(self) -> str:
        """Generate a string to limit query to entities that have been created within a given date range"""
        query_parts = []
        if self.gte:
            query_parts.append(f"created >= {self.gte.timestamp()}")
        if self.lte:
            query_parts.append(f"created <= {self.lte.timestamp()}")
        return "AND ".join(query_parts)

    def get_invoices(self) -> list[stripe.Invoice]:
        """Gets invoices for a given stripe account"""
        # need a query for search, if none, then we just do invoices list to retrieve all invoices
        if not (query := self.created_query):
            return [x for x in stripe.Invoice.list(**self._default_stripe_kwargs).auto_paging_iter()]
        return self._do_paginated_search(stripe_object=stripe.Invoice, query=query)
    
    @rate_limiter(max_requests=STRIPE_DEFAULT_MAX_REQUESTS_PER_SECOND)
    def get_subscription(self, subscription_id: str, **kwargs) -> stripe.Subscription | None:
        logger.info("Getting subscription %s for account %s", subscription_id, self.account_id)
        return stripe.Subscription.retrieve(subscription_id, **(self._default_stripe_kwargs | kwargs))
    
    def get_payment_intents(self, metadata_query: str = None) -> list[stripe.PaymentIntent]:
        """Gets payment intents for a given stripe account
        """
        query_parts = []
        # each subquery can have ANDs or ORs so we surround with parens so we can logically group the results
        if metadata_query:
            query_parts.append(f"({metadata_query})")
        if (created_query := self.created_query):
            query_parts.append(f"({created_query})")
        if not query_parts:
            return [x for x in stripe.PaymentIntent.list(**self._default_stripe_kwargs).auto_paging_iter()]
        return self._do_paginated_search(stripe_object=stripe.PaymentIntent, query=" AND ".join(query_parts))


    @property
    def _default_stripe_kwargs(self):
        return {"limit": MAX_STRIPE_RESPONSE_LIMIT, "stripe_account": self._account_id}

    @property
    def revengine_metadata_query(self) -> str:
        """"String to limit query to entities that have known revengine metadata version

        See https://stripe.com/docs/search#search-syntax for more details on search syntax for metadata
        """
        return " OR ".join([f'metadtata["schema_version"]:"{x}"' for x in self.ALL_METADATA_SCHEMA_VERSIONS])
        

    def get_revengine_one_time_payment_intents(self) -> list[stripe.PaymentIntent]:
        all_pis = self.get_payment_intents(metadata_query=self.revengine_metadata_query)
        suported_pis = []
        unsupported_pis = []
        for pi in all_pis:
            (suported_pis if pi.metadata.get("schema_version") in self.SUPPORTED_METADATA_SCHEMA_VERSIONS else unsupported_pis).append(pi)
        logger.info("Found %s revengine payment intents and %s unsupported revengine payment intents", len(suported_pis), len(unsupported_pis))
        return suported_pis

    def get_revengine_subscriptions(self) -> list[stripe.Subscription]:
        invoices = self.get_invoices()
        sub_ids = [x.subscription for x in invoices if x.subscription]
        revengine_subscriptions = []
        _unsupported_revengine_subscriptions = []
        for x in sub_ids:
            if (sub := self.get_subscription(x)):
                (revengine_subscriptions if sub.metadata.get("schema_version") in self.SUPPORTED_METADATA_SCHEMA_VERSIONS else _unsupported_revengine_subscriptions).append(sub)
        logger.info("Found %s revengine subscriptions and %s unsupported revengine subscriptions", len(revengine_subscriptions), len(_unsupported_revengine_subscriptions))
        return revengine_subscriptions
        
    
    
    
    

@dataclass(frozen=True)
class StripeToRevengineTransformer:
    """Docstring - expected can be called in sync/async context
    """
    # sync/async shall be determined in calling context. Should be a single method that can be called from both

    _STRIPE_ACCOUNTS_QUERY = PaymentProvider.objects.filter(
        provider=PaymentProvider.STRIP, stripe_account_id__isnull=False
    )

    for_orgs: list[str] = None
    for_stripe_accounts: list[str] = None
    # make these timestamps instead so serializable cause may be async
    from_date: datetime.datetime = None
    to_date: datetime.datetime = None

    def __post_init__(self):
        logger.info("Initializing StripeToRevengineTransformer with for_orgs %s and for_stripe_accounts %s", self.for_orgs, self.for_stripe_accounts)
        kwargs = {}
        if self.for_orgs:
            kwargs["organization__id__in"] = self.for_orgs
        if self.for_stripe_accounts:
            kwargs["stripe_account_id__in"] = self.for_stripe_accounts
        if kwargs:
            self._STRIPE_ACCOUNTS_QUERY = self._STRIPE_ACCOUNTS_QUERY.filter(**kwargs)
        

    @property
    def stripe_account_ids(self):
        return list(self._STRIPE_ACCOUNTS_QUERY.values_list("stripe_account_id", flat=True))

    
    # def stripe_metadata_validates_against_known_schema(self, metadata: dict | None) -> bool:
    #     try:
    #         ValidStripePaymentMetadataSchema(**metadata)
    #     except pydantic.ValidationError as exc:
    #         logger.warning("Invalid metadata %s", metadata, exc_info=exc)
    #         return False

    # def _get_untracked_subscriptions(self, subs: list[stripe.Subscription]) -> list[stripe.Subscription]:
    #     # fully validate the metadata and return only those that are valid
    #     - iterate over invoices
    #     # date range
    #     # not already in set of tracked subs
    #     return subs
    
    # @shared_task(bind=True, autoretry_for=(RateLimitError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
    def backfill_contributions_and_payments_for_stripe_account(self, account_id: str, gte_timestamp: int = None, lte_timestamp: int = None) -> None:
        logger.info("Backfilling stripe account %s", account_id)
        client = StripeClientForConnectedAccount(
            account_id=account_id,
            gte=datetime.datetime.fromtimestamp(gte_timestamp) if gte_timestamp else None,
            lte=datetime.datetime.fromtimestamp(lte_timestamp) if lte_timestamp else None,
        )
        subs = client.revengine_subscriptions
        untracked_sub_ids = (found_sub_id_set := set(x.id for x in subs)).difference(set(Contribution.objects.filter(provider_subscription_id__in=[x.id for x in subs]).values_list("provider_subscription_id", flat=True)))
        logger.info("Found %s possibly relevant subscriptions for stripe account %s, of which %s are currently untracked", len(found_sub_id_set), account_id, len(untracked_sub_ids))
        for sub in untracked_sub_ids:
            self.sync_subscription(sub)
        pis = client.revengine_payment_intents
        untracked_pi_ids = (found_pi_id_set := set(x.id for x in pis)).difference(set(Contribution.objects.filter(provider_payment_intent_id__in=[x.id for x in pis]).values_list("provider_payment_intent_id", flat=True)))        
        for pi in untracked_pi_ids:
            self.sync_payment_intent(pi)

    
    def backfill_contributions_and_payments_from_stripe(self):
        """""""
        logger.info("Backfilling %s stripe accounts %s", len(self.stripe_account_ids))
        for account_id in self.stripe_account_ids:

            logger.info
            self.sync_stripe_account(account_id)
        logger.info("Syncing complete")




