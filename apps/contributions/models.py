import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

import stripe
from addict import Dict as AttrDict

from apps.common.models import IndexedTimeStampedModel
from apps.emails.tasks import send_templated_email
from apps.slack.models import SlackNotificationTypes
from apps.slack.slack_manager import SlackManager
from apps.users.choices import Roles
from apps.users.models import RoleAssignmentResourceModelMixin, UnexpectedRoleType


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

    def create_stripe_customer(
        self,
        rp_stripe_account_id,
        customer_name=None,
        phone=None,
        street=None,
        city=None,
        state=None,
        postal_code=None,
        country=None,
        metadata=None,
    ):
        """Create a Stripe customer using contributor email"""
        address = {
            "line1": street,
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


class Contribution(IndexedTimeStampedModel, RoleAssignmentResourceModelMixin):
    amount = models.IntegerField(help_text="Stored in cents")
    currency = models.CharField(max_length=3, default="usd")
    reason = models.CharField(max_length=255, blank=True)

    interval = models.CharField(max_length=8, choices=ContributionInterval.choices)

    payment_provider_used = models.CharField(max_length=64)
    payment_provider_data = models.JSONField(null=True)
    provider_payment_id = models.CharField(max_length=255, blank=True, null=True)
    # This is the `client_id` value in the response from StripeAPI after creating a
    # Stripe PaymentElement or Subscription
    provider_client_secret_id = models.CharField(max_length=255, blank=True, null=True)
    provider_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    provider_customer_id = models.CharField(max_length=255, blank=True, null=True)
    provider_payment_method_id = models.CharField(max_length=255, blank=True, null=True)
    provider_payment_method_details = models.JSONField(null=True)

    last_payment_date = models.DateTimeField(null=True)

    contributor = models.ForeignKey("contributions.Contributor", on_delete=models.SET_NULL, null=True)
    donation_page = models.ForeignKey("pages.DonationPage", on_delete=models.PROTECT, null=True)

    bad_actor_score = models.IntegerField(null=True)
    bad_actor_response = models.JSONField(null=True)
    flagged_date = models.DateTimeField(null=True)
    contribution_metadata = models.JSONField(null=True)

    status = models.CharField(max_length=10, choices=ContributionStatus.choices, null=True)

    class Meta:
        get_latest_by = "modified"
        ordering = ["-created"]

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

    @property
    def billing_details(self) -> AttrDict:
        payment_provider_data = AttrDict(self.payment_provider_data).data.object
        return (payment_provider_data.charges.data or [AttrDict()])[0].billing_details

    @property
    def billing_name(self) -> str:
        return self.billing_details.name or ""

    @property
    def billing_email(self) -> str:
        return self.billing_details.email or ""

    @property
    def billing_phone(self) -> str:
        return self.billing_details.phone or ""

    @property
    def billing_address(self) -> str:
        order = ("line1", "line2", "city", "state", "postal_code", "country")
        return ",".join([self.billing_details.address[x] for x in order])

    @property
    def formatted_donor_selected_amount(self) -> str:
        if amount := (self.contribution_metadata or {}).get("donor_selected_amount"):
            return f"{amount} {self.currency.upper()}"
        else:
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
        if not self.bad_actor_score:
            return None
        return self.BAD_ACTOR_SCORES[self.bad_actor_score][1]

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
            self.send_slack_notifications(slack_notification)

        # Check if we should update stripe payment method details
        previous = self.__class__.objects.filter(pk=self.pk).first()
        # TODO: [DEV-3026]
        if (
            (previous and previous.provider_payment_method_id != self.provider_payment_method_id)
            or not previous
            and self.provider_payment_method_id
        ):
            # If it's an update and the previous pm is different from the new pm, or it's new and there's a pm id...
            # ...get details on payment method
            pm = self.fetch_stripe_payment_method()
            # note on conditionality here (testing)
            if pm:
                self.provider_payment_method_details = pm

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

    def create_stripe_one_time_payment_intent(self, stripe_customer_id, metadata):
        """Create a Stripe PaymentIntent and attach its id and client_secret to the contribution

        See https://stripe.com/docs/api/payment_intents/create for more info
        """
        intent = stripe.PaymentIntent.create(
            amount=self.amount,
            currency=self.currency,
            customer=stripe_customer_id,
            metadata=metadata,
            receipt_email=self.contributor.email,
            statement_descriptor_suffix=self.donation_page.revenue_program.stripe_statement_descriptor_suffix,
            stripe_account=self.donation_page.revenue_program.stripe_account_id,
        )
        self.provider_payment_id = intent["id"]
        self.provider_client_secret_id = intent["client_secret"]
        self.provider_customer_id = intent["customer"]
        self.save()
        return intent

    def create_stripe_subscription(self, stripe_customer_id, metadata):
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
            customer=stripe_customer_id,
            items=[
                {
                    "price_data": price_data,
                }
            ],
            stripe_account=self.donation_page.revenue_program.payment_provider.stripe_account_id,
            metadata=metadata,
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
        )
        self.payment_provider_data = subscription
        self.provider_subscription_id = subscription["id"]
        self.provider_customer_id = subscription["customer"]
        self.provider_client_secret_id = subscription["latest_invoice"]["payment_intent"]["client_secret"]
        self.save()
        return subscription

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
