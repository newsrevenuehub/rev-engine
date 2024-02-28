import datetime
import logging
from dataclasses import dataclass
from functools import cached_property
from typing import Dict

from django.conf import settings
from django.db import transaction

import stripe

from apps.common.utils import upsert_with_diff_check
from apps.contributions.exceptions import (
    InvalidIntervalError,
    InvalidMetadataError,
    InvalidStripeTransactionDataError,
)
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
    Payment,
)
from apps.contributions.types import (
    STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS,
    cast_metadata_to_stripe_payment_metadata_schema,
)
from apps.organizations.models import PaymentProvider


MAX_STRIPE_RESPONSE_LIMIT = 100

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def upsert_payments_for_charge(
    contribution: Contribution, charge: stripe.Charge, balance_transaction: stripe.BalanceTransaction
) -> None:
    """Create payments for any charge and refunds associated with a given stripe charge."""
    logger.debug("Upserting payment for contribution %s", contribution.id)

    payment, created, updated = upsert_with_diff_check(
        model=Payment,
        unique_identifier={"contribution": contribution, "stripe_balance_transaction_id": balance_transaction.id},
        defaults={
            "net_amount_paid": balance_transaction.net,
            "gross_amount_paid": balance_transaction.amount,
            "amount_refunded": 0,
            "transaction_time": datetime.datetime.fromtimestamp(
                int(balance_transaction.created), tz=datetime.timezone.utc
            ),
        },
        caller_name="upsert_payments_for_charge",
    )
    if created:
        logger.info("Created payment %s for contribution %s", payment.id, contribution.id)
    elif updated:
        logger.info("Updated payment %s for contribution %s", payment.id, contribution.id)
    for refund in charge.refunds.data:
        logger.debug("Upserting payment for refund  %s for contribution %s", refund.id, contribution.id)
        payment, created, updated = upsert_with_diff_check(
            model=Payment,
            unique_identifier={
                "contribution": contribution,
                "stripe_balance_transaction_id": refund.balance_transaction.id,
            },
            defaults={
                "net_amount_paid": 0,
                "gross_amount_paid": 0,
                "amount_refunded": refund.amount,
                "transaction_time": datetime.datetime.fromtimestamp(
                    int(refund.balance_transaction.created), tz=datetime.timezone.utc
                ),
            },
            caller_name="upsert_payments_for_charge",
        )
        if created:
            logger.info("Created payment %s for refund %s for contribution %s", payment.id, refund.id, contribution.id)
        if updated:
            logger.info("Updated payment %s for refund %s for contribution %s", payment.id, refund.id, contribution.id)


@dataclass(frozen=True)
class StripeClientForConnectedAccount:
    """A wrapper around Stripe library for a connected account.

    Gets initialized with an account id, and when making requests to stripe, that account ID is included as the
    stripe_account parameter.
    """

    account_id: str
    lte: datetime.datetime = None
    gte: datetime.datetime = None

    DEFAULT_GET_CHARGE_EXPAND_FIELDS = ("balance_transaction", "refunds.data.balance_transaction", "customer")
    DEFAULT_GET_SUBSCRIPTION_EXPAND_FIELDS = ("customer",)
    DEFAULT_GET_CUSTOMER_EXPAND_FIELDS = ("invoice_settings.default_payment_method",)

    def __post_init__(self):
        logger.debug("Initializing StripeClientForConnectedAccount with account_id %s", self.account_id)

    @property
    def created_query(self) -> dict:
        """Generates a query that can supplied for "created" param when listing stripe resources"""
        return {k: v for k, v in {"gte": self.gte, "lte": self.lte}.items() if v}

    def get_invoices(self) -> list[stripe.Invoice]:
        """Gets invoices for a given stripe account"""
        logger.debug("Getting invoices for account %s", self.account_id)
        return [
            x
            for x in stripe.Invoice.list(
                stripe_account=self.account_id, limit=MAX_STRIPE_RESPONSE_LIMIT, created=self.created_query
            ).auto_paging_iter()
        ]

    def get_payment_intents(self) -> list[stripe.PaymentIntent]:
        """Gets payment intents for a given stripe account

        NB: This method only lets through payment intents that have a supported schema version.
        """
        logger.debug("Getting payment intents for account %s", self.account_id)
        pis = [
            x
            for x in stripe.PaymentIntent.list(
                stripe_account=self.account_id, limit=MAX_STRIPE_RESPONSE_LIMIT, created=self.created_query
            ).auto_paging_iter()
        ]
        return [x for x in pis if x.metadata.get("schema_version") in STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS]

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
        """Get a set of stripe PaymentIntent objects and their respective charges for one-time payments for a given Stripe account"""
        logger.info("Getting revengine one time payment intents and charges for account %s", self.account_id)
        # this gets all PIs for the account, factoring in any limits around created date and metadata
        pis = self.get_payment_intents()
        logger.info(
            "Found %s revengine payment intents for one-time contributions for account %s", len(pis), self.account_id
        )
        one_time_pis_and_charges = []
        for x in pis:
            charges = [y.id for y in x.charges.data if y.status != "failed"]
            if len(charges) > 1:
                logger.warning(
                    "Payment intent %s has more than one successful or pending charge so cannot be processed: %s",
                    x.id,
                    ", ".join(charges),
                )
                continue
            invoice = self.get_invoice(invoice_id=x.invoice, stripe_account_id=self.account_id) if x.invoice else None
            if self.is_for_one_time_contribution(pi=x, invoice=invoice):
                logger.debug("Payment intent %s is for a one time contribution. Getting charge data.", x.id)
                one_time_pis_and_charges.append(
                    {
                        "payment_intent": x,
                        "charge": (
                            self.get_expanded_charge_object(charge_id=charges[0], stripe_account_id=self.account_id)
                            if len(charges) == 1
                            else None
                        ),
                    }
                )
        return one_time_pis_and_charges

    def get_revengine_subscriptions(self, invoices) -> list[stripe.Subscription]:
        """Given a set of invoices, retrieve a set of subscriptions that should be synced to revengine."""
        logger.info("Getting revengine subscriptions for account %s", self.account_id)
        sub_ids = [x.subscription for x in invoices if x.subscription]
        results = []
        for x in sub_ids:
            if sub := self.get_subscription(subscription_id=x, stripe_account_id=self.account_id):
                results.append(sub)
        return results

    def get_revengine_subscriptions_data(
        self, invoices: list[stripe.Invoice], charges: list[stripe.Charge]
    ) -> list["SubscriptionForRecurringContribution"]:
        """Generate a list of SubscriptionForRecurringContribution objects for a given stripe account.

        This list is generated by retrieving a larger set of subscriptions (and related charges and invoices),
        then whittling it down to instances representing untracked recurring contributions that adhere to a supported
        Stripe payment metadata schema version.
        """
        logger.debug("Getting untracked stripe subscriptions data for account %s", self.account_id)
        revengine_subscriptions = self.get_revengine_subscriptions(invoices)
        data = []
        for sub in revengine_subscriptions:
            invoices = [x for x in invoices if x.subscription == sub.id]
            try:
                data.append(
                    SubscriptionForRecurringContribution(
                        subscription=sub,
                        charges=[x for x in charges if x.invoice in [x.id for x in invoices]],
                    )
                )
            except InvalidMetadataError:
                logger.warning(
                    "Unable to sync subscription %s for account %s because metadata did not validate",
                    sub.id,
                    self.account_id,
                )
        return data

    def get_revengine_one_time_contributions_data(self) -> list["PaymentIntentForOneTimeContribution"]:
        """Generate a list of PaymentIntentForOneTimeContribution objects for a given stripe account.

        The list is generated by retrieving a larger set of payment intents, then whittling it down
        to the ones that are untracked and that adhere to a supported Stripe payment metadata schema version.
        """
        logger.debug("Getting untracked one time payment intents for account %s", self.account_id)
        payment_intents_and_charges = self.get_revengine_one_time_payment_intents_and_charges()
        data = []
        for x in payment_intents_and_charges:
            try:
                data.append(
                    PaymentIntentForOneTimeContribution(
                        payment_intent=(pi := x["payment_intent"]),
                        charge=x["charge"],
                    )
                )
            except (InvalidMetadataError, InvalidStripeTransactionDataError) as exc:
                logger.warning("Unable to sync payment intent %s for account %s", pi.id, self.account_id, exc_info=exc)
        return data

    @staticmethod
    def get_stripe_entity(entity_id: str, stripe_entity_name: str, stripe_account_id: str, **kwargs):
        """Retrieve a stripe entity for a given stripe account"""
        logger.debug("Getting %s %s for account %s", stripe_entity_name, entity_id, stripe_account_id)
        try:
            return getattr(stripe, stripe_entity_name).retrieve(entity_id, stripe_account=stripe_account_id, **kwargs)
        except stripe.error.StripeError as exc:
            logger.warning(
                "Unable to retrieve %s %s for account %s",
                stripe_entity_name,
                entity_id,
                stripe_account_id,
                exc_info=exc,
            )

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
    def get_invoice(cls, invoice_id: str, stripe_account_id: str, **kwargs) -> stripe.Invoice | None:
        """Retrieve a stripe invoice for a given stripe account"""
        return cls.get_stripe_entity(invoice_id, "Invoice", stripe_account_id, **kwargs)

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


class PaymentIntentForOneTimeContribution:
    """Convenience class used to upsert contribution, contributor, and payments for a given Stripe payment intent.

    Note that in the init method, we raise an exception if the metadata is invalid or if there is > 1 charge associated with the PI.
    """

    def __init__(self, payment_intent: stripe.PaymentIntent, charge: stripe.Charge):
        """NB: The charge is expected to have its balance_transaction, refunds, and customer properties expanded."""
        # This will raise an `InvalidMetadataError` if the metadata is invalid, which we expect calling context to manage
        cast_metadata_to_stripe_payment_metadata_schema(payment_intent.metadata)
        self.payment_intent = payment_intent
        self.charge = charge

    def __str__(self) -> str:
        return f"PaymentIntentForOneTimeContribution {self.payment_intent.id}"

    @cached_property
    def customer(self) -> stripe.Customer | None:
        """Gets the customer associated with the payment intent or related charge

        The source for this could be the charge or the PI. We prefer the former when present.
        """
        cust = None
        if charge := self.charge:
            cust = charge.customer
        if not cust:
            cust = self.payment_intent.customer
        if isinstance(cust, str):
            return StripeClientForConnectedAccount.get_stripe_customer(
                customer_id=cust, stripe_account_id=self.payment_intent.stripe_account
            )
        elif isinstance(cust, stripe.Customer):
            return cust
        else:
            logger.warning(
                "Unable to get customer for payment intent %s because unexpected customer type encountered %s",
                self.payment_intent.id,
                type(cust),
            )

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
        return any((x.refunded or x.amount_refunded > 0) for x in self.payment_intent.charges.data)

    @property
    def status(self) -> ContributionStatus:
        """Map Stripe payment intent status to Revengine contribution status."""
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

    @transaction.atomic
    def upsert(self) -> (Contribution, bool, bool):
        """Upsert a contribution, contributor, and payments for a given Stripe payment intent.

        If the payment intent has a charge associated, we'll upsert a payment.

        If that charge has any refunds associated with it, we'll upsert those as payments as well.
        """
        logger.debug("Upserting untracked payment intent %s", self.payment_intent.id)
        if not (email := self.email_id):
            raise InvalidStripeTransactionDataError(
                f"Payment intent {self.payment_intent.id} has no email associated with it"
            )
        contributor, created = Contributor.objects.get_or_create(email=email)
        if created:
            logger.info("Created new contributor %s for payment intent %s", contributor.id, self.payment_intent.id)
        pm = self.payment_method
        contribution, created, updated = upsert_with_diff_check(
            model=Contribution,
            unique_identifier={"provider_payment_id": self.payment_intent.id},
            defaults={
                "amount": self.payment_intent.amount,
                "currency": self.payment_intent.currency,
                "reason": self.payment_intent.metadata.get("reason_for_giving", ""),
                "interval": ContributionInterval.ONE_TIME,
                "payment_provider_used": "stripe",
                "provider_customer_id": self.customer.id if self.customer else None,
                "provider_payment_method_id": pm.id if pm else None,
                "provider_payment_method_details": pm.to_dict() if pm else None,
                "status": self.status,
                "contributor": contributor,
                "contribution_metadata": self.payment_intent.metadata,
            },
            caller_name="PaymentIntentForOneTimeContribution.upsert",
        )
        if created:
            logger.info("Created new contribution %s for payment intent %s", contribution.id, self.payment_intent.id)
        if updated:
            logger.info(
                "Updated existing contribution %s for payment intent %s",
                contribution.id,
                contribution.provider_payment_id,
            )

        if not (charge := self.charge):
            logger.debug(
                "Can't upsert payments for contribution %s with payment intent %s because no charge",
                contribution.id,
                self.payment_intent.id,
            )
        elif charge.balance_transaction:
            upsert_payments_for_charge(contribution, charge, charge.balance_transaction)
        else:
            logger.warning(
                "Can't upsert payments for contribution %s with charge %s because the charge does not have a balance transaction",
                contribution.id,
                charge.id,
            )
        return contribution, created, updated


class SubscriptionForRecurringContribution:
    """Convenience class used to upsert contribution, contributor, and (optionally) payments for a given Stripe subscription.

    Note that in the init method, we raise an exception if the metadata is invalid.
    """

    def __init__(self, subscription: stripe.Subscription, charges: list[stripe.Charge]):
        # This will raise an `InvalidMetadataError` if the metadata is invalid, which we expect calling context to manage
        cast_metadata_to_stripe_payment_metadata_schema(subscription.metadata)
        self.subscription = subscription
        self.charges = charges

    def __str__(self) -> str:
        return f"SubscriptionForRecurringContribution {self.subscription.id}"

    @property
    def status(self) -> ContributionStatus:
        """Map Stripe subscription status to Revengine contribution status."""
        match self.subscription.status:
            # TODO: [DEV-4506] Look into inconsistencies between Stripe subscription statuses and Revengine contribution statuses
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
        """Map Stripe subscription interval to Revengine contribution interval"""
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
        return getattr(self.subscription.customer, "email", None) if self.subscription.customer else None

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

    @transaction.atomic
    def upsert(self) -> (Contribution, bool, bool):
        """Upsert contribution, contributor and payments for given Stripe subscription

        NB: Fields are only updated in case of existing contribution if they have changed.
        """
        logger.debug("Upserting untracked subscription %s", self.subscription.id)
        if not (email := self.email_id):
            raise InvalidStripeTransactionDataError(
                f"Subscription {self.subscription.id} has no email associated with it"
            )

        contributor, created = Contributor.objects.get_or_create(email=email)
        if created:
            logger.info("Created new contributor %s for subscription %s", contributor.id, self.subscription.id)
        pm = self.payment_method
        contribution, created, updated = upsert_with_diff_check(
            model=Contribution,
            unique_identifier={"provider_subscription_id": self.subscription.id},
            defaults={
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
            },
            caller_name="SubscriptionForRecurringContribution.upsert",
        )
        if created:
            logger.info(
                "Created new contribution %s for provider_subscription_id %s", contribution.id, self.subscription.id
            )
        if updated:
            logger.info(
                "Updated existing contribution %s for provider_subscription_id %s",
                contribution.id,
                self.subscription.id,
            )
        for charge in self.charges:
            if charge.balance_transaction:
                upsert_payments_for_charge(contribution, charge, charge.balance_transaction)
            else:
                logger.debug(
                    "Can't upsert payments for contribution %s with charge %s because no balance transaction",
                    contribution.id,
                    getattr(charge, "id", None),
                )
        return contribution, created, updated


@dataclass
class StripeTransactionsSyncer:
    """Class for syncing Stripe transactions data to Revengine. By default will iterate over all available Stripe accounts, for all time"""

    _STRIPE_ACCOUNTS_QUERY = PaymentProvider.objects.filter(stripe_account_id__isnull=False)
    for_orgs: list[str] = None
    for_stripe_accounts: list[str] = None
    from_date: datetime.datetime = None
    to_date: datetime.datetime = None

    def __post_init__(self):
        logger.debug(
            "Initializing StripeTransactionsSyncer with for_orgs %s and for_stripe_accounts %s",
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

    def sync_contributions_and_payments_for_stripe_account(self, account_id: str) -> None:
        """This method is responsible for upserting contributors, contributions, and payments for a given stripe account."""
        logger.info("Syncing transactions data for stripe account %s", account_id)
        self.sync_contributions_and_payments_for_subscriptions(stripe_account_id=account_id)
        self.sync_contributions_and_payments_for_payment_intents(stripe_account_id=account_id)

    def sync_contributions_and_payments_for_subscriptions(self, stripe_account_id: str) -> list[Contribution]:
        """Upsert contributions, contributors, and payments for subscriptions for a given stripe account."""
        stripe_client = StripeClientForConnectedAccount(
            account_id=stripe_account_id, gte=self.from_date, lte=self.to_date
        )
        # this gets all invoices for the account (given any contraints on query around date, etc.)
        invoices = stripe_client.get_invoices()
        # Now based on the set of all invoices, we need to determine where there are any subscriptions uncaptured by revengine.
        # Subscriptions are not directly attached to invoices, but we can get them from the respective charges.
        # The returned charges have balance transaction and refunds expanded, which will allow us to generate Revengine payments
        charges = [
            stripe_client.get_expanded_charge_object(charge_id=x.charge, stripe_account_id=stripe_account_id)
            for x in invoices
            if x.charge
        ]

        # Based on the set of subscriptions represented by the set of charges, we narrow down to those that are not already in revengine but should
        # be. Calling .get_revengine_subscriptions_data will return a list of SubscriptionForRecurringContribution objects, which are used to pull together required
        # data for contribution, contributor, and payments, and then upsert them.
        subscriptions_data = stripe_client.get_revengine_subscriptions_data(charges=charges, invoices=invoices)
        contributions = []
        created_count = 0
        updated_count = 0
        for x in subscriptions_data:
            try:
                contribution, created, updated = x.upsert()
                contributions.append(contribution)
                if created:
                    created_count += 1
                if updated:
                    updated_count += 1
            except ValueError as exc:
                logger.warning("Unable to upsert subscription %s", x.subscription.id, exc_info=exc)
        logger.info("Created %s new recurring contributions for stripe account %s", created_count, stripe_account_id)
        logger.info(
            "Updated %s existing recurring contributions for stripe account %s", updated_count, stripe_account_id
        )
        return contributions

    def sync_contributions_and_payments_for_payment_intents(self, stripe_account_id: str) -> list[Contribution]:
        """Upsert contributions and payments for one-time payment intents for a given stripe account."""
        stripe_client = StripeClientForConnectedAccount(
            account_id=stripe_account_id, gte=self.from_date, lte=self.to_date
        )
        contributions = []
        created_count = 0
        updated_count = 0
        for x in stripe_client.get_revengine_one_time_contributions_data():
            try:
                contribution, created, updated = x.upsert()
                contributions.append(contribution)
                if created:
                    created_count += 1
                if updated:
                    updated_count += 1
            except ValueError as exc:
                logger.warning("Unable to upsert payment intent %s", x.payment_intent.id, exc_info=exc)
        logger.info("Created %s new one-time contributions for stripe account %s", created_count, stripe_account_id)
        logger.info(
            "Updated %s existing one-time contributions for stripe account %s", updated_count, stripe_account_id
        )
        return contributions

    def sync_stripe_transactions_data(self) -> None:
        """Iterates over stripe accounts that the class was initialized with and attempts to sync transactions data from Stripe to
        create contributions, contributors, and payments
        """
        logger.info(
            "Syncing contributions and payments for %s stripe accounts",
            len(self.stripe_account_ids),
        )
        for account_id in self.stripe_account_ids:
            logger.info(
                "Syncing transactions data for stripe account %s with from_date %s to_date %s",
                account_id,
                self.from_date,
                self.to_date,
            )
            self.sync_contributions_and_payments_for_stripe_account(account_id)


@dataclass
class StripeEventSyncer:
    """Class for sycning a stripe event to revengine. Uses existing webhook processor for this."""

    event_id: str
    stripe_account_id: str
    async_mode: bool = False

    def __post_init__(self):
        self.client = StripeClientForConnectedAccount(account_id=self.stripe_account_id)

    def get_event(self) -> stripe.Event | None:
        """Gets a stripe event for a given event id and stripe account id."""
        return self.client.get_stripe_event(event_id=self.event_id, stripe_account_id=self.stripe_account_id)

    def sync(self) -> None:
        # vs. circular import
        from .tasks import process_stripe_webhook_task

        if not (event := self.get_event()):
            logger.warning("No event found for event id %s", self.event_id)
            return
        if event.type not in settings.STRIPE_WEBHOOK_EVENTS_CONTRIBUTIONS:
            logger.warning("Event type %s is not supported", event.type)
            return
        if self.async_mode:
            process_stripe_webhook_task.delay(raw_event_data=event)
        else:
            process_stripe_webhook_task(raw_event_data=event)
