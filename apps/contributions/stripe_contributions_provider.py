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
from django.db import transaction
import reversion

import stripe
from addict import Dict as AttrDict
from rest_framework import exceptions
from stripe.stripe_object import StripeObject
from stripe.error import RateLimitError as StripeRateLimitError

from apps.common.utils import rate_limiter
from apps.contributions.models import ContributionInterval, ContributionStatus, Contribution, Contributor, Payment
from apps.contributions.serializers import (
    PaymentProviderContributionSerializer,
    SubscriptionsSerializer,
)
from apps.contributions.types import (
    StripePiAsPortalContribution,
    StripePiSearchResponse,
    SupportedStripePaymentMetadataSchema,
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
        UntrackedStripeSubscription.get_interval_from_subscription(subscription)

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


class UntrackedOneTimePaymentIntent:
    """Convenience class used to upsert contribution, contributor, and (optionally) payments for a given Stripe payment intent.

    Note that in the init method, we raise an exception if the metadata is invalid or if there is > 1 charge associated with the PI.
    """

    def __init__(self, payment_intent: stripe.PaymentIntent):
        try:
            SupportedStripePaymentMetadataSchema(**payment_intent.metadata)
        except pydantic.ValidationError as exc:
            raise InvalidMetadataError(f"Metadata is invalid for payment_intent : {payment_intent.id}") from exc

        if self.payment_intent.charges.total_count > 1:
            raise ValueError(f"Payment intent {payment_intent.id} has more than one charge")
        self.payment_intent = payment_intent

    @property
    def email_id(self) -> str:
        return self.payment_intent.customer_email

    @property
    def status(self) -> ContributionStatus:
        pass

    # this can be shared by both classes (one time and sub one)
    def upsert_payments(self, charge: stripe.Charge, contribution: Contribution) -> None:
        """ """
        Payment.objects.get_or_create(
            contribution=contribution,
            stripe_balance_transaction_id=charge.balance_transaction.id,
            defaults={
                "net_amount_paid": charge.balance_transaction.net,
                "gross_amount_paid": charge.balance_transaction.gross,
                "amount_refunded": 0,
                "transaction_time": datetime.datetime.fromtimestamp(
                    int(charge.balance_transaction.created), tz=datetime.timezone.utc
                ),
            },
        )

        for refund in charge.refunds.data:
            Payment.objects.get_or_create(
                contribution=contribution,
                stripe_balance_transaction_id=refund.balance_transaction.id,
                defaults={
                    "net_amount_paid": 0,
                    "gross_amount_paid": 0,
                    "amount_refunded": refund.amount,
                    "transaction_time": datetime.datetime.fromtimestamp(
                        int(refund.balance_transaction.created), tz=datetime.timezone.utc
                    ),
                },
            )

    @transaction.atomic
    def upsert(self, stripe_client: "StripeClientForConnectedAccount") -> Contribution:
        """Upsert a contribution, contributor, and payments for a given Stripe payment intent.

        If the payment intent has a charge associated, we'll upsert a payment.

        If that charge has any refunds associated with it, we'll upsert those as payments as well.
        """
        existing = Contribution.objects.filter(provider_payment_id=self.payment_intent.id).first()
        contributor, _ = Contributor.objects.get_or_create(email=self.email_id)
        defaults = {
            "amount": self.payment_intent.amount,
            "currency": self.payment_intent.currency,
            "reason": self.payment_intent.metadata.get("reason_for_giving", None),
            "interval": ContributionInterval.ONE_TIME,
            "payment_provider_used": "stripe",
            "provider_payment_id": self.payment_intent.id,
            "provider_customer_id": self.payment_intent.customer,
            "provider_payment_method_id": (pm_id := self.payment_intent.payment_method),
            "provider_payment_method_details": stripe_client.get_payment_method(self.payment_intent.payment_method)
            if pm_id
            else None,
            "contributor": contributor,
        }
        if existing:
            for k, v in defaults.items():
                setattr(existing, k, v)
            contribution = existing
            with reversion.create_revision():
                contribution.save(update_fields=set(defaults.keys() + ["modified"]))
                reversion.set_comment("UntrackedOneTimePaymentIntent.upsert updated existing contribution")
        else:
            contribution = Contribution(
                **defaults | {"provider_payment_id": self.payment_intent.id, "status": self.status}
            )
        if (
            charge := stripe_client.get_expanded_charge_object(self.payment_intent.charges.data[0].id)
            if self.payment_intent.charges.total_count == 1
            else None
        ):
            self.upsert_payments(charge, contribution)
        return contribution


class UntrackedStripeSubscription:
    """ """

    def __init__(self, subscription: stripe.Subscription, invoices: list[stripe.Invoice], charges: list[stripe.Charge]):
        try:
            SupportedStripePaymentMetadataSchema(**subscription.metadata)
        except pydantic.ValidationError as exc:
            raise InvalidMetadataError(f"Metadata is invalid for subscription : {subscription.id}") from exc

        self.subscription = subscription
        self.invoices = invoices
        self.charges = charges

    def __str__(self) -> str:
        return f"UntrackedStripeSubscription for subscription {self.subscription.id}"

    @property
    def status(self) -> ContributionStatus:
        pass

    @staticmethod
    def get_interval_from_subscription(subscription: stripe.Subscription) -> ContributionInterval:
        """Explanation

        note on how called from old code
        """
        interval = subscription.plan.interval
        interval_count = subscription.plan.interval_count
        if interval == "year" and interval_count == 1:
            return ContributionInterval.YEARLY
        if interval == "month" and interval_count == 1:
            return ContributionInterval.MONTHLY
        raise InvalidIntervalError(f"Invalid interval {interval} for subscription : {subscription.id}")

    @property
    def interval(self) -> ContributionInterval:
        return self.get_interval_from_subscription(self.subscription)

    @property
    def email_id(self) -> str:
        #  or?
        return self.subscription.customer_email

    def upsert_payments(self, contribution: Contribution) -> None:
        """Upsert payments for a given contribution"""
        for charge in self.charges:
            # dry this up
            Payment.objects.get_or_create(
                contribution=contribution,
                stripe_balance_transaction_id=charge.balance_transaction.id,
                defaults={
                    "net_amount_paid": charge.balance_transaction.net,
                    "gross_amount_paid": charge.balance_transaction.gross,
                    "amount_refunded": 0,
                    "transaction_time": datetime.datetime.fromtimestamp(
                        int(charge.balance_transaction.created), tz=datetime.timezone.utc
                    ),
                },
            )
            for refund in charge.refunds.data:
                # dry this up
                Payment.objects.get_or_create(
                    contribution=contribution,
                    stripe_balance_transaction_id=refund.balance_transaction.id,
                    defaults={
                        "net_amount_paid": 0,
                        "gross_amount_paid": 0,
                        "amount_refunded": refund.amount,
                        "transaction_time": datetime.datetime.fromtimestamp(
                            int(refund.balance_transaction.created), tz=datetime.timezone.utc
                        ),
                    },
                )

    @transaction.atomic
    def upsert(self, stripe_client: "StripeClientForConnectedAccount") -> Contribution:
        """Upsert contribution, contributor and payments for given Stripe subscription"""
        logger.info("Upserting untracked subscription %s", self.subscription.id)
        # we don't use get_or_create here because of nuance around reversion comments
        existing = Contribution.objects.filter(provider_subscription_id=self.subscription.id).first()
        contributor, _ = Contributor.objects.get_or_create(email=self.email_id)
        defaults = {
            "amount": self.subscription.plan.amount,
            "currency": self.subscription.plan.currency,
            # should be guaranteed that metadata is present at this point, given init
            "reason": self.subscription.metadata.get("reason_for_giving", None),
            "interval": self.interval,
            "payment_provider_used": "stripe",
            "provider_customer_id": self.subscription.customer,
            "provider_payment_method_id": self.payment_method_id,
            "provider_payment_method_details": stripe_client.get_payment_method(self.payment_method_id)
            if self.payment_method_id
            else None,
            "contributor": contributor,
            "contribution_metadata": self.subscription.metadata,
            "status": self.status,
        }

        if existing:
            for k, v in defaults.items():
                setattr(existing, k, v)
            contribution = existing
        else:
            contribution = Contribution(**defaults | {"provider_subscription_id": self.subscription.id})
        if existing:
            with reversion.create_revision():
                contribution.save(update_fields=set(defaults.keys() + ["modified"]))
                reversion.set_comment("UntrackedStripeSubscription updated existing contribution")
            logger.info(
                "Updated existing contribution %s for provider_subscription_id %s",
                contribution.id,
                self.subscription.id,
            )
        else:
            contribution.save()
            logger.info(
                "Created new contribution %s for provider_subscription_id %s", contribution.id, self.subscription.id
            )
        return contribution


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
    DEFAULT_GET_CHARGE_EXPAND_FIELDS = ["balance_transaction", "refunds.data.balance_transaction"]

    def __post_init__(self):
        logger.info("Initializing StripeClientForConnectedAccount with account_id %s", self.account_id)

    @rate_limiter(max_requests=STRIPE_SEARCH_MAX_REQUESTS_PER_SECOND)
    def _search(
        self, stripe_object: stripe.Invoice | stripe.PaymentIntent | stripe.Subscription, query: str, **kwargs
    ) -> stripe.Invoice | stripe.PaymentIntent | stripe.Subscription:
        logger.info("Searching for %s with query %s for account %s", stripe_object, query, self.account_id)
        return stripe_object.search(query, **(self._default_stripe_kwargs | kwargs))

    def _do_paginated_search(
        self, stripe_object, query: str
    ) -> list[stripe.Invoice] | list[stripe.PaymentIntent] | list[stripe.Subscription]:
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

    def get_balance_transaction_for_invoice(self, invoice_id: str) -> stripe.BalanceTransaction | None:
        """Gets balance transactions for a given stripe invoice"""
        logger.info("Getting balance transactions for invoice %s for account %s", invoice_id, self.account_id)
        charge = stripe.Charge.retrieve(
            invoice=invoice_id, **self._default_stripe_kwargs, expand=["balance_transaction"]
        )
        return charge.balance_transaction if charge else None

    @rate_limiter(max_requests=STRIPE_DEFAULT_MAX_REQUESTS_PER_SECOND)
    def get_subscription(self, subscription_id: str, **kwargs) -> stripe.Subscription | None:
        logger.info("Getting subscription %s for account %s", subscription_id, self.account_id)
        return stripe.Subscription.retrieve(subscription_id, **(self._default_stripe_kwargs | kwargs))

    def get_payment_intents(self, metadata_query: str = None) -> list[stripe.PaymentIntent]:
        """Gets payment intents for a given stripe account"""
        query_parts = []
        # each subquery can have ANDs or ORs so we surround with parens so we can logically group the results
        if metadata_query:
            query_parts.append(f"({metadata_query})")
        if created_query := self.created_query:
            query_parts.append(f"({created_query})")
        if not query_parts:
            return [x for x in stripe.PaymentIntent.list(**self._default_stripe_kwargs).auto_paging_iter()]
        return self._do_paginated_search(stripe_object=stripe.PaymentIntent, query=" AND ".join(query_parts))

    @property
    def _default_stripe_kwargs(self):
        return {"limit": MAX_STRIPE_RESPONSE_LIMIT, "stripe_account": self._account_id}

    @property
    def revengine_metadata_query(self) -> str:
        """ "String to limit query to entities that have known revengine metadata version

        See https://stripe.com/docs/search#search-syntax for more details on search syntax for metadata
        """
        return " OR ".join([f'metadtata["schema_version"]:"{x}"' for x in self.ALL_METADATA_SCHEMA_VERSIONS])

    def get_revengine_one_time_payment_intents(self) -> list[stripe.PaymentIntent]:
        all_pis = self.get_payment_intents(metadata_query=self.revengine_metadata_query)
        suported_pis = []
        unsupported_pis = []
        for pi in all_pis:
            (
                suported_pis
                if pi.metadata.get("schema_version") in self.SUPPORTED_METADATA_SCHEMA_VERSIONS
                else unsupported_pis
            ).append(pi)
        logger.info(
            "Found %s revengine payment intents and %s unsupported revengine payment intents",
            len(suported_pis),
            len(unsupported_pis),
        )
        return suported_pis

    def get_revengine_subscriptions(self, invoices) -> list[stripe.Subscription]:
        """Given a set of"""
        sub_ids = [x.subscription for x in invoices if x.subscription]
        revengine_subscriptions = []
        _unsupported_revengine_subscriptions = []
        for x in sub_ids:
            if sub := self.get_subscription(x):
                (
                    revengine_subscriptions
                    if sub.metadata.get("schema_version") in self.SUPPORTED_METADATA_SCHEMA_VERSIONS
                    else _unsupported_revengine_subscriptions
                ).append(sub)
        logger.info(
            "Found %s revengine subscriptions and %s unsupported revengine subscriptions",
            len(revengine_subscriptions),
            len(_unsupported_revengine_subscriptions),
        )
        return revengine_subscriptions

    @rate_limiter(max_requests=STRIPE_DEFAULT_MAX_REQUESTS_PER_SECOND)
    def get_expanded_charge_object(self, invoice_id: str) -> stripe.Charge | None:
        """Gets charge, expanding its balance transaction, for a given stripe invoice"""
        logger.info("Getting charge for invoice %s for account %s", invoice_id, self.account_id)
        return stripe.Charge.retrieve(
            invoice=invoice_id, **self._default_stripe_kwargs | {"expand": self.DEFAULT_GET_CHARGE_EXPAND_FIELDS}
        )

    def get_revengine_subscriptions_data(
        self, invoices: list[stripe.Invoice], charges: list[stripe.Charge]
    ) -> list[UntrackedStripeSubscription]:
        """Gets untracked stripe subscriptions data for a given stripe account"""
        logger.info("Getting untracked stripe subscriptions data for account %s", self.account_id)
        revengine_subscriptions = self.get_revengine_subscriptions(invoices)
        data = []
        for sub in revengine_subscriptions:
            invoices = [x for x in invoices if x.subscription == sub.id]
            try:
                data.append(
                    UntrackedStripeSubscription(
                        subscription=sub,
                        invoices=invoices,
                        charges=[x for x in charges if x.invoice in [x.id for x in invoices]],
                    )
                )
            except InvalidMetadataError:
                logger.warning("Unable to sync subscription %s for account %s", sub.id, self.account_id)
        return data

    @rate_limiter(max_requests=STRIPE_DEFAULT_MAX_REQUESTS_PER_SECOND)
    def get_payment_method(self, payment_method_id) -> stripe.PaymentMethod | None:
        return stripe.PaymentMethod.retrieve(payment_method_id, **self._default_stripe_kwargs)

    @rate_limiter(max_requests=STRIPE_DEFAULT_MAX_REQUESTS_PER_SECOND)
    def get_expanded_charge_object(self, charge_id: str) -> stripe.Charge | None:
        """ """
        return stripe.Charge.retrieve(
            charge_id, **self._default_stripe_kwargs, expand=["refunds.data.balance_transaction"]
        )


ProcessUntrackedSubscriptionDict = dict[str, UntrackedStripeSubscription]


@dataclass(frozen=True)
class StripeToRevengineTransformer:
    """Docstring - expected can be called in sync/async context"""

    _STRIPE_ACCOUNTS_QUERY = PaymentProvider.objects.filter(
        provider=PaymentProvider.STRIP, stripe_account_id__isnull=False
    )
    for_orgs: list[str] = None
    for_stripe_accounts: list[str] = None
    # make these timestamps instead so serializable cause may be async
    from_date: datetime.datetime = None
    to_date: datetime.datetime = None
    async_mode: bool = False

    def __post_init__(self):
        logger.info(
            "Initializing StripeToRevengineTransformer with for_orgs %s and for_stripe_accounts %s",
            self.for_orgs,
            self.for_stripe_accounts,
        )
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

    @shared_task(bind=True, autoretry_for=(StripeRateLimitError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
    def backfill_contributions_and_payments_for_stripe_account(
        self, account_id: str, gte_timestamp: int = None, lte_timestamp: int = None
    ) -> None:
        """Great big docstring

        about sync vs. nonsync

        """
        logger.info("Backfilling stripe account %s", account_id)
        recurring_contributions = self.backfill_contributions_and_payments_for_subscriptions(
            stripe_account_id=account_id
        )
        one_time_contributions = self.backfill_contributions_and_payments_for_payment_intents(
            stripe_account_id=account_id
        )
        logger.info(
            "Backfilled %s recurring contributions and %s one-time contributions for stripe account %s",
            len(recurring_contributions),
            len(one_time_contributions),
            account_id,
        )

    def backfill_contributions_and_payments_for_subscriptions(self, stripe_account_id: str) -> list[Contribution]:
        """Upsert contributions, contributors, and payments for subscriptions for a given stripe account."""
        stripe_client = StripeClientForConnectedAccount(account_id=stripe_account_id, gte=self.gte, lte=self.lte)
        # this gets all invoices for the account (given any contraints on query around date, etc.)
        # We start by getting all invoices for the accouunt (and if so configured, results constrainted around date, etc).
        invoices = stripe_client.get_invoices()
        # Now based on the set of all invoices, we need to determine where there are any subscriptions uncaptured by revengine.
        # Subscriptions are not directly attached to invoices, but we can get them from the respective charges.
        # The returned charges have balance transaction and refunds expanded, which will allow us to generate Revengine payments
        charges = [stripe_client.get_expanded_charge_object(x.id) for x in invoices]

        # Based on the set of subscriptions represented by the set of charges, we narrow down to those that are not already in revengine but should
        # be. Calling .get_revengine_subscriptions_data will return a list of UntrackedStripeSubscription objects, which are used to pull together required
        # data for contribution, contributor, and payments, and then upsert them.
        subscriptions_data = stripe_client.get_revengine_subscriptions_data(
            subscription_ids=[x.subscription for x in invoices if x.subscription], charges=charges, invoices=invoices
        )
        contributions = []
        for x in subscriptions_data:
            contributions.append(x.upsert())
        return contributions

    def backfill_contributions_and_payments_for_payment_intents(self, stripe_account_id: str) -> list[Contribution]:
        """Upsert contributions and payments for one-time payment intents for a given stripe account."""
        stripe_client = StripeClientForConnectedAccount(account_id=stripe_account_id, gte=self.gte, lte=self.lte)
        pis = stripe_client.revengine_payment_intents_for_one_time_contributions()
        # get bts and refunds where relevant
        contributions = []
        return contributions

    def backfill_contributions_and_payments_from_stripe(self) -> None:
        """Iterates over stripe accounts class was initialized with and attempts to backfill contributions, contributors, and payments for each account

        If the class was initialized as async, then this method will call the async version of the backfill method for each account.
        """
        logger.info(
            "Backfilling contributions and payments for %s stripe accounts in %s mode",
            len(self.stripe_account_ids),
            "async" if self.async_mode else "sync",
        )
        for account_id in self.stripe_account_ids:
            logger.info("Backfilling contributions and payments for stripe account %s", account_id)
            if self.async_mode:
                self.backfill_contributions_and_payments_for_stripe_account.delay(account_id)
            else:
                self.backfill_contributions_and_payments_for_stripe_account(account_id)
