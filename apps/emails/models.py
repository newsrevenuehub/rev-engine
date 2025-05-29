from django.db import models

from apps.common.models import IndexedTimeStampedModel
from apps.contributions.models import Contribution


class TransactionalEmailNames(models.TextChoices):
    FAILED_PAYMENT_NOTIFICATION = "failed-payment-notification", "failed payment"


class TransactionalEmailRecord(IndexedTimeStampedModel):
    contribution = models.ForeignKey(Contribution, on_delete=models.CASCADE)
    name = models.CharField(max_length=50, choices=TransactionalEmailNames.choices)
    sent_on = models.CharField(max_length=50, default="pending")

    def __str__(self):
        return f"TransactionalEmailRecord #{self.pk} ({self.name}) for {self.contribution.pk} sent {self.sent_on}"
