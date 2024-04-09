import datetime
import logging
from abc import ABC
from dataclasses import dataclass
from functools import cached_property
from typing import Any, Dict, Iterable, Tuple
from urllib.parse import urlparse

from django.conf import settings
from django.db import transaction

import reversion
import stripe
import tldextract

from apps.common.utils import stripe_call_with_backoff, upsert_with_diff_check
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
from apps.organizations.models import PaymentProvider, RevenueProgram
from apps.pages.models import DonationPage


MAX_STRIPE_RESPONSE_LIMIT = 100

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def upsert_payment_for_transaction(
    contribution: Contribution, transaction: stripe.BalanceTransaction, is_refund: bool = False
) -> Tuple[Payment | None, str | None]:
    """Upsert a payment object for a given stripe balance transaction and contribution"""
    logger.debug(
        "Upserting payment for contribution %s and transaction %s",
        contribution.id,
        (getattr(transaction, "id", "<no transaction>")),
    )
    if transaction:
        payment, action = upsert_with_diff_check(
            model=Payment,
            unique_identifier={"contribution": contribution, "stripe_balance_transaction_id": transaction.id},
            defaults={
                "net_amount_paid": transaction.net if not is_refund else 0,
                "gross_amount_paid": transaction.amount if not is_refund else 0,
                "amount_refunded": transaction.amount if is_refund else 0,
                "transaction_time": datetime.datetime.fromtimestamp(int(transaction.created), tz=datetime.timezone.utc),
            },
            caller_name="upsert_payment_for_transaction",
        )
        logger.info("%s payment %s for contribution %s", action, payment.id, contribution.id)
        return payment, action
    else:
        # NB. This is a rare case. It happened running locally with test Stripe. Seems unlikely in prod, but need to handle so command
        # works in all cases
        logger.warning(
            "Data associated with contribution %s has no balance transaction associated with it. No payment will be created.",
            contribution.id,
        )
        return None, None


def parse_slug_from_url(url: str) -> str | None:
    """Parse RP slug, if any, from a given URL"""
    if tldextract.extract(url).domain not in settings.DOMAIN_APEX:
        logger.warning("URL %s has a TLD that is not allowed for import", url)
        raise InvalidStripeTransactionDataError(f"URL {url} has a TLD that is not allowed for import")
    parsed = urlparse(url)
    path_segments = [segment for segment in parsed.path.split("/") if segment]
    return path_segments[0] if len(path_segments) else None


@dataclass
class ContributionImportBaseClass(ABC):
    charges: list[stripe.Charge]
    refunds: list[stripe.Refund]
    customer: stripe.Customer | None

    def __post_init__(self) -> None:
        self.validate()
        self.created_contribution_ids = set()
        self.updated_contribution_ids = set()
        self.created_payment_ids = set()
        self.updated_payment_ids = set()
        self.created_contributor_ids = set()

    def validate(self) -> None:
        """Does several validation checks that should ensure the data can be upserted to revengine.

        NB: Inheriting classes should call super validate method when adding additional validation checks.
        """
        self.validate_referer()
        self.validate_metadata()
        self.validate_customer()
        self.validate_email_id()

    def get_effects_string(self) -> str:
        """Return a string summarizing the effects of the import"""
        return (
            f"For {self.entity_name} {self.entity_id}, created {len(self.created_contribution_ids)} contributions, {len(self.created_contributor_ids)} contributors, {len(self.created_payment_ids)} payments; "
            f"updated {len(self.updated_contribution_ids)} contributions, {len(self.updated_payment_ids)} payments."
        )

    @property
    def entity_id(self) -> str:
        return self.stripe_entity.id

    @property
    def entity_name(self) -> str:
        return "Payment intent" if getattr(self, "payment_intent", None) else "Subscription"

    @property
    def email_id(self) -> str | None:
        return getattr(self.customer, "email", None)

    @property
    def stripe_entity(self) -> stripe.PaymentIntent | stripe.Subscription:
        return getattr(self, "payment_intent" if self.entity_name == "Payment intent" else "subscription")

    @property
    def referer(self) -> str | None:
        return self.stripe_entity.metadata.get("referer", None)

    @cached_property
    def donation_page(self) -> DonationPage | None:
        """Attempt to derive a donation page from stripe metadata.

        Note that this method assumes that referer has already been validated as present upstream, in which
        case it is guaranteed to have a revenue_program_id key (though it could possibly be empty string)
        """
        if not (rp_id := self.stripe_entity.metadata["revenue_program_id"]):
            logger.warning("No revenue program id found in stripe metadata for %s %s", self.entity_name, self.entity_id)
            return None
        revenue_program = RevenueProgram.objects.filter(id=rp_id).first()
        if not revenue_program:
            logger.warning("No revenue program found for id %s", rp_id)
            return None
        slug = parse_slug_from_url(self.referer)
        return (
            revenue_program.donationpage_set.filter(slug=slug).first()
            if slug
            else revenue_program.default_donation_page
        )

    def validate_referer(self) -> None:
        """For now, we require a referer to be present in the metadata. This is because we need to know the donation page.

        This requirement may change in the future. See [DEV-4562] in JIRA for more detail.
        """
        referer = self.referer
        if (not referer) or f"{(_:=tldextract.extract(referer)).domain}.{_.suffix}" != settings.DOMAIN_APEX:
            raise InvalidStripeTransactionDataError(
                f"{self.entity_name} {self.entity_id} has no referer associated with it"
            )

    def validate_customer(
        self,
    ) -> None:
        if not self.customer:
            raise InvalidStripeTransactionDataError(
                f"{self.entity_name} {self.entity_id} has no customer associated with it"
            )

    def validate_email_id(self) -> None:
        if not self.email_id:
            raise InvalidStripeTransactionDataError(
                f"{self.entity_name} {self.entity_id} has no email associated with it"
            )

    def validate_metadata(self) -> None:
        """Validate the metadata associated with the stripe entity"""
        if (
            schema_version := self.stripe_entity.metadata.get("schema_version", None)
        ) not in STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS:
            raise InvalidMetadataError(
                f"Invalid schema version {schema_version} for {self.entity_name} {self.entity_id}"
            )
        # Callling this will raise a `InvalidMetadataError` if the metadata is invalid
        cast_metadata_to_stripe_payment_metadata_schema(self.stripe_entity.metadata)

    def conditionally_update_contribution_donation_page(self, contribution: Contribution) -> Contribution:
        """If the contribution has no donation page, we'll update it with the donation page derived from payment metadata

        NB: This method assumes that validation has already occurred and that there is a valid donation page
        """
        if self.donation_page and not contribution.donation_page:
            logger.debug("Updating contribution %s with donation page %s", contribution.id, self.donation_page.id)
            contribution.donation_page = self.donation_page
            with reversion.create_revision():
                contribution.save(update_fields={"donation_page"})
                reversion.set_comment("Donation page was updated from Stripe metadata")
        return contribution

    def get_or_create_contributor(self) -> Contributor:
        """Get or create a contributor"""
        logger.debug("Upserting contributor for %s %s", self.entity_name, self.entity_id)
        contributor, created = Contributor.objects.get_or_create(email=self.email_id)
        if created:
            logger.info("Created new contributor %s for %s %s", contributor.id, self.entity_name, self.entity_id)
            self.created_contributor_ids.add(contributor.id)
        return contributor

    def upsert_payments(
        self, charges: list[stripe.Charge], refunds: list[stripe.Refund], contribution: Contribution
    ) -> None:
        for x, is_refund in list(map(lambda y: (y, False), charges)) + list(map(lambda y: (y, True), refunds)):
            if not x or not getattr(x, "balance_transaction", None):
                logger.warning(
                    "Data associated with contribution %s has no balance transaction associated with it. No payment will be created.",
                    contribution.id,
                )
                continue
            payment, action = upsert_payment_for_transaction(contribution, x.balance_transaction, is_refund=is_refund)
            if payment:
                match action:
                    case "created":
                        self.created_payment_ids.add(payment.id)
                    case "updated":
                        self.updated_payment_ids.add(payment.id)
                    case _:
                        pass

    def update_contribution_stats(self, action: str, contribution: Contribution | None) -> None:
        match action:
            case "created":
                self.created_contribution_ids.add(contribution.id)
            case "updated":
                self.updated_contribution_ids.add(contribution.id)
            case _:
                pass


@dataclass
class PaymentIntentForOneTimeContribution(ContributionImportBaseClass):
    """Convenience class used to upsert contribution, contributor, and payments for a given Stripe payment intent"""

    payment_intent: stripe.PaymentIntent

    def __str__(self) -> str:
        return f"PaymentIntentForOneTimeContribution {self.payment_intent.id}"

    def validate(self) -> None:
        super().validate()
        self.validate_charges()

    def validate_charges(self) -> None:
        """Ensure there's only one successful or pending charge.

        This is critical for a one-time contribution. If there's more than one charge, our system
        cannot represent this in context of a one-time contribution.

        Statuses are: succeeded, pending, failed
        """
        if len([x for x in self.charges if x.status != "failed"]) > 1:
            raise InvalidStripeTransactionDataError(
                f"Payment intent {self.payment_intent.id} has multiple successful charges associated with it. Unable to create one-time contribution"
            )

    @property
    def successful_charge(self) -> stripe.Charge | None:
        """Get the first successful charge associated with the payment intent"""
        return next((x for x in self.charges if x.status == "succeeded"), None)

    @property
    def refunded(self) -> bool:
        """In revengine if a one-time contribution has any refunds associated with it, it's considered refunded."""
        return len(self.refunds) > 0

    @property
    def status(self) -> ContributionStatus:
        """Map Stripe payment intent status to Revengine contribution status."""
        match (self.refunded, self.payment_intent.status):
            case (True, _):
                return ContributionStatus.REFUNDED
            case (False, "succeeded"):
                return ContributionStatus.PAID
            case (False, "canceled"):
                return ContributionStatus.CANCELED
            # We'll use processing as catch all if we receive another known Stripe status.
            case (
                False,
                "processing"
                | "requires_action"
                | "requires_capture"
                | "requires_confirmation"
                | "requires_payment_method",
            ):
                return ContributionStatus.PROCESSING
            case _:
                logger.warning(
                    "Unknown status %s for payment intent %s", self.payment_intent.status, self.payment_intent.id
                )
                raise InvalidStripeTransactionDataError("Unknown status for payment intent")

    @property
    def payment_method(self) -> stripe.PaymentMethod | None:
        """The payment method associated with the payment intent. We prefer the charge's payment method if present,
        but if not, we try getting from Stripe customer

        Assumes payment method on the pi or customer.invoice.settings.default_payment_method is expanded
        """
        if default_pm := self.payment_intent.payment_method:
            return default_pm
        return self.customer.invoice_settings.default_payment_method if self.customer.invoice_settings else None

    @transaction.atomic
    def upsert(self) -> None:
        """Upsert a contribution, contributor, and payments for a given Stripe payment intent.

        If the payment intent has a charge associated, we'll upsert a payment.

        If that charge has any refunds associated with it, we'll upsert those as payments as well.

        Additionally, we'll conditionally update the contribution with donation page if it's missing. Note that if the upsert action would result in the
        contribution not having a value for donation page, the entire transaction is rolled back.
        """
        logger.debug("Upserting untracked payment intent %s", self.payment_intent.id)
        contributor = self.get_or_create_contributor()
        pm = self.payment_method
        contribution, action = upsert_with_diff_check(
            model=Contribution,
            unique_identifier={"provider_payment_id": self.payment_intent.id},
            defaults={
                "amount": self.payment_intent.amount,
                # NB: Stripe currency as returned by API is lowercased, but when we create contributions in revengine
                # donation page flow, we use uppercase currency (see organizations.models.PaymentProvider.currency default of USD), so
                # we need to uppercase it here, lest we superfluously update a large number of records from "USD" to "usd"
                "currency": self.payment_intent.currency.upper(),
                "interval": ContributionInterval.ONE_TIME,
                "payment_provider_used": PaymentProvider.STRIPE_LABEL,
                "provider_customer_id": self.customer.id if self.customer else None,
                "provider_payment_method_id": pm.id if pm else None,
                "provider_payment_method_details": pm.to_dict() if pm else None,
                "status": self.status,
                "contributor": contributor,
                "contribution_metadata": self.payment_intent.metadata,
            },
            caller_name="PaymentIntentForOneTimeContribution.upsert",
            # If there's contribution metadata, we want to leave it intact.
            # Otherwise we see spurious updates because of key ordering in the
            # metadata and conversions of null <-> None.
            dont_update=["contribution_metadata"],
        )
        contribution = self.conditionally_update_contribution_donation_page(contribution=contribution)
        if not contribution.donation_page:
            # NB: If we get to this point and the contribution still has no donation page, we don't want it to get created/upserted in db
            # because pageless contributions cause problems. Since this method is wrapped in @transaction.atomic, this will cause the entire
            # transaction to be rolled back
            raise InvalidStripeTransactionDataError(
                f"Contribution {contribution.id} has no donation page associated with it"
            )
        self.update_contribution_stats(action, contribution)
        # Even though we only expect one successful charge, it's possible to have multiple refunds
        charge = self.successful_charge
        self.upsert_payments(
            charges=[charge if charge else None],
            refunds=self.refunds,
            contribution=contribution,
        )


@dataclass
class SubscriptionForRecurringContribution(ContributionImportBaseClass):
    """Convenience class used to upsert contribution, contributor, and payments for a given Stripe subscription."""

    subscription: stripe.Subscription

    def __str__(self) -> str:
        return f"SubscriptionForRecurringContribution {self.subscription.id}"

    def validate(self) -> None:
        """Does several validation checks that should ensure the data can be upserted to revengine."""
        super().validate()
        # This will raise an `InvalidIntervalError` if the interval is invalid
        self.get_interval_from_subscription(self.subscription)

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
    def payment_method(self) -> stripe.PaymentMethod | None:
        """The payment method associated with the subscription. We prefer default payment method on sub if present,

        but if not, we try getting from Stripe customer

        NB: Assumes default payment method has been expanded on the subscription
        """
        if default_pm := self.subscription.default_payment_method:
            return default_pm

        return self.customer.invoice_settings.default_payment_method if self.customer.invoice_settings else None

    @transaction.atomic
    def upsert(self) -> None:
        """Upsert contribution, contributor and payments for given Stripe subscription

        Additionally, we'll conditionally update the contribution with donation page if it's missing. Note that if the upsert action would result in the
        contribution not having a value for donation page, the entire transaction is rolled back.
        """
        logger.debug("Upserting untracked subscription %s", self.subscription.id)
        contributor, created = Contributor.objects.get_or_create(email=self.email_id)
        if created:
            logger.info("Created new contributor %s for subscription %s", contributor.id, self.subscription.id)
        pm = self.payment_method
        contribution, action = upsert_with_diff_check(
            model=Contribution,
            unique_identifier={"provider_subscription_id": self.subscription.id},
            defaults={
                "amount": self.subscription.plan.amount,
                # NB: Stripe currency as returned by API is lowercased, but when we create contributions in revengine
                # donation page flow, we use uppercase currency (see organizations.models.PaymentProvider.currency default of USD), so
                # we need to uppercase it here, lest we superfluously update a large number of records from "USD" to "usd"
                "currency": self.subscription.currency.upper(),
                "interval": self.interval,
                "payment_provider_used": PaymentProvider.STRIPE_LABEL,
                "provider_customer_id": self.customer.id,
                "provider_payment_method_id": pm.id if pm else None,
                "provider_payment_method_details": pm.to_dict() if pm else None,
                "contributor": contributor,
                "contribution_metadata": self.subscription.metadata,
                "status": self.status,
            },
            caller_name="SubscriptionForRecurringContribution.upsert",
            # If there's contribution metadata, we want to leave it intact.
            # Otherwise we see spurious updates because of key ordering in the
            # metadata and removal of null/None entries.
            dont_update=["contribution_metadata"],
        )
        contribution = self.conditionally_update_contribution_donation_page(contribution=contribution)
        if not contribution.donation_page:
            # NB: If we get to this point and the contribution still has no donation page, we don't want it to get created/upserted in db
            # because pageless contributions cause problems. Since this method is wrapped in @transaction.atomic, this will cause the entire
            # transaction to be rolled back
            raise InvalidStripeTransactionDataError(
                f"Contribution {contribution.id} has no donation page associated with it"
            )
        self.update_contribution_stats(action, contribution)
        self.upsert_payments(charges=self.charges, refunds=self.refunds, contribution=contribution)


@dataclass
class StripeTransactionsImporter:
    """Class for importing Stripe transactions data to Revengine"""

    stripe_account_id: str
    from_date: datetime.datetime = None
    to_date: datetime.datetime = None

    def __post_init__(self) -> None:
        self.payment_intents_processed = 0
        self.subscriptions_processed = 0
        self.created_contribution_ids = set()
        self.updated_contribution_ids = set()
        self.created_contributor_ids = set()
        self.created_payment_ids = set()
        self.updated_payment_ids = set()

    @property
    def created_query(self) -> dict:
        """Generates a query that can supplied for "created" param when listing stripe resources"""
        return {k: v for k, v in {"gte": self.from_date, "lte": self.to_date}.items() if v}

    def get_charges_for_payment_intent(self, payment_intent_id: str) -> Iterable[stripe.Charge]:
        """Gets charges for a given stripe payment intent"""
        logger.debug("Getting charges for payment intent %s", payment_intent_id)
        return stripe_call_with_backoff(
            stripe.Charge.list,
            payment_intent=payment_intent_id,
            stripe_account=self.stripe_account_id,
            limit=MAX_STRIPE_RESPONSE_LIMIT,
            expand=("data.balance_transaction", "data.refunds.data.balance_transaction"),
        ).auto_paging_iter()

    def get_payment_intents(self) -> Iterable[stripe.PaymentIntent]:
        """Gets payment intents for a given stripe account"""
        logger.debug("Getting payment intents for account %s", self.stripe_account_id)
        return stripe_call_with_backoff(
            stripe.PaymentIntent.list,
            stripe_account=self.stripe_account_id,
            limit=MAX_STRIPE_RESPONSE_LIMIT,
            created=self.created_query,
        ).auto_paging_iter()

    @staticmethod
    def is_for_one_time_contribution(pi: stripe.PaymentIntent, invoice: stripe.Invoice | None) -> bool:
        """Determines if a given stripe payment intent is for a one-time contribution"""
        logger.debug("Determining if payment intent %s is for a one-time contribution", pi.id)
        if not pi.invoice:
            return True
        if invoice and invoice.subscription:
            return False
        return True

    def get_stripe_entity(self, entity_id: str, entity_name: str, **kwargs):
        """Retrieve a stripe entity for a given stripe account"""
        logger.debug("Getting %s %s for account %s", entity_name, entity_id, self.stripe_account_id)
        try:
            callable = getattr(stripe, entity_name)
            return stripe_call_with_backoff(
                callable.retrieve,
                entity_id,
                stripe_account=self.stripe_account_id,
                **kwargs,
            )
        except stripe.error.StripeError as exc:
            logger.warning(
                "Unable to retrieve %s %s for account %s",
                entity_name,
                entity_id,
                self.stripe_account_id,
                exc_info=exc,
            )

    def get_payment_method(self, entity_id: str) -> stripe.PaymentMethod | None:
        """Retrieve a payment method for a given stripe account"""
        return self.get_stripe_entity(entity_id=entity_id, entity_name="PaymentMethod")

    def get_stripe_customer(self, entity_id: str) -> stripe.Customer | None:
        """Retrieve a stripe customer for a given stripe account"""
        return self.get_stripe_entity(
            entity_id=entity_id, entity_name="Customer", expand=("invoice_settings.default_payment_method",)
        )

    def get_invoice(self, entity_id: str) -> stripe.Invoice | None:
        """Retrieve a stripe invoice for a given stripe account"""
        return self.get_stripe_entity(
            entity_id=entity_id, entity_name="Invoice", expand=("subscription.default_payment_method",)
        )

    def get_payment_intent(self, entity_id: str) -> stripe.PaymentIntent | None:
        """Retrieve a stripe payment intent for a given stripe account"""
        return self.get_stripe_entity(entity_id=entity_id, entity_name="PaymentIntent", expand=("payment_method",))

    def assemble_data_for_pi(self, payment_intent: stripe.PaymentIntent) -> Dict[str, Any]:
        """Assemble data for a given stripe payment intent"""
        logger.debug("Assembling data for payment intent %s", payment_intent.id)
        charges = self.get_charges_for_payment_intent(payment_intent_id=payment_intent.id)
        refunds = []
        for charge in charges:
            refunds.extend([x for x in charge.refunds.data])
        customer = self.get_stripe_customer(entity_id=payment_intent.customer)
        invoice = self.get_invoice(entity_id=payment_intent.invoice) if payment_intent.invoice else None
        data = {
            "charges": charges,
            "refunds": refunds,
            "customer": customer,
        }
        if self.is_for_one_time_contribution(payment_intent, invoice):
            # we re-retrieve the payment intent here in case of one-time because we need to get the expanded payment method, and the PI
            # sent as arg is retrieved via list api, where it's not possible to expand payment method
            pi = self.get_payment_intent(entity_id=payment_intent.id)
            data = data | {"payment_intent": pi}
        else:
            data = data | {"subscription": invoice.subscription}
        return data

    def import_contributions_and_payments(self) -> None:
        """This method is responsible for upserting contributors, contributions, and payments for a given stripe account."""
        logger.info("Retrieving all revengine-related payment intents for stripe account %s", self.stripe_account_id)
        for pi in self.get_payment_intents():
            data = self.assemble_data_for_pi(pi)
            try:
                self.upsert_transaction(data=data)
            except InvalidStripeTransactionDataError as exc:
                if data.get("payment_intent", None):
                    entity = data["payment_intent"]
                    entity_name = "Payment intent"
                else:
                    entity = data["subscription"]
                    entity_name = "Subscription"
                logger.debug("Unable to upsert %s %s", entity_name, entity.id, exc_info=exc)
                continue
            if "payment_intent" in data:
                self.payment_intents_processed += 1
            else:
                self.subscriptions_processed += 1

        logger.info(
            (
                "Here's what happened: \n"
                "%s Stripe payment intents for one-time contributions were processed.\n"
                "%s Stripe subscriptions for recurring contributions were processed.\n"
                "%s contributions were created and %s were updated.\n"
                "%s payments were created and %s were updated.\n"
                "%s contributors were created."
            ),
            self.payment_intents_processed,
            self.subscriptions_processed,
            len(self.created_contribution_ids),
            len(self.updated_contribution_ids),
            len(self.created_payment_ids),
            len(self.updated_payment_ids),
            len(self.created_contributor_ids),
        )

    def upsert_one_time_contribution(self, data: dict) -> Tuple[Contribution, str]:
        """Upsert a one-time contribution for a given stripe payment intent and related data"""
        contribution, action = PaymentIntentForOneTimeContribution(**data).upsert()
        logger.info(
            "%s contribution %s for stripe payment intent with ID %s",
            action,
            contribution.id,
            data["payment_intent"].id,
        )
        return contribution, action

    def upsert_transaction(self, data: Dict[str, Any]) -> None:
        handler = (
            PaymentIntentForOneTimeContribution if "payment_intent" in data else SubscriptionForRecurringContribution
        )(**data)
        handler.upsert()
        logger.info(handler.get_effects_string())
        self.created_contribution_ids |= handler.created_contribution_ids
        self.updated_contribution_ids |= handler.updated_contribution_ids
        self.created_payment_ids |= handler.created_payment_ids
        self.updated_payment_ids |= handler.updated_payment_ids
        self.created_contributor_ids |= handler.created_contributor_ids


@dataclass(frozen=True)
class StripeEventProcessor:
    """Class for processing a stripe event. Uses existing webhook processor for this."""

    event_id: str
    stripe_account_id: str
    async_mode: bool = False

    def get_event(self) -> stripe.Event | None:
        """Gets a stripe event for a given event id and stripe account id."""
        try:
            return stripe.Event.retrieve(id=self.event_id, stripe_account=self.stripe_account_id)
        except stripe.error.StripeError as exc:
            logger.warning(
                "Unable to retrieve stripe event with ID %s for stripe account %s",
                self.event_id,
                self.stripe_account_id,
                exc_info=exc,
            )

    def process(self) -> None:
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
