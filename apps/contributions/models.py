from django.db import models

from apps.common.models import IndexedTimeStampedModel


class Contributor(IndexedTimeStampedModel):
    email = models.EmailField(unique=True)

    @property
    def contributions_count(self):
        return self.contribution_set.count()

    @property
    def most_recent_contribution(self):
        return self.contribution_set.filter(status="paid").latest()

    def __str__(self):
        return self.email


class Contribution(IndexedTimeStampedModel):
    amount = models.IntegerField(help_text="Stored in cents")
    currency = models.CharField(max_length=3, default="usd")
    reason = models.CharField(max_length=255, blank=True)

    INTERVAL_ONE_TIME = (
        "one_time",
        "One time",
    )
    INTERVAL_MONTHLY = ("month", "Monthly")
    INTERVAL_YEARLY = ("year", "Yearly")
    INTERVAL_CHOICES = (INTERVAL_ONE_TIME, INTERVAL_MONTHLY, INTERVAL_YEARLY)
    interval = models.CharField(max_length=8, choices=INTERVAL_CHOICES)

    payment_provider_used = models.CharField(max_length=64)
    payment_provider_data = models.JSONField(null=True)
    provider_payment_id = models.CharField(max_length=255, blank=True, null=True)
    provider_customer_id = models.CharField(max_length=255, blank=True, null=True)
    provider_payment_method_id = models.CharField(max_length=255, blank=True, null=True)

    PAYMENT_SUCCEEDED = ("succeeded", "Succeeded")
    PAYMENT_FAILED = ("failed", "Failed")
    PAYMENT_STATUS_CHOICES = [PAYMENT_SUCCEEDED, PAYMENT_FAILED]
    last_payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, null=True)
    last_payment_date = models.DateTimeField(null=True)

    contributor = models.ForeignKey("contributions.Contributor", on_delete=models.SET_NULL, null=True)
    donation_page = models.ForeignKey("pages.DonationPage", on_delete=models.SET_NULL, null=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.SET_NULL, null=True)

    bad_actor_score = models.IntegerField(null=True)
    bad_actor_response = models.JSONField(null=True)
    flagged_date = models.DateTimeField(null=True)

    PROCESSING = (
        "processing",
        "processing",
    )
    CANCELED = (
        "canceled",
        "canceled",
    )
    FLAGGED = (
        "flagged",
        "flagged",
    )
    FAILED = (
        "failed",
        "failed",
    )
    REJECTED = (
        "rejected",
        "rejected",
    )
    PAID = (
        "paid",
        "paid",
    )
    STATUSES = [PROCESSING, PAID, CANCELED, FAILED, FLAGGED, REJECTED]
    status = models.CharField(max_length=10, choices=STATUSES, null=True)

    def __str__(self):
        return f"{self.formatted_amount}, {self.created.strftime('%Y-%m-%d %H:%M:%S')}"

    @property
    def formatted_amount(self):
        return f"{float(self.amount / 100)} {self.currency.upper()}"

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

    class Meta:
        get_latest_by = "modified"
