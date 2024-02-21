import datetime
import logging
from dataclasses import dataclass
from functools import cached_property
from typing import Dict

from django.conf import settings
from django.db import transaction

import reversion
import stripe

from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
    Payment,
)
from apps.contributions.types import cast_metadata_to_stripe_payment_metadata_schema
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


def _upsert_payments_for_charge(
    contribution: Contribution, charge: stripe.Charge, balance_transaction: stripe.BalanceTransaction
) -> None:
    """ """
    logger.info("Upserting payment for contribution %s", contribution.id)

    Payment.objects.update_or_create(
        contribution=contribution,
        stripe_balance_transaction_id=balance_transaction.id,
        defaults={
            "net_amount_paid": balance_transaction.net,
            "gross_amount_paid": balance_transaction.amount,
            "amount_refunded": 0,
            "transaction_time": datetime.datetime.fromtimestamp(
                int(balance_transaction.created), tz=datetime.timezone.utc
            ),
        },
    )
    for refund in charge.refunds.data:
        logger.info("Upserting payment for refund  %s for contribution %s", refund.id, contribution.id)
        Payment.objects.update_or_create(
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


@dataclass(frozen=True)
class StripeClientForConnectedAccount:
    """A wrapper around Stripe library for a connected account.

    Gets initialized with an account id, and when making requests to stripe, that account ID is included as the
    stripe_account parameter.
    """

    account_id: str
    lte: datetime.datetime = None
    gte: datetime.datetime = None

    # See https://stripe.com/docs/search#search-syntax for more details on search syntax for metadata
    REVENGINE_METADATA_QUERY = " OR ".join(
        [f'metadata["schema_version"]:"{x}"' for x in ("1.0", "1.1", "1.2", "1.3", "1.4", "1.5")]
    )
    SUPPORTED_METADATA_SCHEMA_VERSIONS = ("1.4", "1.5")
    DEFAULT_GET_CHARGE_EXPAND_FIELDS = ("balance_transaction", "refunds.data.balance_transaction", "customer")
    DEFAULT_GET_SUBSCRIPTION_EXPAND_FIELDS = ("customer",)
    DEFAULT_GET_CUSTOMER_EXPAND_FIELDS = ("invoice_settings.default_payment_method",)

    def __post_init__(self):
        logger.debug("Initializing StripeClientForConnectedAccount with account_id %s", self.account_id)

    @staticmethod
    def _search(
        stripe_object: stripe.Invoice | stripe.PaymentIntent | stripe.Subscription,
        query: str,
        stripe_account_id: str,
        page: str = None,
    ) -> stripe.Invoice | stripe.PaymentIntent | stripe.Subscription:
        logger.debug("Searching for %s with query %s for account %s", stripe_object, query, stripe_account_id)
        return stripe_object.search(
            query=query, stripe_account=stripe_account_id, limit=MAX_STRIPE_RESPONSE_LIMIT, page=page
        )

    @classmethod
    def do_paginated_search(
        cls, stripe_object, query: str, entity: str, stripe_account_id: str
    ) -> list[stripe.Invoice] | list[stripe.PaymentIntent] | list[stripe.Subscription]:
        """Does a paginated search for a given stripe object and query.

        Note that we have opted to use search API instead of list in this class because search allows us to filter
        by created date range (among other criteria), which is relevant for our immediate use case. The tradeoff
        here is that Stripe's search function in Python library does not provide a convenience method around
        iterating over paginated results. We have to do that ourselves in this method.
        """
        logger.info(
            "Doing paginated search for %s with query %s for account %s", entity, query or "<none>", stripe_account_id
        )
        results = []
        next_page = None
        has_more = True
        while has_more:
            logger.debug(
                "Fetching next page (%s) of %s for account %s", next_page or "<none>", entity, stripe_account_id
            )
            response = cls._search(
                stripe_object=stripe_object, query=query, page=next_page, stripe_account_id=stripe_account_id
            )
            results.extend(response.data)
            has_more = response.has_more
            next_page = response.next_page
        return results

    @property
    def created_query(self) -> str:
        """Generate a string to limit query to entities that have been created within a given date range"""
        query_parts = []
        if self.gte:
            query_parts.append(f"created >= {self.gte.timestamp()}")
        if self.lte:
            query_parts.append(f"created <= {self.lte.timestamp()}")
        return " AND ".join(query_parts)

    def get_invoices(self) -> list[stripe.Invoice]:
        """Gets invoices for a given stripe account"""
        logger.debug("Getting invoices for account %s", self.account_id)
        # need a query for search, if none, then we just do invoices list to retrieve all invoices
        if not (query := self.created_query):
            logger.debug("No query to filter by so getting all invoices for account %s", self.account_id)
            return [
                x
                for x in stripe.Invoice.list(
                    stripe_account=self.account_id, limit=MAX_STRIPE_RESPONSE_LIMIT
                ).auto_paging_iter()
            ]
        return self.do_paginated_search(
            stripe_object=stripe.Invoice, query=query, entity="invoices", stripe_account_id=self.account_id
        )

    def get_payment_intents(self, metadata_query: str = None) -> list[stripe.PaymentIntent]:
        """Gets payment intents for a given stripe account"""
        logger.debug("Getting payment intents for account %s", self.account_id)
        query_parts = []
        # each subquery can have ANDs or ORs so we surround with parens so we can logically group the results
        if metadata_query:
            query_parts.append(metadata_query)
        if created_query := self.created_query:
            query_parts.append(created_query)
        if not query_parts:
            return [
                x
                for x in stripe.PaymentIntent.list(
                    stripe_account=self.account_id, limit=MAX_STRIPE_RESPONSE_LIMIT
                ).auto_paging_iter()
            ]
        return self.do_paginated_search(
            stripe_object=stripe.PaymentIntent,
            query=" AND ".join(query_parts),
            entity="payment intents",
            stripe_account_id=self.account_id,
        )

    @staticmethod
    def is_for_one_time_contribution(pi: stripe.PaymentIntent, invoice: stripe.Invoice | None) -> bool:
        """Determines if a given stripe payment intent is for a one time contribution"""
        logger.debug("Determining if payment intent %s is for a one time contribution", pi.id)
        if not pi.invoice:
            return True
        if invoice and invoice.subscription:
            return False
        return True

    def get_revengine_one_time_payment_intents_and_charges(self) -> list[Dict[str, str]]:
        """Get a set of stripe PaymentIntent objects and their respective charges for one time payments for a given Stripe account"""
        logger.info("Getting revengine one time payment intents and charges for account %s", self.account_id)
        # this gets all PIs for the account, factoring in any limits around created date and metadata
        pis = self.get_payment_intents(metadata_query=self.REVENGINE_METADATA_QUERY)
        logger.info("Found %s revengine payment intents for account %s", len(pis), self.account_id)
        one_time_pis_and_charges = []
        for x in pis:
            # need to determine if it's a one-time contribution or not
            # also will need to be able to pass balance contribution later when we upsert payments
            charge_id = x.charges.data[0].id if x.charges.total_count == 1 else None
            invoice = self.get_invoice(invoice_id=x.invoice, stripe_account_id=self.account_id) if x.invoice else None
            if self.is_for_one_time_contribution(pi=x, invoice=invoice):
                logger.debug("Payment intent %s is for a one time contribution. Getting charge data.", x.id)
                one_time_pis_and_charges.append(
                    {
                        "payment_intent": x,
                        "charge": (
                            self.get_expanded_charge_object(charge_id=charge_id, stripe_account_id=self.account_id)
                            if charge_id
                            else None
                        ),
                    }
                )

        supported = []
        unsupported = []
        for x in one_time_pis_and_charges:
            (
                supported
                if x["payment_intent"].metadata.get("schema_version") in self.SUPPORTED_METADATA_SCHEMA_VERSIONS
                else unsupported
            ).append(x)
        logger.info(
            "Found %s supported revengine payment intents and %s unsupported revengine payment intents",
            len(supported),
            len(unsupported),
        )
        return supported

    def get_revengine_subscriptions(self, invoices) -> list[stripe.Subscription]:
        """Given a set of invoices, retrieve a set of subscriptions that should be synced to revengine."""
        logger.info("Getting revengine subscriptions for account %s", self.account_id)
        sub_ids = [x.subscription for x in invoices if x.subscription]
        revengine_subscriptions = []
        _unsupported_revengine_subscriptions = []
        for x in sub_ids:
            if sub := self.get_subscription(subscription_id=x, stripe_account_id=self.account_id):
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

    def get_revengine_subscriptions_data(
        self, invoices: list[stripe.Invoice], charges: list[stripe.Charge]
    ) -> list["UntrackedStripeSubscription"]:
        """Generate a list of UntrackedStripeSubscription objects for a given stripe account.

        This list is generated by retrieving a larger set of subscriptions (and related charges and invoices),
        then whittling it down to instances representing untracked recurring contributions that adhere to a supported
        Stripe payment metadata schema version.
        """
        logger.info("Getting untracked stripe subscriptions data for account %s", self.account_id)
        revengine_subscriptions = self.get_revengine_subscriptions(invoices)
        data = []
        for sub in revengine_subscriptions:
            invoices = [x for x in invoices if x.subscription == sub.id]
            try:
                data.append(
                    UntrackedStripeSubscription(
                        subscription=sub,
                        charges=[x for x in charges if x.invoice in [x.id for x in invoices]],
                    )
                )
            except InvalidMetadataError:
                logger.warning("Unable to sync subscription %s for account %s", sub.id, self.account_id)
        return data

    def get_revengine_one_time_contributions_data(self) -> list["UntrackedOneTimePaymentIntent"]:
        """Generate a list of UntrackedOneTimePaymentIntent objects for a given stripe account.

        The list is generated by retrieving a larger set of payment intents, then whittling it down
        to the ones that are untracked and that adhere to a supported Stripe payment metadata schema version.
        """
        logger.info("Getting untracked one time payment intents for account %s", self.account_id)
        payment_intents_and_charges = self.get_revengine_one_time_payment_intents_and_charges()
        data = []
        for x in payment_intents_and_charges:
            try:
                data.append(
                    UntrackedOneTimePaymentIntent(
                        payment_intent=(pi := x["payment_intent"]),
                        charge=x["charge"],
                    )
                )
            except (InvalidMetadataError, ValueError) as exc:
                logger.warning("Unable to sync payment intent %s for account %s", pi.id, self.account_id, exc_info=exc)
        return data

    @staticmethod
    def get_stripe_entity(entity_id: str, stripe_entity_name: str, stripe_account_id: str, **kwargs):
        """Retrieve a stripe entity for a given stripe account"""
        logger.debug("Getting %s %s for account %s", stripe_entity_name, entity_id, stripe_account_id)
        try:
            return getattr(stripe, stripe_entity_name).retrieve(entity_id, stripe_account=stripe_account_id, **kwargs)
        except stripe.error.InvalidRequestError as exc:
            logger.warning(
                "Unable to retrieve %s %s for account %s",
                stripe_entity_name,
                entity_id,
                stripe_account_id,
                exc_info=exc,
            )
            return None

    @classmethod
    def get_payment_method(
        cls, payment_method_id: str, stripe_account_id: str, **kwargs
    ) -> stripe.PaymentMethod | None:
        """Retrieve a payment method for a given stripe account"""
        return cls.get_stripe_entity(payment_method_id, "PaymentMethod", stripe_account_id, **kwargs)

    @classmethod
    def get_stripe_customer(cls, customer_id: str, stripe_account_id: str, **kwargs) -> stripe.Customer | None:
        """Retrieve a stripe customer for a given stripe account"""
        return cls.get_stripe_entity(
            customer_id, "Customer", stripe_account_id, expand=cls.DEFAULT_GET_CUSTOMER_EXPAND_FIELDS, **kwargs
        )

    @classmethod
    def get_stripe_event(cls, event_id: str, stripe_account_id: str, **kwargs) -> stripe.Event | None:
        """Retrieve a stripe event for a given stripe account"""
        return cls.get_stripe_entity(event_id, "Event", stripe_account_id, **kwargs)

    @classmethod
    def get_subscription(cls, subscription_id: str, stripe_account_id: str, **kwargs) -> stripe.Subscription | None:
        """Retrieve a stripe subscription for a given stripe account"""
        return cls.get_stripe_entity(
            subscription_id,
            "Subscription",
            stripe_account_id,
            expand=cls.DEFAULT_GET_SUBSCRIPTION_EXPAND_FIELDS,
            **kwargs,
        )

    @classmethod
    def get_invoice(self, invoice_id: str, stripe_account_id: str, **kwargs) -> stripe.Invoice | None:
        """Retrieve a stripe invoice for a given stripe account"""
        return self.get_stripe_entity(invoice_id, "Invoice", stripe_account_id, **kwargs)

    @classmethod
    def get_expanded_charge_object(cls, charge_id: str, stripe_account_id: str, **kwargs) -> stripe.Charge | None:
        """Retrieve a Stripe charge, given an invoice id."""
        return cls.get_stripe_entity(
            charge_id,
            "Charge",
            stripe_account_id=stripe_account_id,
            expand=cls.DEFAULT_GET_CHARGE_EXPAND_FIELDS,
            **kwargs,
        )


# TODO - rename this so not refelect "Untracked" as that's not really relevant -- it upserts and should be idempotent.
# maybe StripeOneTimePaymentIntentSyncer or something like that?
class UntrackedOneTimePaymentIntent:
    """Convenience class used to upsert contribution, contributor, and (optionally) payments for a given Stripe payment intent.

    Note that in the init method, we raise an exception if the metadata is invalid or if there is > 1 charge associated with the PI.
    """

    def __init__(self, payment_intent: stripe.PaymentIntent, charge: stripe.Charge):
        """NB: The charge is expected to have its balance_transaction, refunds, and customer properties expanded."""
        try:
            cast_metadata_to_stripe_payment_metadata_schema(payment_intent.metadata)
        except ValueError as exc:
            raise InvalidMetadataError(f"Metadata is invalid for payment_intent : {payment_intent.id}") from exc

        if payment_intent.charges.total_count > 1:
            raise ValueError(f"Payment intent {payment_intent.id} has more than one charge")
        self.payment_intent = payment_intent
        self.charge = charge

    def __str__(self) -> str:
        return f"UntrackedOneTimePaymentIntent {self.payment_intent.id}"

    @cached_property
    def customer(self) -> stripe.Customer | None:
        """Gets the customer associated with the payment intent or related charge

        The source for this could be the charge or the PI. We prefer the former when present.
        """
        if charge := self.charge:
            if cust := charge.customer:
                if isinstance(cust, str):
                    return StripeClientForConnectedAccount.get_stripe_customer(
                        customer_id=cust, stripe_account_id=self.payment_intent.stripe_account
                    )
                else:
                    return cust
        if cust := self.payment_intent.customer:
            if isinstance(cust, str):
                return StripeClientForConnectedAccount.get_stripe_customer(
                    customer_id=cust, stripe_account_id=self.payment_intent.stripe_account
                )
            else:
                return cust
        return None

    @property
    def email_id(self) -> str | None:
        return self.customer.email if self.customer else None

    @property
    def refunded(self) -> bool:
        """For a contribution to be considered as refunded either refunded flag will be set for full refunds
        or amount_refunded will be > 0 (will be useful in case of partial refund and we still want to set
        the status as refunded)
        https://stripe.com/docs/api/charges/object#charge_object-refunded
        https://stripe.com/docs/api/charges/object#charge_object-amount_refunded
        """
        return bool(
            next(
                (
                    charge
                    for charge in self.payment_intent.charges.data
                    if charge.refunded or charge.amount_refunded > 0
                ),
                False,
            )
        )

    @property
    def status(self) -> ContributionStatus:
        if self.refunded:
            return ContributionStatus.REFUNDED
        if self.payment_intent.status == "succeeded":
            return ContributionStatus.PAID
        if self.payment_intent.status == "canceled":
            return ContributionStatus.CANCELED
        # We'll use processing as catch all. Concretrely, this would mean not refunded and one of other PI statuses of
        # requires_payment_method, requires_confirmation, requires_action, processing, requires_capture
        else:
            return ContributionStatus.PROCESSING

    @cached_property
    def payment_method(self) -> stripe.PaymentMethod | None:
        """The payment method associated with the payment intent. We prefer the charge's payment method if present,
        but if not, we try getting from Stripe customer"""
        if default_pm := self.payment_intent.payment_method:
            return (
                StripeClientForConnectedAccount.get_payment_method(
                    payment_method_id=default_pm, stripe_account_id=self.payment_intent.stripe_account
                )
                if isinstance(default_pm, str)
                else default_pm
            )
        if customer := self.customer:
            return customer.invoice_settings.default_payment_method if customer.invoice_settings else None
        return None

    @transaction.atomic
    def upsert(self) -> Contribution:
        """Upsert a contribution, contributor, and payments for a given Stripe payment intent.

        If the payment intent has a charge associated, we'll upsert a payment.

        If that charge has any refunds associated with it, we'll upsert those as payments as well.
        """
        logger.info("Upserting untracked payment intent %s", self.payment_intent.id)
        existing = Contribution.objects.filter(provider_payment_id=self.payment_intent.id).first()
        if not (email := self.email_id):
            raise ValueError(f"Payment intent {self.payment_intent.id} has no email associated with it")
        contributor, _ = Contributor.objects.get_or_create(email=email)
        pm = self.payment_method
        defaults = {
            "amount": self.payment_intent.amount,
            "currency": self.payment_intent.currency,
            "reason": self.payment_intent.metadata.get("reason_for_giving", ""),
            "interval": ContributionInterval.ONE_TIME,
            "payment_provider_used": "stripe",
            "provider_customer_id": self.customer.id,
            "provider_payment_method_id": pm.id if pm else None,
            "provider_payment_method_details": pm.to_dict() if pm else None,
            "status": self.status,
            "contributor": contributor,
            "contribution_metadata": self.payment_intent.metadata,
        }
        if existing:
            for k, v in defaults.items():
                setattr(existing, k, v)
            contribution = existing
            with reversion.create_revision():
                contribution.save(update_fields=set(list(defaults.keys()) + ["modified"]))
                reversion.set_comment("UntrackedOneTimePaymentIntent.upsert updated existing contribution")
        else:
            contribution = Contribution(**defaults | {"provider_payment_id": self.payment_intent.id})

        _upsert_payments_for_charge(contribution, self.charge, self.charge.balance_transaction)
        return contribution


class UntrackedStripeSubscription:
    """Convenience class used to upsert contribution, contributor, and (optionally) payments for a given Stripe subscription.

    Note that in the init method, we raise an exception if the metadata is invalid.
    """

    def __init__(self, subscription: stripe.Subscription, charges: list[stripe.Charge]):
        try:
            cast_metadata_to_stripe_payment_metadata_schema(subscription.metadata)
        except ValueError as exc:
            raise InvalidMetadataError(f"Metadata is invalid for subscription : {subscription.id}") from exc
        self.subscription = subscription
        self.charges = charges

    def __str__(self) -> str:
        return f"UntrackedStripeSubscription {self.subscription.id}"

    @property
    def status(self) -> ContributionStatus:
        match self.subscription.status:
            # In revengine terms, we conflate active and past due because we don't have an internal status
            # for past due, and paid is closest given current statuses
            case "active" | "past_due":
                return ContributionStatus.PAID
            # happens after time period for incomplete, when expired no longer can be charged
            case "incomplete_expired":
                return ContributionStatus.FAILED
            case "canceled":
                return ContributionStatus.CANCELED
            # in practice, this would happen for incomplete and trialing
            case _:
                return ContributionStatus.PROCESSING

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
        # subscription populating self is expected to have customer property expanded
        return self.subscription.customer.email if self.subscription.customer else None

    @cached_property
    def payment_method(self) -> stripe.PaymentMethod | None:
        """The payment method associated with the subscription. We prefer default payment method on sub if present,

        but if not, we try getting from Stripe customer"""
        if default_pm := self.subscription.default_payment_method:
            return (
                StripeClientForConnectedAccount.get_payment_method(
                    payment_method_id=default_pm, stripe_account_id=self.subscription.stripe_account
                )
                if isinstance(default_pm, str)
                else default_pm
            )
        if customer := self.subscription.customer:
            # need to re-retrieve because we don't have the expand fields on the customer object
            customer = StripeClientForConnectedAccount.get_stripe_customer(
                customer_id=customer.id, stripe_account_id=self.subscription.stripe_account
            )
            return customer.invoice_settings.default_payment_method if customer and customer.invoice_settings else None
        return None

    @transaction.atomic
    def upsert(self) -> Contribution:
        """Upsert contribution, contributor and payments for given Stripe subscription"""
        logger.info("Upserting untracked subscription %s", self.subscription.id)
        if not (email := self.email_id):
            raise ValueError(f"Subscription {self.subscription.id} has no email associated with it")

        # we don't use get_or_create here because of nuance around reversion comments
        existing = Contribution.objects.filter(provider_subscription_id=self.subscription.id).first()
        contributor, _ = Contributor.objects.get_or_create(email=email)
        pm = self.payment_method
        defaults = {
            "amount": self.subscription.plan.amount,
            "currency": self.subscription.plan.currency,
            # should be guaranteed that metadata is present at this point, given init
            "reason": self.subscription.metadata.get("reason_for_giving", ""),
            "interval": self.interval,
            "payment_provider_used": "stripe",
            "provider_customer_id": self.subscription.customer.id,
            "provider_payment_method_id": pm.id if pm else None,
            "provider_payment_method_details": pm.to_dict() if pm else None,
            "contributor": contributor,
            "contribution_metadata": self.subscription.metadata,
            "status": self.status,
        }

        if existing:
            for k, v in defaults.items():
                setattr(existing, k, v)
            contribution = existing
            with reversion.create_revision():
                contribution.save(update_fields=set(list(defaults.keys()) + ["modified"]))
                reversion.set_comment("UntrackedStripeSubscription updated existing contribution")
            logger.info(
                "Updated existing contribution %s for provider_subscription_id %s",
                contribution.id,
                self.subscription.id,
            )
        else:
            contribution = Contribution.objects.create(**defaults | {"provider_subscription_id": self.subscription.id})
            logger.info(
                "Created new contribution %s for provider_subscription_id %s", contribution.id, self.subscription.id
            )

        for charge in self.charges:
            _upsert_payments_for_charge(contribution, charge, charge.balance_transaction)

        return contribution


@dataclass
class StripeToRevengineTransformer:
    """Docstring - expected can be called in sync/async context"""

    _STRIPE_ACCOUNTS_QUERY = PaymentProvider.objects.filter(stripe_account_id__isnull=False)
    for_orgs: list[str] = None
    for_stripe_accounts: list[str] = None
    # make these timestamps instead so serializable cause may be async
    from_date: datetime.datetime = None
    to_date: datetime.datetime = None

    def __post_init__(self):
        logger.info(
            "Initializing StripeToRevengineTransformer with for_orgs %s and for_stripe_accounts %s",
            self.for_orgs,
            self.for_stripe_accounts,
        )
        kwargs = {}
        if self.for_orgs:
            kwargs["revenueprogram__organization__id__in"] = self.for_orgs
        if self.for_stripe_accounts:
            kwargs["stripe_account_id__in"] = self.for_stripe_accounts
        if kwargs:
            self._STRIPE_ACCOUNTS_QUERY = self._STRIPE_ACCOUNTS_QUERY.filter(**kwargs)

    @property
    def stripe_account_ids(self):
        return list(self._STRIPE_ACCOUNTS_QUERY.values_list("stripe_account_id", flat=True))

    def backfill_contributions_and_payments_for_stripe_account(self, account_id: str) -> None:
        """This method is responsible for upserting contributions, contributions, and payments for a given stripe account."""
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
        stripe_client = StripeClientForConnectedAccount(
            account_id=stripe_account_id, gte=self.from_date, lte=self.to_date
        )
        # this gets all invoices for the account (given any contraints on query around date, etc.)
        # We start by getting all invoices for the accouunt (and if so configured, results constrainted around date, etc).
        invoices = stripe_client.get_invoices()
        # Now based on the set of all invoices, we need to determine where there are any subscriptions uncaptured by revengine.
        # Subscriptions are not directly attached to invoices, but we can get them from the respective charges.
        # The returned charges have balance transaction and refunds expanded, which will allow us to generate Revengine payments
        charges = [stripe_client.get_expanded_charge_object(charge_id=x.charge) for x in invoices if x.charge]

        # Based on the set of subscriptions represented by the set of charges, we narrow down to those that are not already in revengine but should
        # be. Calling .get_revengine_subscriptions_data will return a list of UntrackedStripeSubscription objects, which are used to pull together required
        # data for contribution, contributor, and payments, and then upsert them.
        subscriptions_data = stripe_client.get_revengine_subscriptions_data(charges=charges, invoices=invoices)
        contributions = []
        for x in subscriptions_data:
            try:
                contributions.append(x.upsert())
            except ValueError as exc:
                logger.warning("Unable to upsert subscription %s", x.subscription.id, exc_info=exc)
        return contributions

    def backfill_contributions_and_payments_for_payment_intents(self, stripe_account_id: str) -> list[Contribution]:
        """Upsert contributions and payments for one-time payment intents for a given stripe account."""
        stripe_client = StripeClientForConnectedAccount(
            account_id=stripe_account_id, gte=self.from_date, lte=self.to_date
        )
        results = []
        for x in stripe_client.get_revengine_one_time_contributions_data():
            try:
                results.append(x.upsert())
            except ValueError as exc:
                logger.warning("Unable to upsert payment intent %s", x.payment_intent.id, exc_info=exc)
        return results

    def backfill_contributions_and_payments_from_stripe(self) -> None:
        """Iterates over stripe accounts that the class was initialized with and attempts to backfill contributions,

        contributors, and payments for each account. If the class was initialized as async, then this method will call
        the async version of the backfill method for each account.
        """
        logger.info(
            "Backfilling contributions and payments for %s stripe accounts",
            len(self.stripe_account_ids),
        )
        for account_id in self.stripe_account_ids:
            logger.info("Backfilling contributions and payments for stripe account %s", account_id)
            self.backfill_contributions_and_payments_for_stripe_account(account_id)


@dataclass
class StripeEventSyncer:
    """ """

    event_id: str
    stripe_account_id: str
    async_mode: bool = False

    def __post_init__(self):
        self.client = StripeClientForConnectedAccount(account_id=self.stripe_account_id)

    def get_event(self) -> stripe.Event | None:
        """Gets a stripe event for a given event id and stripe account id."""
        return self.client.get_stripe_event(event_id=self.event_id, stripe_account_id=self.stripe_account_id)

    def sync(self) -> None:
        from .tasks import process_stripe_webhook_task

        if not (event := self.get_event()):
            logger.warning("No event found for event id %s", self.event_id)
            return
        if event.type not in settings.STRIPE_WEBHOOK_EVENTS_CONTRIBUTIONS:
            logger.warning("Event type %s is not supported", event.type)
            return

        (
            process_stripe_webhook_task.delay(raw_event_data=event)
            if self.async_mode
            else process_stripe_webhook_task(raw_event_data=event)
        )
