from django.db import models

from apps.common.models import IndexedTimeStampedModel


class Contributor(IndexedTimeStampedModel):
    email = models.EmailField()

    @property
    def contributions_count(self):
        return self.contribution_set.count()

    @property
    def quarantined_contributions_count(self):
        return self.contribution_set.filter(is_quarantined=True).count()

    @property
    def most_recent_contribution(self):
        return self.contribution_set.filter(payment_state="paid").latest()

    def __str__(self):
        return self.email


class Contribution(IndexedTimeStampedModel):
    amount = models.IntegerField(help_text="Stored in cents")
    currency = models.CharField(max_length=3, default="usd")
    is_quarantined = models.BooleanField(default=False)
    payment_provider_data = models.JSONField(null=True)
    provider_reference_id = models.CharField(max_length=255)
    contributor = models.ForeignKey("contributions.Contributor", on_delete=models.SET_NULL, null=True)
    donation_page = models.ForeignKey("pages.DonationPage", on_delete=models.SET_NULL, null=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.SET_NULL, null=True)

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
    FAILED = (
        "failed",
        "failed",
    )
    PAYMENT_STATES = [PROCESSING, PAID, CANCELED, FAILED]
    payment_state = models.CharField(max_length=10, choices=PAYMENT_STATES)

    def __str__(self):
        return f"{self.formatted_amount}, {self.organization}"

    @property
    def formatted_amount(self):
        return f"{float(self.amount / 100)} {self.currency.upper()}"

    class Meta:
        get_latest_by = "modified"
