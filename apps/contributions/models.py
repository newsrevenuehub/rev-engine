import uuid

from django.db import models

import stripe

from apps.common.models import IndexedTimeStampedModel
from apps.contributions.utils import get_hub_stripe_api_key
from apps.slack.models import SlackNotificationTypes
from apps.slack.slack_manager import SlackManager


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


class Contribution(IndexedTimeStampedModel):
    amount = models.IntegerField(help_text="Stored in cents")
    currency = models.CharField(max_length=3, default="usd")
    reason = models.CharField(max_length=255, blank=True)

    interval = models.CharField(max_length=8, choices=ContributionInterval.choices)

    payment_provider_used = models.CharField(max_length=64)
    payment_provider_data = models.JSONField(null=True)
    provider_payment_id = models.CharField(max_length=255, blank=True, null=True)
    provider_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    provider_customer_id = models.CharField(max_length=255, blank=True, null=True)
    provider_payment_method_id = models.CharField(max_length=255, blank=True, null=True)
    provider_payment_method_details = models.JSONField(null=True)

    last_payment_date = models.DateTimeField(null=True)

    contributor = models.ForeignKey("contributions.Contributor", on_delete=models.SET_NULL, null=True)
    donation_page = models.ForeignKey("pages.DonationPage", on_delete=models.SET_NULL, null=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.SET_NULL, null=True)

    bad_actor_score = models.IntegerField(null=True)
    bad_actor_response = models.JSONField(null=True)
    flagged_date = models.DateTimeField(null=True)
    contribution_metadata = models.JSONField(null=True)

    status = models.CharField(max_length=10, choices=ContributionStatus.choices, null=True)

    class Meta:
        get_latest_by = "modified"

    def __str__(self):
        return f"{self.formatted_amount}, {self.created.strftime('%Y-%m-%d %H:%M:%S')}"

    @property
    def formatted_amount(self):
        return f"{'{:.2f}'.format(self.amount / 100)} {self.currency.upper()}"

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
            api_key=get_hub_stripe_api_key(),
            stripe_account=self.organization.stripe_account_id,
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
        if (
            (previous and previous.provider_payment_method_id != self.provider_payment_method_id)
            or not previous
            and self.provider_payment_method_id
        ):
            # If it's an update and the previous pm is different from the new pm, or it's new and there's a pm id...
            # ...get details on payment method
            self.provider_payment_method_details = self.fetch_stripe_payment_method()
        super().save(*args, **kwargs)


def _get_contributor_id(payment_manager):
    return payment_manager.get_or_create_contributor().pk


def _get_rev_program_id(payment_manager):
    return payment_manager.get_donation_page().pk


def _get_rev_program_slug(payment_manager):
    # revenue_program isn't necessarily availabe on payment_manager at time of
    # instantiation
    rev_program = payment_manager.revenue_program
    if not rev_program:
        rev_program = payment_manager.get_revenue_program()
    return rev_program.slug


class ContributionMetadata(IndexedTimeStampedModel):
    """
    ContributionMetadata provides a model that allows admins to add form fields to the AdditionalInfo editor for
    inclusion in payment provider metadata.

    Currently the only implemented type is Text input which renders a `text` input on the DonationPage.

    key: (Required)
        The expected key in the metadata object sent to the provider: EXAMPLE: first_name, address1

    label: (Required)
        The display value that is shown to identify the form field on the page

    default_value: (Optional)
        A value that will be added to the meta object, if it is not overridden by input from the form.

    additional_help_text: (Optional)
        This text will display below the form field to give more context about the intent of the field.

    metadata_type: (Optional)
        Identifies what type of element will appear in the form.

    payment_processor: (Optional)
        This is a placeholder for now, but if other payment processors are added in the future this would be
        used to filter for specific metadata requirements of the processor. Fixed at "stripe" for now.

    processor_object:  (Required)
        This is meant to identify (if applicable) on which object the payment processor the metadata should be
        included.
             ALL: metadata that should be attached to every processor object.
         PAYMENT: metadata that should be attached to PaymentIntents and Subscriptions.
        CUSTOMER: metadata that should be attached to Customer.

    description:  (Optional)
        Text supplied as a guide for internal users so they understand how the object is meant to behave.

    donor_supplied: (Required)
        This identifies whether the metadata value will be supplied by the revengine system or by input from a
        donor on the page.

        If the value is False, this object will not be available for Org Admins to add to DonorPages
        If the value is True, this object will need a method, either default value or lookup method, to
        get the value from the system. If it is a system lookup add the key to the `lookup_map` dict with
        a callable function that returns the system value.

    """

    lookup_map = {
        "re_contributor_id": _get_contributor_id,
        "re_revenue_program_id": _get_rev_program_id,
        "re_revenue_program_slug": _get_rev_program_slug,
    }

    class MetadataType(models.TextChoices):
        TEXT = "TXT", "Text Values"

    class ProcessorObjects(models.TextChoices):
        PAYMENT = "PYMT", "Payment"
        CUSTOMER = "CUST", "Customer"
        ALL = "ALL", "All"

    key = models.CharField(max_length=255, unique=True)
    label = models.CharField(max_length=255)
    default_value = models.CharField(max_length=255, null=True, blank=True)
    additional_help_text = models.TextField(
        max_length=255,
        help_text="Will be displayed on the donation page underneath the label.",
        null=True,
        blank=True,
    )
    metadata_type = models.CharField(max_length=3, choices=MetadataType.choices, default=MetadataType.TEXT)
    payment_processor = models.CharField(max_length=32, default="stripe", null=True, blank=True)
    processor_object = models.CharField(
        max_length=4, choices=ProcessorObjects.choices, default=ProcessorObjects.PAYMENT
    )
    description = models.TextField(null=True, blank=True)
    donor_supplied = models.BooleanField(
        default=False,
        help_text="If on, this field will be available for Org Admins to add to a donation page. If off, this field will not be visible on the front end.",
    )

    @staticmethod
    def bundle_metadata(supplied: dict, processor_obj, payment_manager):
        processor_meta = ContributionMetadata.objects.filter(processor_object=processor_obj)
        meta_for_all = ContributionMetadata.objects.filter(processor_object=ContributionMetadata.ProcessorObjects.ALL)
        collected = {}
        lookup_map = ContributionMetadata.lookup_map
        for obj in processor_meta:
            if obj.key in lookup_map.keys():
                collected.update({obj.key: lookup_map[obj.key](payment_manager)})
                continue
            if obj.key in supplied.keys():
                collected.update({obj.key: supplied[obj.key]})
                continue
        for obj in meta_for_all:
            collected.update({obj.key: supplied.get(obj.key, obj.default_value)})
        final = {k: v for k, v in collected.items() if v is not None}
        return final

    class Meta:
        verbose_name_plural = "Contribution Metadata"

    def __str__(self):
        return self.label
