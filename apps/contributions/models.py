from __future__ import annotations

import datetime
import logging
import uuid
from dataclasses import asdict
from functools import cached_property, reduce, wraps
from operator import or_
from typing import Any, Callable, List
from urllib.parse import quote_plus
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import models
from django.template.loader import render_to_string
from django.utils.safestring import SafeString, mark_safe

import reversion
import stripe
from addict import Dict as AttrDict
from stripe.error import StripeError

from apps.api.tokens import ContributorRefreshToken
from apps.common.models import IndexedTimeStampedModel
from apps.contributions.choices import BadActorScores, ContributionInterval, ContributionStatus
from apps.contributions.types import StripeEventData, StripePiAsPortalContribution
from apps.emails.tasks import (
    make_send_thank_you_email_data,
    send_templated_email,
    send_thank_you_email,
)
from apps.organizations.models import RevenueProgram
from apps.users.choices import Roles
from apps.users.models import RoleAssignment
from revengine.settings.base import CurrencyDict


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class ContributionIntervalError(Exception):
    pass


class ContributionStatusError(Exception):
    pass


class Contributor(IndexedTimeStampedModel):
    uuid = models.UUIDField(default=uuid.uuid4, primary_key=False, editable=False)
    email = models.EmailField(unique=True)

    @property
    def is_authenticated(self):
        """
        Copy django.contrib.auth.models import AbstractBaseUser for request.user.is_authenticated

        Always return True. This is a way to tell if the user has been
        authenticated in templates.
        """
        return True

    @property
    def is_superuser(self):
        """
        Contributors essentially impersonate Users. Ensure that they can never be superusers.
        Note: It's useful to keep this as a property, since properties defined this way are immutable.
        """
        return False

    def __str__(self):
        return self.email

    def create_stripe_customer(
        self,
        rp_stripe_account_id,
        customer_name=None,
        phone=None,
        street=None,
        complement=None,  # apt, room, aka "line2"
        city=None,
        state=None,
        postal_code=None,
        country=None,
        metadata=None,
    ):
        """Create a Stripe customer using contributor email"""
        address = {
            "line1": street,
            "line2": complement or "",
            "city": city,
            "state": state,
            "postal_code": postal_code,
            "country": country,
        }
        return stripe.Customer.create(
            email=self.email,
            address=address,
            shipping={"address": address, "name": customer_name},
            name=customer_name,
            phone=phone,
            stripe_account=rp_stripe_account_id,
            metadata=metadata,
        )

    @staticmethod
    def create_magic_link(contribution: "Contribution") -> SafeString:
        """Create a magic link value that can be inserted into Django templates (for instance, in contributor-facing emails)"""
        from apps.api.views import construct_rp_domain  # vs. circular import

        if not isinstance(contribution, Contribution):
            logger.error("`Contributor.create_magic_link` called with invalid contributon value: %s", contribution)
            raise ValueError("Invalid value provided for `contribution`")
        token = str(ContributorRefreshToken.for_contributor(contribution.contributor.uuid).short_lived_access_token)
        return mark_safe(
            f"https://{construct_rp_domain(contribution.donation_page.revenue_program.slug)}/{settings.CONTRIBUTOR_VERIFY_URL}"
            f"?token={token}&email={quote_plus(contribution.contributor.email)}"
        )


class ContributionQuerySet(models.QuerySet):
    def one_time(self):
        return self.filter(interval=ContributionInterval.ONE_TIME)

    def recurring(self):
        return self.filter(interval__in=[ContributionInterval.MONTHLY, ContributionInterval.YEARLY])

    def having_org_viewable_status(self) -> models.QuerySet:
        """Exclude contributions with statuses that should not be seen by org users from the queryset"""
        return self.exclude(
            status__in=[
                ContributionStatus.FLAGGED,
                ContributionStatus.REJECTED,
                ContributionStatus.PROCESSING,
            ]
        )

    def filter_queryset_for_contributor(
        self, contributor: Contributor, revenue_program: RevenueProgram
    ) -> List[StripePiAsPortalContribution]:
        # vs circular import
        from apps.contributions.stripe_contributions_provider import ContributionsCacheProvider
        from apps.contributions.tasks import task_pull_serialized_stripe_contributions_to_cache

        cache_provider = ContributionsCacheProvider(contributor.email, revenue_program.stripe_account_id)
        contributions = cache_provider.load()
        # trigger celery task to pull contributions and load to cache if the cache is empty
        if not contributions:
            # log
            task_pull_serialized_stripe_contributions_to_cache.delay(
                contributor.email, revenue_program.stripe_account_id
            )
        return [
            x
            for x in contributions
            if x.revenue_program == revenue_program.slug
            and x.payment_type is not None
            and x.status == ContributionStatus.PAID.value
        ]

    def filtered_by_role_assignment(self, role_assignment: RoleAssignment) -> models.QuerySet:
        """Return results based on user's role type"""
        match role_assignment.role_type:
            case Roles.HUB_ADMIN:
                return self.having_org_viewable_status()
            case Roles.ORG_ADMIN:
                return self.having_org_viewable_status().filter(
                    donation_page__revenue_program__organization=role_assignment.organization
                )
            case Roles.RP_ADMIN:
                return self.having_org_viewable_status().filter(
                    donation_page__revenue_program__in=role_assignment.revenue_programs.all()
                )
            case _:
                return self.none()


class ContributionManager(models.Manager):
    pass


class Contribution(IndexedTimeStampedModel):
    amount = models.IntegerField(help_text="Stored in cents")
    currency = models.CharField(max_length=3, default="usd")
    reason = models.CharField(max_length=255, blank=True)

    interval = models.CharField(max_length=8, choices=ContributionInterval.choices)

    payment_provider_used = models.CharField(max_length=64)
    payment_provider_data = models.JSONField(null=True)
    provider_payment_id = models.CharField(max_length=255, blank=True, null=True)
    provider_setup_intent_id = models.CharField(max_length=255, blank=True, null=True)
    provider_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    provider_customer_id = models.CharField(max_length=255, blank=True, null=True)
    provider_payment_method_id = models.CharField(max_length=255, blank=True, null=True)
    provider_payment_method_details = models.JSONField(null=True)

    # TODO: [DEV-4333] Remove Contribution.last_payment_date in favor of derivation from payments
    last_payment_date = models.DateTimeField(null=True)
    contributor = models.ForeignKey("contributions.Contributor", on_delete=models.SET_NULL, null=True)
    donation_page = models.ForeignKey("pages.DonationPage", on_delete=models.PROTECT, null=True)

    bad_actor_score = models.IntegerField(null=True, choices=BadActorScores.choices)
    bad_actor_response = models.JSONField(null=True)
    flagged_date = models.DateTimeField(null=True)
    contribution_metadata = models.JSONField(null=True)

    status = models.CharField(max_length=10, choices=ContributionStatus.choices, null=True)
    # This is used in the `BaseCreatePaymentSerializer` and provides a way for the SPA
    # to signal to the server that a contribution has been canceled, without relying on easy-to-guess,
    # integer ID value.
    uuid = models.UUIDField(default=uuid.uuid4, primary_key=False, editable=False)

    objects = ContributionManager.from_queryset(ContributionQuerySet)()

    CANCELABLE_SUBSCRIPTION_STATUSES = (
        "trialing",
        "active",
        "past_due",
    )
    MODIFIABLE_SUBSCRIPTION_STATUSES = (
        "incomplete",
        "trialing",
        "active",
        "past_due",
    )

    class Meta:
        get_latest_by = "modified"
        ordering = ["-created"]
        constraints = [
            models.CheckConstraint(
                name="%(app_label)s_%(class)s_bad_actor_score_valid",
                check=models.Q(bad_actor_score__in=BadActorScores.values),
            )
        ]

    def __str__(self):
        return f"{self.formatted_amount}, {self.created.strftime('%Y-%m-%d %H:%M:%S')}"

    @property
    def next_payment_date(self) -> datetime.datetime | None:
        if self.interval == ContributionInterval.ONE_TIME:
            return None
        if not self.stripe_subscription:
            logger.warning("Expected a retrievable stripe subscription on contribution %s but none was found", self.id)
            return None
        next_date = self.stripe_subscription.current_period_end
        return datetime.datetime.fromtimestamp(next_date, tz=ZoneInfo("UTC")) if next_date else None

    @property
    def formatted_amount(self) -> str:
        currency = self.get_currency_dict()
        return f"{currency['symbol']}{'{:.2f}'.format(self.amount / 100)} {currency['code']}"

    @property
    def revenue_program(self):
        if self.donation_page:
            return self.donation_page.revenue_program
        return None

    @property
    def stripe_account_id(self):
        if self.revenue_program and self.revenue_program.payment_provider:
            return self.revenue_program.payment_provider.stripe_account_id
        return None

    @property
    def billing_details(self) -> AttrDict:
        return AttrDict(self.provider_payment_method_details).billing_details

    @property
    def billing_name(self) -> str:
        return self.billing_details.name or ""

    @property
    def billing_email(self) -> str:
        return self.contributor.email if self.contributor else ""

    @property
    def billing_phone(self) -> str:
        return self.billing_details.phone or ""

    @property
    def billing_address(self) -> str:
        order = ("line1", "line2", "city", "state", "postal_code", "country")
        return ",".join([self.billing_details.address[x] or "" for x in order])

    @property
    def formatted_donor_selected_amount(self) -> str:
        if not (amt := (self.contribution_metadata or {}).get("donor_selected_amount", None)):
            logger.warning(
                (
                    "`Contribution.formatted_donor_selected_amount` called on contribution with ID %s that "
                    "does not have a value set for `contribution_metadata['donor_selected_amount']`"
                ),
                self.id,
            )
            return ""
        try:
            return f"{'{:.2f}'.format(float(amt))} {self.currency.upper()}"
        except ValueError:
            logger.warning(
                (
                    "`Contribution.formatted_donor_selected_amount` called on contribution with ID %s whose "
                    "value set for `contribution_metadata['donor_selected_amount']` is %s which cannot be cast to an integer."
                ),
                self.id,
                amt,
            )
            return ""

    BAD_ACTOR_SCORES = (
        (
            0,
            "0 - Information",
        ),
        (
            1,
            "1 - Unknown",
        ),
        (
            2,
            "2 - Good",
        ),
        (
            3,
            "3 - Suspect",
        ),
        (
            4,
            "4 - Bad",
        ),
        (
            5,
            "5 - Very Bad",
        ),
    )

    @property
    def expanded_bad_actor_score(self):
        return None if self.bad_actor_score is None else self.BAD_ACTOR_SCORES[self.bad_actor_score][1]

    def get_currency_dict(self) -> CurrencyDict:
        """
        Returns code (i.e. USD) and symbol (i.e. $) for this contribution.
        """
        try:
            return {"code": self.currency.upper(), "symbol": settings.CURRENCIES[self.currency.upper()]}
        except KeyError:
            logger.exception(
                'Currency settings for stripe account "%s" misconfigured. Tried to access "%s", but valid options are: %s',
                self.stripe_account_id,
                self.currency.upper(),
                settings.CURRENCIES,
            )
            return {"code": "", "symbol": ""}

    def get_payment_manager_instance(self):
        """
        Selects the correct payment manager for this Contribution, then instantiates it.
        """
        from apps.contributions.payment_managers import PaymentManager

        manager_class = PaymentManager.get_subclass(self)
        return manager_class(contribution=self)

    def process_flagged_payment(self, reject=False):
        logger.info("Contribution.process_flagged_payment - processing flagged payment for contribution %s", self.pk)
        payment_manager = self.get_payment_manager_instance()
        payment_manager.complete_payment(reject=reject)
        logger.info("Contribution.process_flagged_payment - processing for contribution %s complete", self.pk)

    def fetch_stripe_payment_method(self, provider_payment_method_id: str = None):
        pm_id = provider_payment_method_id or self.provider_payment_method_id
        if not pm_id:
            logger.warning(
                (
                    "Contribution.fetch_stripe_payment_method called without a provider_payment_method_id "
                    "on contribution with ID %s"
                ),
                self.id,
            )
            return None
        try:
            return stripe.PaymentMethod.retrieve(
                pm_id,
                stripe_account=self.revenue_program.payment_provider.stripe_account_id,
            )
        except StripeError:
            logger.exception(
                "Contribution.fetch_stripe_payment_method encountered a Stripe error when attempting to fetch payment method with id %s for contribution with id %s",
                self.provider_payment_method_id,
                self.id,
            )
            return None

    def save(self, *args, **kwargs):
        previous = self.__class__.objects.filter(pk=self.pk).first()
        logger.info(
            "`Contribution.save` called. Existing contribution has id: %s and provider_payment_method_id: %s \n The save value for provider_payment_method_id is %s",
            getattr(previous, "id", None),
            getattr(previous, "provider_payment_method_id", None),
            self.provider_payment_method_id,
        )
        if (
            (
                previous
                and previous.provider_payment_method_id != self.provider_payment_method_id
                and not self.provider_payment_method_details
            )
            or not previous
            and self.provider_payment_method_id
            and not self.provider_payment_method_details
        ):
            if pm := self.fetch_stripe_payment_method():
                self.provider_payment_method_details = pm
                if kwargs.get("update_fields", False):
                    # we cast update_fields to a set in case it was passed as a list
                    kwargs["update_fields"] = set(kwargs["update_fields"]).union({"provider_payment_method_details"})
        super().save(*args, **kwargs)

    def create_stripe_customer(
        self,
        first_name=None,
        last_name=None,
        phone=None,
        mailing_street=None,
        mailing_complement=None,  # apt, room, aka "line2"
        mailing_city=None,
        mailing_state=None,
        mailing_postal_code=None,
        mailing_country=None,
        **kwargs,
    ):
        """Create a Stripe customer using contributor email"""
        address = {
            "line1": mailing_street,
            "line2": mailing_complement or "",
            "city": mailing_city,
            "state": mailing_state,
            "postal_code": mailing_postal_code,
            "country": mailing_country,
        }
        name = " ".join(x for x in [first_name, last_name] if x)
        return stripe.Customer.create(
            email=self.contributor.email,
            address=address,
            shipping={"address": address, "name": name},
            name=name,
            phone=phone,
            stripe_account=self.donation_page.revenue_program.payment_provider.stripe_account_id,
        )

    def create_stripe_one_time_payment_intent(self, metadata=None, save=True):
        """Create a Stripe PaymentIntent

        See https://stripe.com/docs/api/payment_intents/create for more info
        """
        return stripe.PaymentIntent.create(
            amount=self.amount,
            currency=self.currency,
            customer=self.provider_customer_id,
            metadata=metadata,
            statement_descriptor_suffix=self.donation_page.revenue_program.stripe_statement_descriptor_suffix,
            stripe_account=self.donation_page.revenue_program.stripe_account_id,
            capture_method="manual" if self.status == ContributionStatus.FLAGGED else "automatic",
        )

    def create_stripe_setup_intent(self, metadata):
        return stripe.SetupIntent.create(
            customer=self.provider_customer_id,
            stripe_account=self.donation_page.revenue_program.payment_provider.stripe_account_id,
            metadata=metadata,
        )

    def create_stripe_subscription(
        self, metadata=None, default_payment_method=None, off_session=False, error_if_incomplete=False
    ):
        """Create a Stripe Subscription and attach its data to the contribution

        See https://stripe.com/docs/api/subscriptions/create for more info
        """
        price_data = {
            "unit_amount": self.amount,
            "currency": self.currency,
            "product": self.donation_page.revenue_program.payment_provider.stripe_product_id,
            "recurring": {
                "interval": self.interval,
            },
        }
        subscription = stripe.Subscription.create(
            customer=self.provider_customer_id,
            default_payment_method=default_payment_method,
            items=[
                {
                    "price_data": price_data,
                }
            ],
            stripe_account=self.donation_page.revenue_program.payment_provider.stripe_account_id,
            metadata=metadata,
            payment_behavior="error_if_incomplete" if error_if_incomplete else "default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
            off_session=off_session,
        )
        return subscription

    def cancel(self):
        # this is specifically used when a user clicks "back" on the second payment form in checkout flow. it's not
        # necessarily intended to be a general-purpose cancellation method (i.e., it is not appropriate for the `.destroy` method
        # on the API endpoint)
        if self.status not in (ContributionStatus.PROCESSING, ContributionStatus.FLAGGED):
            logger.warning(
                "`Contribution.cancel` called on contribution (ID: %s) with unexpected status %s",
                self.id,
                self.status,
            )
            raise ContributionStatusError()
        elif self.interval == ContributionInterval.ONE_TIME:
            stripe.PaymentIntent.cancel(
                self.provider_payment_id,
                stripe_account=self.donation_page.revenue_program.stripe_account_id,
            )
        elif self.interval not in (ContributionInterval.MONTHLY, ContributionInterval.YEARLY):
            logger.warning(
                "`Contribution.cancel` called on contribution (ID: %s) with unexpected interval %s",
                self.id,
                self.interval,
            )
            raise ContributionIntervalError()
        elif self.status == ContributionStatus.PROCESSING:
            stripe.Subscription.delete(
                self.provider_subscription_id,
                stripe_account=self.donation_page.revenue_program.stripe_account_id,
            )
        elif self.status == ContributionStatus.FLAGGED and self.provider_payment_method_id:
            stripe.PaymentMethod.retrieve(
                self.provider_payment_method_id,
                stripe_account=self.donation_page.revenue_program.stripe_account_id,
            ).detach()

        self.status = ContributionStatus.CANCELED
        with reversion.create_revision():
            self.save(update_fields={"status", "modified"})
            reversion.set_comment(f"`Contribution.cancel` saved changes to contribution with ID {self.id}")

    def handle_thank_you_email(self):
        """Send a thank you email to contribution's contributor if org is configured to have NRE send thank you email"""
        logger.info("`Contribution.handle_thank_you_email` called on contribution with ID %s", self.id)
        if (org := self.revenue_program.organization).send_receipt_email_via_nre:
            logger.info("Contribution.handle_thank_you_email: the parent org (%s) sends emails with NRE", org.id)
            data = make_send_thank_you_email_data(self)
            send_thank_you_email.delay(data)
        else:
            logger.info(
                "Contribution.handle_thank_you_email called on contribution %s the parent org of which does not send email with NRE",
                self.id,
            )

    def send_recurring_contribution_change_email(self, subject_line: str, template_name: str) -> None:
        """Send an email related to a change to a recurring contribution (cancellation, payment method update, etc.) Logic here is shared among several email templates."""
        if self.interval == ContributionInterval.ONE_TIME:
            logger.error(
                "Called on an instance (ID: %s) whose interval is one-time",
                self.id,
            )
            return

        if not self.provider_customer_id:
            logger.error("No Stripe customer ID for contribution with ID %s", self.id)
            return
        try:
            customer = stripe.Customer.retrieve(
                self.provider_customer_id,
                stripe_account=self.donation_page.revenue_program.payment_provider.stripe_account_id,
            )
        except StripeError:
            logger.exception(
                "Something went wrong retrieving Stripe customer for contribution with ID %s",
                self.id,
            )
            return

        data = {
            "contribution_amount": self.formatted_amount,
            "contribution_interval_display_value": self.interval,
            "contributor_email": self.contributor.email,
            "contributor_name": customer.name,
            "fiscal_sponsor_name": self.donation_page.revenue_program.fiscal_sponsor_name,
            "fiscal_status": self.donation_page.revenue_program.fiscal_status,
            "magic_link": Contributor.create_magic_link(self),
            "non_profit": self.donation_page.revenue_program.non_profit,
            "rp_name": self.donation_page.revenue_program.name,
            "style": asdict(self.donation_page.revenue_program.transactional_email_style),
            "tax_id": self.donation_page.revenue_program.tax_id,
            "timestamp": datetime.datetime.today().strftime("%m/%d/%Y"),
        }

        # Almost all RPs should have a default page set, but it's possible one isn't.

        if self.donation_page.revenue_program.default_donation_page:
            data["default_contribution_page_url"] = self.donation_page.revenue_program.default_donation_page.page_url

        send_templated_email.delay(
            self.contributor.email,
            subject_line,
            render_to_string(f"{template_name}.txt", data),
            render_to_string(f"{template_name}.html", data),
        )

    def send_recurring_contribution_canceled_email(self) -> None:
        self.send_recurring_contribution_change_email("Canceled contribution", "recurring-contribution-canceled")

    def send_recurring_contribution_payment_updated_email(self) -> None:
        self.send_recurring_contribution_change_email(
            "New change to your contribution", "recurring-contribution-payment-updated"
        )

    def send_recurring_contribution_email_reminder(self) -> None:
        self.send_recurring_contribution_change_email(
            f"Reminder: {self.donation_page.revenue_program.name} scheduled contribution",
            "recurring-contribution-email-reminder",
        )

    @property
    def stripe_setup_intent(self) -> stripe.SetupIntent | None:
        if not (
            (si_id := self.provider_setup_intent_id)
            and (acct_id := self.donation_page.revenue_program.payment_provider.stripe_account_id)
        ):
            return None
        try:
            return stripe.SetupIntent.retrieve(si_id, stripe_account=acct_id)
        except stripe.error.StripeError:
            logger.exception(
                (
                    "`Contribution.stripe_setup_intent` encountered a Stripe error trying to retrieve stripe setup intent "
                    "with ID %s and stripe account ID %s for contribution with ID %s"
                ),
                si_id,
                acct_id,
                self.id,
            )
            return None

    @property
    def stripe_payment_intent(self) -> stripe.PaymentIntent | None:
        if not (
            (pi_id := self.provider_payment_id)
            and (acct_id := self.donation_page.revenue_program.payment_provider.stripe_account_id)
        ):
            return None
        try:
            return stripe.PaymentIntent.retrieve(pi_id, stripe_account=acct_id)
        except stripe.error.StripeError:
            logger.exception(
                (
                    "`Contribution.stripe_payment_intent` encountered a Stripe error trying to retrieve stripe payment intent "
                    "with ID %s and stripe account ID %s for contribution with ID %s"
                ),
                pi_id,
                acct_id,
                self.id,
            )
            return None

    @cached_property
    def card(self) -> stripe.Card | None:
        if not (cust_id := self.provider_customer_id):
            return None
        customer = stripe.Customer.retrieve(
            cust_id,
            stripe_account=self.donation_page.revenue_program.payment_provider.stripe_account_id,
            expand=["default_source"],
        )
        return customer.default_source if customer.default_source and customer.default_source.object == "card" else None

    @property
    def card_brand(self) -> str:
        return self.card.brand if self.card else ""

    @property
    def card_expiration_date(self) -> str:
        return f"{self.card.exp_month}/{self.card.exp_year}" if self.card else ""

    @property
    def card_owner_name(self) -> str:
        return self.card.name if self.card else ""

    @property
    def card_last_4(self) -> str:
        return self.card.last4 if self.card else ""

    @cached_property
    def _expanded_pi_for_cancelable_modifiable(self) -> stripe.PaymentIntent | None:
        if not self.provider_payment_id:
            return None
        return stripe.PaymentIntent.retrieve(
            self.provider_payment_id, expand=["invoice.subscription"], stripe_account=self.stripe_account_id
        )

    @property
    def is_cancelable(self) -> bool:
        return getattr(self.stripe_subscription, "status", None) in self.CANCELABLE_SUBSCRIPTION_STATUSES

    @property
    def is_modifiable(self) -> bool:
        return getattr(self.stripe_subscription, "status", None) in self.CANCELABLE_SUBSCRIPTION_STATUSES

    @property
    # TODO: [DEV-4333] Update this to be .last_payment_date when no longer in conflict with db model field
    def _last_payment_date(self) -> datetime.datetime | None:
        """In short term while last payment date is still tracked on db level and is required by API consumers, we create this `_`
        prefixed property to avoid conflict with db field name. This will be removed once db field is removed.

        This is used as a source for serializer fields elsewhere.
        """
        last_payment = self.payment_set.order_by("-transaction_time").first()
        return last_payment.transaction_time if last_payment else None

    @property
    def paid_fees(self) -> bool:
        return self.contribution_metadata.get("agreed_to_pay_fees", False)

    @cached_property
    def stripe_payment_method(self) -> stripe.PaymentMethod | None:
        if not (pm_id := self.provider_payment_method_id):
            return None
        return stripe.PaymentMethod.retrieve(pm_id, stripe_account=self.stripe_account_id)

    @property
    def payment_type(self) -> str:
        return self.stripe_payment_method.type if self.stripe_payment_method else ""

    @cached_property
    def stripe_subscription(self) -> stripe.Subscription | None:
        if not all(
            [
                sub_id := self.provider_subscription_id,
                acct_id := self.donation_page.revenue_program.payment_provider.stripe_account_id,
            ]
        ):
            return None
        try:
            return stripe.Subscription.retrieve(sub_id, stripe_account=acct_id)
        except stripe.error.StripeError:
            logger.exception(
                (
                    "`Contribution.stripe_subscription` encountered a Stripe error trying to retrieve stripe subscription "
                    "with ID %s and stripe account ID %s for contribution with ID %s"
                ),
                sub_id,
                acct_id,
                self.id,
            )
            return None

    @staticmethod
    def fix_contributions_stuck_in_processing(dry_run: bool = False) -> None:
        """Update status to PAID if contribution appears to be incorrectly stuck in PROCESSING


        We compare a subset of local contributions to fresh Stripe data and update status to PAID if it
        makes sense to do so. See discussion of Stripe webhook reciever race conditions in this JIRA ticket:
        https://news-revenue-hub.atlassian.net/browse/DEV-3010
        """
        updated = 0
        eligible_one_time = Contribution.objects.one_time().filter(
            provider_payment_id__isnull=False, status=ContributionStatus.PROCESSING
        )
        eligible_recurring = Contribution.objects.recurring().filter(
            provider_subscription_id__isnull=False,
            status=ContributionStatus.PROCESSING,
        )
        for contribution in eligible_one_time | eligible_recurring:
            update_data = {}
            pi = contribution.stripe_payment_intent or AttrDict()
            sub = contribution.stripe_subscription or AttrDict()
            if any(
                [
                    contribution.interval == ContributionInterval.ONE_TIME and pi.status == "succeeded",
                    contribution.interval != ContributionInterval.ONE_TIME and sub.status == "active",
                ]
            ):
                logger.info(
                    "Contribution with ID %s has a stale status of PROCESSING. Updating status to PAID",
                    contribution.id,
                )
                update_data["status"] = ContributionStatus.PAID
            if any(
                [
                    contribution.interval == ContributionInterval.ONE_TIME and pi.created and pi.status == "succeeded",
                    contribution.interval != ContributionInterval.ONE_TIME
                    and pi.created
                    and pi.status == "succeeded"
                    and sub.status == "active",
                ]
            ):
                logger.info(
                    "Contribution with ID %s has a stale last_payment_date. Updating last_payment_date to %s",
                    contribution.id,
                    pi.created,
                )
                update_data["last_payment_date"] = datetime.datetime.fromtimestamp(pi.created, tz=datetime.timezone.utc)
            if any(
                [
                    contribution.interval == ContributionInterval.ONE_TIME
                    and (pm_id := pi.payment_method)
                    and not contribution.provider_payment_method_id,
                    contribution.interval != ContributionInterval.ONE_TIME
                    and (pm_id := sub.default_payment_method)
                    and not contribution.provider_payment_method_id,
                ]
            ):
                logger.info(
                    "`Contribution.fix_contributions_stuck_in_processing` Setting payment method on contribution with ID %s to %s",
                    contribution.id,
                    pi.payment_method,
                )
                update_data.update(
                    {
                        "provider_payment_method_id": pm_id,
                        "provider_payment_method_details": contribution.fetch_stripe_payment_method(
                            provider_payment_method_id=pm_id
                        ),
                    }
                )
            if dry_run:
                updated += 1
                continue
            elif update_data:
                with reversion.create_revision():
                    logger.info(
                        (
                            "`Contribution.fix_contributions_stuck_in_processing` is saving updates to contribution with"
                            "ID %s with the following data: %s"
                        ),
                        contribution.id,
                        update_data,
                    )
                    contribution.save(update_fields=set(update_data.keys()).union({"modified"}))
                    updated += 1
                    reversion.set_comment(
                        f"`Contribution.fix_contributions_stuck_in_processing` updated contribution with ID {contribution.id}"
                    )
        logger.info(
            "Contribution.fix_contributions_stuck_in_processing %sUpdated  %s contributions",
            "[DRY-RUN] " if dry_run else "",
            updated,
        )

    @staticmethod
    def fix_missing_provider_payment_method_id(dry_run: bool = False) -> None:
        """Add provider_payment_method_id from Stripe where empty in our model and available in Stripe"""
        eligible_one_time = (
            Contribution.objects.one_time()
            .filter(provider_payment_method_id__isnull=True)
            .filter(provider_payment_id__isnull=False)
        ).annotate(type=models.Value("one_time"))
        eligible_recurring_with_subscription = (
            Contribution.objects.recurring()
            .filter(provider_payment_method_id__isnull=True, provider_subscription_id__isnull=False)
            .annotate(type=models.Value("recurring_with_subscription"))
        )
        eligible_recurring_with_setup_intent = (
            Contribution.objects.recurring()
            .filter(provider_payment_method_id__isnull=True, provider_subscription_id__isnull=False)
            .annotate(type=models.Value("recurring_with_setup_intent"))
        )
        logger.info(
            (
                "Contribution.fix_missing_provider_payment_method_id found %s eligible one-time contributions, "
                "%s eligible recurring contributions with a subscription, and %s eligible recurring "
                "contributions with a setup intent."
            ),
            eligible_one_time.count(),
            eligible_recurring_with_subscription.count(),
            eligible_recurring_with_setup_intent.count(),
        )
        updated = 0
        for contribution in (
            eligible_one_time | eligible_recurring_with_subscription | eligible_recurring_with_setup_intent
        ):
            pi = contribution.stripe_payment_intent
            sub = contribution.stripe_subscription
            si = contribution.stripe_setup_intent
            if any(
                [
                    contribution.type == "one_time" and pi and (pm_id := pi.payment_method),
                    contribution.type == "recurring_with_subscription"
                    and sub
                    and (pm_id := sub.default_payment_method),
                    contribution.type == "recurring_with_setup_intent" and si and (pm_id := si.payment_method),
                ]
            ):
                contribution.provider_payment_method_id = pm_id
                contribution.provider_payment_method_details = contribution.fetch_stripe_payment_method(
                    provider_payment_method_id=pm_id
                )
                if dry_run:
                    updated += 1
                    continue
                else:
                    with reversion.create_revision():
                        logger.info(
                            "Contributions.fix_missing_provider_payment_method_id updating and saving contribution with ID %s",
                            contribution.id,
                        )
                        contribution.save(
                            update_fields={
                                "provider_payment_method_details",
                                "provider_payment_method_id",
                                "modified",
                            }
                        )
                        reversion.set_comment(
                            "Contribution.fix_missing_provider_payment_method_id updated contribution"
                        )

    @staticmethod
    def fix_missing_payment_method_details_data(dry_run: bool = False) -> None:
        """Retrieve provider_payment_method_details from Stripe if it's None and it appears that this should not be the case.

        For the eligible subset of contributions, we retrieve the payment data from Stripe and set `provider_payment_method_details`
        on the NRE contribution.

        For optimal data integrity, this function should be run only after `fix_contributions_stuck_in_processing`.

        For discussion of need for this method, see discussion of Stripe webhook reciever race conditions in this JIRA ticket:
        https://news-revenue-hub.atlassian.net/browse/DEV-3010"""
        kwargs = {
            "status__in": [
                ContributionStatus.PAID,
                ContributionStatus.FLAGGED,
                ContributionStatus.REJECTED,
                ContributionStatus.CANCELED,
            ],
            "provider_payment_method_id__isnull": False,
            "provider_payment_method_details__isnull": True,
        }
        updated = 0
        for contribution in Contribution.objects.exclude(provider_payment_method_id="").filter(**kwargs):
            logger.info(
                "Contribution with ID %s has missing `provider_payment_method_details` data that can be synced from Stripe",
                contribution.id,
            )
            contribution.provider_payment_method_details = contribution.fetch_stripe_payment_method()
            if dry_run:
                updated += 1
                continue
            else:
                with reversion.create_revision():
                    contribution.save(update_fields={"provider_payment_method_details", "modified"})
                    updated += 1
                    reversion.set_comment(
                        "`Contribution.fix_missing_payment_method_details_data` synced `provider_payment_method_details` from Stripe"
                    )
        logger.info("Synced `provider_payment_method_details` updated %s contributions", updated)

    @staticmethod
    def _stripe_metadata_is_valid_for_contribution_metadata_backfill(metadata):
        logger.debug(
            "`Contribution._stripe_metadata_is_valid_for_contribution_metadata_backfill` called with the following metadata: %s",
            metadata,
        )
        required_keys = (
            "agreed_to_pay_fees",
            "contributor_id",
            "donor_selected_amount",
            "referer",
            "revenue_program_id",
            "revenue_program_slug",
            "schema_version",
            "source",
        )
        missing = set(required_keys).difference(set(metadata.keys()))
        if missing:
            logger.info(
                "`Contribution._stripe_metadata_is_valid_for_contribution_metadata_backfill` was sent metadata with the following missing keys: %s",
                ", ".join(missing),
            )
            return False
        else:
            return True

    @classmethod
    def fix_missing_contribution_metadata(cls, dry_run: bool = False) -> None:
        """Attempt to backfill missing `contribution_metadata` with data pulled from Stripe."""
        updated_count = 0
        eligible = Contribution.objects.exclude(provider_payment_method_id="").filter(
            contribution_metadata__isnull=True
        )
        logger.info(
            "`Contribution.fix_missing_contribution_metadata` found %s eligible contributions missing `contribution_metadata`.",
            eligible.count(),
        )
        for contribution in eligible:
            logger.info(
                "`Contribution.fix_missing_contribution_metadata` attempting to retrieve  %s",
                contribution.id,
            )
            # one-time contributions whether flagged or non-flagged should have an associated payment intent with the data we need
            # recurring contributions that were never flagged will have a subscription that has the data we need, while
            # recurring contributions that were flagged will have a setup_intent with the data.
            if contribution.interval == ContributionInterval.ONE_TIME:
                stripe_entity = contribution.stripe_payment_intent
            elif contribution.interval != ContributionInterval.ONE_TIME and contribution.stripe_setup_intent:
                stripe_entity = contribution.stripe_setup_intent
            else:
                stripe_entity = contribution.stripe_subscription
            if not stripe_entity:
                logger.warning(
                    (
                        "`Contribution.fix_missing_contribution_metadata` could not find any data on "
                        "Stripe to backfill contribution with ID  %s",
                    ),
                    contribution.id,
                )
                continue

            if cls._stripe_metadata_is_valid_for_contribution_metadata_backfill(stripe_entity.metadata):
                logger.info(
                    (
                        "`Contribution.fix_missing_contribution_metadata` found valid backfill data for "
                        "contribution_metadata for contribution with ID %s"
                    ),
                    contribution.id,
                )
                contribution.contribution_metadata = stripe_entity.metadata
                if dry_run:
                    updated_count += 1
                    continue
                else:
                    with reversion.create_revision():
                        contribution.save(update_fields={"contribution_metadata", "modified"})
                        logger.info(
                            "`Contribution.fix_missing_contribution_metadata` updated contribution_metadata on contribution with ID %s",
                            contribution.id,
                        )
                        updated_count += 1
                        reversion.set_comment("`Contribution.fix_missing_contribution_metadata` updated contribution")
            else:
                logger.warning(
                    (
                        "`Contribution.fix_missing_contribution_metadata` could not find any valid backfill data for "
                        "contribution_metadata for contribution with ID %s"
                    ),
                    contribution.id,
                )
        logger.info(
            "`Contribution.fix_missing_contribution_metadata` %s %s contributions",
            "would update" if dry_run else "updated",
            updated_count,
        )


def ensure_stripe_event(event_types: List[str] = None) -> Callable:
    """This is a decorator that's used to ensure that the `event` keyword

    argument passed to a function is a Stripe event in minimally expected state — specifically,
    that it is an instance of `StripeEventData`.

    You can optionally send a list of event types to ensure that the event is of a certain type.

    This decorator allows us to validate assumptions about method arguments without
    cluttering up the method body.
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            event = kwargs.get("event", (no_arg := "no_arg"))
            if event == no_arg:
                raise ValueError(Payment.MISSING_EVENT_KW_ERROR_MSG)
            if not isinstance(event, StripeEventData):
                raise ValueError(Payment.ARG_IS_NOT_EVENT_TYPE_ERROR_MSG)
            if event_types and event.type not in event_types:
                raise ValueError(Payment.EVENT_IS_UNEXPECTED_TYPE_ERROR_MSG_TEMPLATE.format(event_types=event_types))
            return func(*args, **kwargs)

        return wrapper

    return decorator


class Payment(IndexedTimeStampedModel):
    """Represents a single payment event for a contribution. This could be a refund or a successful charge."""

    contribution = models.ForeignKey("contributions.Contribution", on_delete=models.CASCADE)
    net_amount_paid = models.IntegerField()
    gross_amount_paid = models.IntegerField()
    amount_refunded = models.IntegerField()
    stripe_balance_transaction_id = models.CharField(max_length=255, unique=True)
    # TODO: [DEV-4379] Make transaction_time non-nullable once we've run data migration for existing payments
    # NB: this is the time the payment was created in Stripe, not the time it was created in NRE. Additionally, note that we
    # source this from the .created property on the balance transaction associated with the payment. There is also a
    # Stripe payment intent, invoice, or charge associated with the balance transaction that has a .created property. We look
    # to balance transaction since it is common to each of: one-time payment, recurring payment, and refund.
    # Ultimately, this field gives us a way to sort by recency.
    transaction_time = models.DateTimeField(db_index=True, null=True)

    MISSING_EVENT_KW_ERROR_MSG = "Expected a keyword argument called `event`"
    ARG_IS_NOT_EVENT_TYPE_ERROR_MSG = "Expected `event` to be an instance of `StripeEventData`"
    EVENT_IS_UNEXPECTED_TYPE_ERROR_MSG_TEMPLATE = (
        "Expected `event` to be in the following list of event types: {event_types}"
    )

    def __str__(self):
        return f"Payment {self.id} for contribution {self.contribution.id} and balance transaction {self.stripe_balance_transaction_id}"

    @property
    def stripe_account_id(self):
        """Convenience method for referencing the Stripe account ID associated with the payment provider for this payment"""
        return self.contribution.donation_page.revenue_program.payment_provider.stripe_account_id

    @classmethod
    def get_subscription_id_for_balance_transaction(
        cls, balance_transaction_id: str, stripe_account_id: str
    ) -> str | None:
        bt = stripe.BalanceTransaction.retrieve(
            balance_transaction_id, stripe_account=stripe_account_id, expand=["source.invoice"]
        )
        return getattr(bt.source.invoice, "subscription", None) if bt.source.invoice else None

    @classmethod
    def get_contribution_for_recurrence(
        cls, balance_transaction_id: str, stripe_account_id: str
    ) -> Contribution | None:
        subscription_id = cls.get_subscription_id_for_balance_transaction(
            balance_transaction_id,
            stripe_account_id,
        )
        try:
            return Contribution.objects.get(provider_subscription_id=subscription_id) if subscription_id else None
        except Contribution.DoesNotExist:
            logger.warning(
                "Could not find a contribution for balance transaction %s for subscription %s for account %s",
                balance_transaction_id,
                subscription_id,
                stripe_account_id,
            )
            return None

    @staticmethod
    def _ensure_pi_has_single_charge(pi: stripe.PaymentIntent, event_id: str) -> None:
        if not (pi and pi.charges and pi.charges.data and len(pi.charges.data) == 1):
            raise ValueError("Cannot link payment intent to a single balance transaction")

    @classmethod
    @ensure_stripe_event(["payment_intent.succeeded"])
    def get_contribution_and_balance_transaction_for_payment_intent_succeeded_event(
        cls, event: StripeEventData
    ) -> (Contribution | None, stripe.BalanceTransaction | None):
        """Attempt to pair a Stripe event with an NRE contribution and balance transaction.

        Returns a tuple of contribution, balance_transaction. Either or both may be None.

        If there is more than one possible balance transaction (because > 1 charge on PI), we raise an exception. This is not
        expected, but the data model would allow for it.
        """
        # we re-retrieve the PI because its state could have changed between the time the event was received and now
        pi = stripe.PaymentIntent.retrieve(
            event.data["object"]["id"],
            stripe_account=event.account,
        )
        try:
            cls._ensure_pi_has_single_charge(pi, event.id)
            balance_transaction_id = pi.charges.data[0].balance_transaction
        except ValueError:
            balance_transaction_id = None
        if not balance_transaction_id:
            logger.warning(
                "Could not find a balance transaction for PI %s associated with event %s",
                getattr(pi, "id", "<no-pi>"),
                event.id,
            )
            balance_transaction = None
        else:
            balance_transaction = stripe.BalanceTransaction.retrieve(
                balance_transaction_id,
                stripe_account=event.account,
            )
        try:
            contribution = (
                Contribution.objects.get(provider_payment_id=pi.id)
                # pi.charges.data[0].invoice -- when is it none
                if pi.charges.data[0].description == "Subscription creation" or pi.charges.data[0].invoice is None
                else cls.get_contribution_for_recurrence(balance_transaction.id, event.account)
            )
        except Contribution.DoesNotExist:
            contribution = None
        if not contribution:
            logger.warning(
                "Could not find a contribution for PI %s associated with event %s",
                getattr(pi, "id", "<no-pi>"),
                event.id,
            )
        return contribution, balance_transaction

    @classmethod
    @ensure_stripe_event(["invoice.payment_succeeded"])
    def get_contribution_and_balance_transaction_for_invoice_payment_succeeded_event(
        cls, event: StripeEventData
    ) -> (Contribution | None, stripe.BalanceTransaction | None):
        pi = stripe.PaymentIntent.retrieve(
            event.data["object"]["payment_intent"],
            stripe_account=event.account,
            expand=["invoice"],
        )
        bt = stripe.BalanceTransaction.retrieve(
            pi.charges.data[0].balance_transaction,
            stripe_account=event.account,
            expand=["source.invoice"],
        )
        try:
            contribution = Contribution.objects.get(provider_subscription_id=pi.invoice.subscription)
        except Contribution.DoesNotExist:
            logger.debug("Could not find a contribution for event %s with PI id %s", event.id, event.data.object.id)
            contribution = None
        cls._ensure_pi_has_single_charge(pi, event.id)
        return contribution, bt

    @classmethod
    def _handle_create_payment(
        cls,
        contribution: Contribution | None,
        balance_transaction: stripe.BalanceTransaction | None,
        amount_refunded: int = 0,
        event_id: str = None,
    ) -> Payment:
        if not contribution:
            logger.warning("Cannot find contribution for event %s", event_id)
            raise ValueError("Could not find a contribution for this event")
        if not balance_transaction:
            logger.warning("Cannot find balance transaction for event %s", event_id)
            raise ValueError("Could not find a balance transaction for this event")
        payment, _ = Payment.objects.get_or_create(
            contribution=contribution,
            stripe_balance_transaction_id=balance_transaction.id,
            defaults={
                "net_amount_paid": balance_transaction.net,
                "amount_refunded": amount_refunded,
                "gross_amount_paid": balance_transaction.amount,
                "transaction_time": datetime.datetime.fromtimestamp(
                    balance_transaction.created, tz=datetime.timezone.utc
                ),
            },
        )
        return payment

    @classmethod
    @ensure_stripe_event(["payment_intent.succeeded"])
    def from_stripe_payment_intent_succeeded_event(cls, event: StripeEventData) -> Payment:
        (
            contribution,
            balance_transaction,
        ) = cls.get_contribution_and_balance_transaction_for_payment_intent_succeeded_event(event=event)

        # if matching contribution is a recurring one, we will no-op because we'll create payment in
        # `from_stripe_invoice_payment_succeeded_event` which should occur around the same time. We don't want to create
        # duplicate payment instances for the same transaction.
        if contribution and contribution.interval != ContributionInterval.ONE_TIME:
            logger.debug(
                "`Contribution.from_stripe_payment_intent_succeeded_event` called on contribution with ID %s which is a recurring contribution. "
                "Will not create a payment instance because it will be created in `from_stripe_invoice_payment_succeeded_event`",
                contribution.id,
            )
            return None
        return cls._handle_create_payment(
            contribution=contribution,
            balance_transaction=balance_transaction,
            event_id=event.id,
        )

    @classmethod
    @ensure_stripe_event(["charge.refunded"])
    def from_stripe_charge_refunded_event(cls, event: StripeEventData) -> Payment:
        pi = (
            stripe.PaymentIntent.retrieve(
                event.data["object"]["payment_intent"], stripe_account=event.account, expand=["invoice"]
            )
            if event.data["object"]["payment_intent"]
            else None
        )
        conditions = set()
        # we expect this to happen if it's a refund related to a one-time contribution or the initial payment associated with
        # a new Stripe subscription in case of recurring contribution.
        if pi:
            conditions.add(models.Q(provider_payment_id=pi.id))
        new_refunds = [
            x
            for x in event.data["object"]["refunds"]["data"]
            if x["id"] not in [y["id"] for y in event.data["previous_attributes"]["refunds"]["data"]]
        ]
        if len(new_refunds) > 1:
            logger.warning("Event contains more than 1 new refund, and can only process single for event %s", event.id)
            raise ValueError("Too many refunds")
        refund = new_refunds[0]
        bt = stripe.BalanceTransaction.retrieve(
            refund["balance_transaction"], stripe_account=event.account, expand=["source.invoice"]
        )
        # We expect this to happen when it's a refund related to a recurrence on a subscription
        if getattr(bt.source, "invoice", None) and (sub_id := pi.invoice.subscription):
            conditions.add(models.Q(provider_subscription_id=sub_id))
        if not conditions:
            logger.warning("Cannot find contribution for event (no conditions) %s", event.id)
            raise ValueError("Could not find a contribution for this event (no conditions)")
        try:
            contribution = Contribution.objects.get(reduce(or_, conditions))
        except (Contribution.MultipleObjectsReturned, Contribution.DoesNotExist):
            logger.exception("Cannot find contribution for event (no match) %s", event.id)
            raise ValueError("Could not find a contribution for this event (no match)")

        return Payment.objects.create(
            contribution=contribution,
            stripe_balance_transaction_id=bt.id,
            net_amount_paid=0,
            gross_amount_paid=0,
            amount_refunded=refund["amount"],
            transaction_time=datetime.datetime.fromtimestamp(bt.created, tz=datetime.timezone.utc),
        )

    @classmethod
    @ensure_stripe_event(["invoice.payment_succeeded"])
    def from_stripe_invoice_payment_succeeded_event(cls, event: StripeEventData) -> Payment:
        (
            contribution,
            balance_transaction,
        ) = cls.get_contribution_and_balance_transaction_for_invoice_payment_succeeded_event(event=event)
        payment = cls._handle_create_payment(
            contribution=contribution,
            balance_transaction=balance_transaction,
            event_id=event.id,
        )
        return payment
