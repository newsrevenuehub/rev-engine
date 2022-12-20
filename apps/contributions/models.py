import logging
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

import stripe
from slack_sdk.errors import SlackApiError

from apps.common.models import IndexedTimeStampedModel
from apps.emails.tasks import send_templated_email
from apps.slack.models import SlackNotificationTypes
from apps.slack.slack_manager import SlackManager
from apps.users.choices import Roles
from apps.users.models import RoleAssignmentResourceModelMixin, UnexpectedRoleType


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class ContributionIntervalError(Exception):
    pass


class ContributionStatusError(Exception):
    pass


class Contributor(IndexedTimeStampedModel):
    uuid = models.UUIDField(default=uuid.uuid4, primary_key=False, editable=False)
    email = models.EmailField(unique=True)

    @property
    def contributions_count(self):
        return self.contribution_set.count()

    @property
    def most_recent_contribution(self):
        return self.contribution_set.filter(status="paid").latest()

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


class ContributionInterval(models.TextChoices):
    ONE_TIME = "one_time", "One time"
    MONTHLY = "month", "Monthly"
    YEARLY = "year", "Yearly"


class ContributionStatus(models.TextChoices):
    PROCESSING = "processing", "processing"
    PAID = "paid", "paid"
    CANCELED = "canceled", "canceled"
    FAILED = "failed", "failed"
    FLAGGED = "flagged", "flagged"
    REJECTED = "rejected", "rejected"
    REFUNDED = "refunded", "refunded"


class CardBrand(models.TextChoices):
    AMEX = "amex", "Amex"
    DINERS = "diners", "Diners"
    DISCOVER = "discover", "Discover"
    JCB = "jcb", "JCB"
    MASTERCARD = "mastercard", "Mastercard"
    UNIONPAY = "unionpay", "UnionPay"
    VISA = "visa", "Visa"
    UNKNOWN = "unknown", "Unknown"


class PaymentType(models.TextChoices):
    ACH_CREDIT_TRANSFER = "ach_credit_transfer", "ACH Credit Transfer"
    ACH_DEBIT = "ach_debit", "ACH Debit"
    ACSS_DEBIT = "acss_debit", "ACSS Debit"
    ALIPAY = "alipay", "AliPay"
    AU_BECS_DEBIT = "au_becs_debit", "AU BECS Debit"
    BANCONTACT = "bancontact", "Bancontact"
    CARD = "card", "Card"
    CARD_PRESENT = "card_present", "Card Present"
    EPS = "eps", "EPS"
    GIROPAY = "giropay", "Giropay"
    IDEAL = "ideal", "Ideal"
    KLARNA = "klarna", "Klarna"
    MULTIBANCO = "multibanco", "Multibanco"
    P24 = "p24", "p24"
    SEPA_DEBIT = "sepa_debit", "Sepa Debit"
    SOFORT = "sofort", "Sofort"
    STRIPE_ACCOUNT = "stripe_account", "Stripe Account"
    WECHAT = "wechat", "WeChat"


class BadActorScores(models.IntegerChoices):
    INFORMATION = 0, "0 - Information"
    UNKNOWN = 1, "1 - Unknown"
    GOOD = 2, "2 - Good"
    SUSPECT = 3, "3 - Suspect"
    BAD = 4, "4 - Bad"
    SUPERBAD = 5, "5 - Very Bad"


class Contribution(IndexedTimeStampedModel, RoleAssignmentResourceModelMixin):
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
    def formatted_amount(self):
        return f"{'{:.2f}'.format(self.amount / 100)} {self.currency.upper()}"

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

    def get_payment_manager_instance(self):
        """
        Selects the correct payment manager for this Contribution, then instantiates it.
        """
        from apps.contributions.payment_managers import PaymentManager

        manager_class = PaymentManager.get_subclass(self)
        return manager_class(contribution=self)

    def process_flagged_payment(self, reject=False):
        payment_manager = self.get_payment_manager_instance()
        payment_manager.complete_payment(reject=reject)

    def fetch_stripe_payment_method(self):
        if not self.provider_payment_method_id:
            raise ValueError("Cannot fetch PaymentMethod without provider_payment_method_id")
        return stripe.PaymentMethod.retrieve(
            self.provider_payment_method_id,
            stripe_account=self.revenue_program.payment_provider.stripe_account_id,
        )

    def send_slack_notifications(self, event_type):
        """
        For now, we only send Slack notifications on successful payment.
        """
        if event_type == SlackNotificationTypes.SUCCESS:
            slack_manager = SlackManager()
            slack_manager.publish_contribution(self, event_type=SlackNotificationTypes.SUCCESS)

    def save(self, *args, **kwargs):
        # Calling save with kwargs "slack_notification" causes save method to trigger slack notifications
        slack_notification = kwargs.pop("slack_notification", None)
        if slack_notification:
            try:
                self.send_slack_notifications(slack_notification)
            except SlackApiError:
                logger.info("Something went wrong sending Slack notification")
        # Check if we should update stripe payment method details
        previous = self.__class__.objects.filter(pk=self.pk).first()
        logger.info(
            "`Contribution.save` called. Existing contribution has id: %s and provider_payment_method_id: %s \n The save value for provider_payment_method_id is %s",
            getattr(previous, "id"),
            getattr(previous, "provider_payment_method_id"),
            self.provider_payment_method_id,
        )
        # this is failing because provider_payment_method_id is blank at time webhook gets called
        if (
            (previous and previous.provider_payment_method_id != self.provider_payment_method_id)
            or not previous
            and self.provider_payment_method_id
        ):
            # If it's an update and the previous pm is different from the new pm, or it's new and there's a pm id...
            # ...get details on payment method
            self.provider_payment_method_details = self.fetch_stripe_payment_method()
        super().save(*args, **kwargs)

    @classmethod
    def filter_queryset_for_contributor(cls, contributor, queryset):
        return queryset.filter(contributor=contributor).all()

    @classmethod
    def filter_queryset_by_role_assignment(cls, role_assignment, queryset):
        if role_assignment.role_type == Roles.HUB_ADMIN:
            return queryset.all()
        elif role_assignment.role_type == Roles.ORG_ADMIN:
            return queryset.filter(donation_page__revenue_program__organization=role_assignment.organization)
        elif role_assignment.role_type == Roles.RP_ADMIN:
            return queryset.filter(donation_page__revenue_program__in=role_assignment.revenue_programs.all())
        else:
            raise UnexpectedRoleType(f"`{role_assignment.role_type}` is not a valid role type")

    def create_stripe_customer(
        self,
        first_name=None,
        last_name=None,
        phone=None,
        mailing_street=None,
        mailing_city=None,
        mailing_state=None,
        mailing_postal_code=None,
        mailing_country=None,
        **kwargs,
    ):
        """Create a Stripe customer using contributor email"""
        address = {
            "line1": mailing_street,
            "city": mailing_city,
            "state": mailing_state,
            "postal_code": mailing_postal_code,
            "country": mailing_country,
        }
        name = " ".join(x for x in [first_name, last_name] if x)
        customer = stripe.Customer.create(
            email=self.contributor.email,
            address=address,
            shipping={"address": address, "name": name},
            name=name,
            phone=phone,
            stripe_account=self.donation_page.revenue_program.payment_provider.stripe_account_id,
        )
        self.provider_customer_id = customer["id"]
        self.save()
        return customer

    def create_stripe_one_time_payment_intent(self):
        """Create a Stripe PaymentIntent and attach its id and client_secret to the contribution

        See https://stripe.com/docs/api/payment_intents/create for more info
        """
        intent = stripe.PaymentIntent.create(
            amount=self.amount,
            currency=self.currency,
            customer=self.provider_customer_id,
            metadata=self.contribution_metadata,
            receipt_email=self.contributor.email,
            statement_descriptor_suffix=self.donation_page.revenue_program.stripe_statement_descriptor_suffix,
            stripe_account=self.donation_page.revenue_program.stripe_account_id,
            capture_method="manual" if self.status == ContributionStatus.FLAGGED else "automatic",
        )
        self.provider_payment_id = intent["id"]
        # we don't want to save `` because it can be used to authorize payment attempt
        # so want to keep surface area small as possible
        self.payment_provider_data = dict(intent) | {"client_secret": None}
        self.save()
        return intent

    def create_stripe_setup_intent(self, metadata):
        setup_intent = stripe.SetupIntent.create(
            customer=self.provider_customer_id,
            stripe_account=self.donation_page.revenue_program.payment_provider.stripe_account_id,
            metadata=metadata,
        )
        self.provider_setup_intent_id = setup_intent["id"]
        self.save()
        return setup_intent

    def create_stripe_subscription(
        self,
        metadata=None,
        default_payment_method=None,
        off_session=False,
        error_if_incomplete=False,
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
        self.payment_provider_data = subscription
        self.provider_subscription_id = subscription["id"]
        self.save()
        return subscription

    def cancel(self):
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
        elif self.status == ContributionStatus.FLAGGED:
            stripe.PaymentMethod.retrieve(
                self.provider_payment_method_id,
                stripe_account=self.donation_page.revenue_program.stripe_account_id,
            ).detach()

        self.status = ContributionStatus.CANCELED
        self.save()

    def handle_thank_you_email(self, contribution_received_at=None):
        """Send a thank you email to contribution's contributor if org is configured to have NRE send thank you email"""
        contribution_received_at = contribution_received_at if contribution_received_at else timezone.now()
        if self.revenue_program.organization.send_receipt_email_via_nre:
            send_templated_email.delay(
                self.contributor.email,
                "Thank you for your contribution!",
                "nrh-default-contribution-confirmation-email.txt",
                "nrh-default-contribution-confirmation-email.html",
                {
                    "contribution_date": contribution_received_at.strftime("%m-%d-%y"),
                    "contributor_email": self.contributor.email,
                    "contribution_amount": self.formatted_amount,
                    "contribution_interval": self.interval,
                    "contribution_interval_display_value": self.interval if self.interval != "one_time" else None,
                    "copyright_year": contribution_received_at.year,
                    "org_name": self.revenue_program.organization.name,
                },
            )

    @staticmethod
    def stripe_metadata(contributor, validated_data, referer):
        """Generate dict of metadata to be sent to Stripe when creating a PaymentIntent or Subscription"""
        return {
            "source": settings.METADATA_SOURCE,
            "schema_version": settings.METADATA_SCHEMA_VERSION,
            "contributor_id": contributor.id,
            "agreed_to_pay_fees": validated_data["agreed_to_pay_fees"],
            "donor_selected_amount": validated_data["donor_selected_amount"],
            "reason_for_giving": validated_data["reason_for_giving"],
            "honoree": validated_data.get("honoree"),
            "in_memory_of": validated_data.get("in_memory_of"),
            "comp_subscription": validated_data.get("comp_subscription"),
            "swag_opt_out": validated_data.get("swag_opt_out"),
            "swag_choice": validated_data.get("swag_choice"),
            "referer": referer,
            "revenue_program_id": validated_data["page"].revenue_program.id,
            "revenue_program_slug": validated_data["page"].revenue_program.slug,
            "sf_campaign_id": validated_data.get("sf_campaign_id"),
        }
