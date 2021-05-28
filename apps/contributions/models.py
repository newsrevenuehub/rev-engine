from django.db import models

from apps.common.models import IndexedTimeStampedModel


class Contributor(IndexedTimeStampedModel):
    email = models.EmailField()

    @property
    def contributions_count(self):
        return self.contribution_set.count()

    @property
    def most_recent_contribution(self):
        return self.contribution_set.filter(payment_state="paid").latest()

    def __str__(self):
        return self.email


class Contribution(IndexedTimeStampedModel):
    amount = models.IntegerField(help_text="Stored in cents")
    currency = models.CharField(max_length=3, default="usd")
    reason = models.CharField(max_length=255, blank=True)

    payment_provider_used = models.CharField(max_length=64)
    payment_provider_data = models.JSONField(null=True)
    provider_reference_id = models.CharField(max_length=255)

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
    PAID = (
        "paid",
        "paid",
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
    PAYMENT_STATES = [PROCESSING, PAID, CANCELED, FAILED, FLAGGED, REJECTED]
    payment_state = models.CharField(max_length=10, choices=PAYMENT_STATES)

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

    def get_payment_manager_instance(self, serializer):
        from apps.contributions.payment_managers import PaymentManager

        manager_class = PaymentManager(serializer, contribution=self).get_subclass()
        return manager_class(serializer, contribution=self)

    class Meta:
        get_latest_by = "modified"
