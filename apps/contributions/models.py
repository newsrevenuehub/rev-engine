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


class ContributionMetadata(IndexedTimeStampedModel):
    """
    Stores key and humanized key for metadata that can be offered
    """

    class MetadataType(models.TextChoices):
        TEXT = "TXT", "Text Values"
        BOOLEAN = "BLN", "True/False Values"

    key = models.CharField(max_length=255, unique=True)
    humanized_key = models.CharField(max_length=255)
    metadata_type = models.CharField(max_length=3, choices=MetadataType.choices, default=MetadataType.TEXT)
    payment_processor = models.CharField(max_length=32, default="stripe", null=True, blank=True)
    processor_object = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    available = models.BooleanField(
        default=False,
        help_text="If true this field is available within revengine (e.g. mailing_street). "
        "If true this will not show up in the front end list.",
    )

    class Meta:
        verbose_name_plural = "Contribution Metadata"

    def __str__(self):
        return self.humanized_key
