import datetime
import logging
from dataclasses import asdict

from django.conf import settings
from django.db import models
from django.template.loader import render_to_string


import reversion

from apps.common.models import IndexedTimeStampedModel
from apps.contributions.models import Contribution
from apps.emails.tasks import generate_email_data, send_templated_email


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class TransactionalEmailNames(models.TextChoices):
    FAILED_PAYMENT_NOTIFICATION = "failed-payment-notification", "failed payment"


class TransactionalEmailRecord(IndexedTimeStampedModel):
    """A record of a transactional email sent for a contribution."""

    contribution = models.ForeignKey(Contribution, on_delete=models.CASCADE)
    name = models.CharField(max_length=50, choices=TransactionalEmailNames.choices)
    sent_on = models.CharField(max_length=50, default="pending")

    def __str__(self):
        return f"TransactionalEmailRecord #{self.pk} ({self.name}) for {self.contribution.pk} sent {self.sent_on}"

    @staticmethod
    def handle_failed_payment_notification(contribution: Contribution) -> None:
        """Send a failed payment notification email to the contributor and save a record of the email."""
        logger.info("Sending failed payment notification email for contribution %s", contribution.pk)
        # In future version we should add a check to prevent double send, with optinal override
        data = generate_email_data(contribution)
        send_templated_email(
            to=contribution.contributor.email,
            subject=f"Your payment to {contribution.revenue_program.name} has failed",
            message_as_text=render_to_string(
                "failed-payment-notification.txt",
                data,
            ),
            message_as_html=render_to_string(
                "failed-payment-notification.html",
                data,
            ),
        )
        with reversion.create_revision():
            TransactionalEmailRecord.objects.create(
                contribution=contribution,
                name=TransactionalEmailNames.FAILED_PAYMENT_NOTIFICATION,
                sent_on=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            )
            reversion.set_comment("Created by TransactionalEmailRecord.handle_failed_payment_notification")

        # TODO send event
        # TODO activity log
