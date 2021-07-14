import uuid

from django.db import models

from apps.common.models import IndexedTimeStampedModel
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
    provider_customer_id = models.CharField(max_length=255, blank=True, null=True)
    provider_payment_method_id = models.CharField(max_length=255, blank=True, null=True)

    last_payment_date = models.DateTimeField(null=True)

    contributor = models.ForeignKey("contributions.Contributor", on_delete=models.SET_NULL, null=True)
    donation_page = models.ForeignKey("pages.DonationPage", on_delete=models.SET_NULL, null=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.SET_NULL, null=True)

    bad_actor_score = models.IntegerField(null=True)
    bad_actor_response = models.JSONField(null=True)
    flagged_date = models.DateTimeField(null=True)

    status = models.CharField(max_length=10, choices=ContributionStatus.choices, null=True)

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

    def send_slack_notifications(self, event_type):
        """
        For now, we only send Slack notifications on successful payment.
        """
        if event_type == SlackNotificationTypes.SUCCESS:
            slack_manager = SlackManager()
            slack_manager.publish_contribution(self, event_type=SlackNotificationTypes.SUCCESS)

    def save(self, *args, **kwargs):
        """
        Calling save with kwargs "slack_notification" causes save method to trigger slack notifications
        """
        slack_notification = kwargs.pop("slack_notification", None)
        if slack_notification:
            self.send_slack_notifications(slack_notification)

        super().save(*args, **kwargs)

    class Meta:
        get_latest_by = "modified"


def _get_contributor_id(payment_manager):
    return payment_manager.get_or_create_contributor().pk


def _get_rev_program_id(payment_manager):
    return payment_manager.get_donation_page().pk


class ContributionMetadata(IndexedTimeStampedModel):
    """
    ContributionMetadata provides a model that allows admins to add form fields to the AdditionalInfo editor for
    inclusion in payment provider metadata.

    Currently the only implemented type is Text input which renders a `text` input on the DonationPage.

    key:
        The expected key in the metadata object sent to the provider: EXAMPLE: first_name, address1
        (Required)
    label:
        The display value that is shown to identify the form field on the page
        (Required)
    default_value:
        A value that will be added to the meta object, if it is not overridden by input from the form.
        (Optional)
    additional_help_text:
        This text will display below the form field to give more context about the intent of the field.
        (Optional)
    metadata_type:
        Identifies what type of element will appear in the form.
        (Optional)
    payment_processor:
        This is a placeholder for now, but if other payment processors are added in the future this would be
        used to filter for specific metadata requirements of the processor. Fixed at "stripe" for now.
        (Optional)
    processor_object:
        This is meant to identify (if applicable) on which object the payment processor the metadata should be
        included. EXAMPLE: PAYMENT will be attached to PaymentIntents and Subscriptions with Stripe.
        (Optional)
    description:
        Text supplied as a guide for internal users so they understand how the object is meant to behave.
        (Optional)
    donor_supplied:
        This identifies whether the metadata value will be supplied by the revengine system or by input from a
        donor on the page.

        If the value is False, this object will not be available for Org Admins to add to DonorPages
        If the value is True, this object will need a method, either default value or lookup method, to
        get the value from the system. If it is a system lookup add the key to the `lookup_map` dict with
        a callable function that returns the system value.
        (Required)

    """

    lookup_map = {
        "re_contributor_id": _get_contributor_id,
        "re_revenue_program_id": _get_rev_program_id,
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
        help_text="If true this field is available within revengine (e.g. mailing_street). "
        "If true this will not show up in the front end list.",
    )

    @staticmethod
    def bundle_metadata(results, supplied: dict, payment_manager):
        collected = {}
        lookup_map = ContributionMetadata.lookup_map
        for obj in results:
            if obj.key in lookup_map.keys():
                collected.update({obj.key: lookup_map[obj.key](payment_manager)})
                continue
            collected.update({obj.key: obj.default_value})
        final = collected | supplied
        final = {k: v for k, v in final.items() if v is not None}
        return final

    class Meta:
        verbose_name_plural = "Contribution Metadata"

    def __str__(self):
        return self.label
