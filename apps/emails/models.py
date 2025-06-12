import datetime
import logging
import typing

from django.conf import settings
from django.db import models
from django.template.loader import render_to_string

import nh3
import reversion
from markdownify import markdownify

from apps.common.models import IndexedTimeStampedModel
from apps.contributions.models import Contribution
from apps.emails.tasks import generate_email_data, send_templated_email


if typing.TYPE_CHECKING:
    from apps.emails.helpers import EmailCustomizationValues


# <span style> is allowed for font size adjustments
ALLOWED_TAGS = {"b", "i", "li", "ol", "p", "s", "span", "u", "ul"}
ALLOWED_ATTRIBUTES = {"span": {"style"}}


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


class EmailCustomization(IndexedTimeStampedModel):
    EMAIL_TYPES = [("contribution_receipt", "Contribution Receipt")]
    EMAIL_BLOCKS = [("message", "Main Message Body")]
    revenue_program = models.ForeignKey("organizations.RevenueProgram", on_delete=models.CASCADE)
    content_html = models.TextField(max_length=5000, help_text="HTML source code of the custom content")
    email_type = models.CharField(max_length=30, choices=EMAIL_TYPES, help_text="Type of email this relates to")
    email_block = models.CharField(
        max_length=30, choices=EMAIL_BLOCKS, help_text="Which block of content in an email this relates to"
    )

    class Meta:
        unique_together = (
            "revenue_program",
            "email_type",
            "email_block",
        )

    @property
    def content_plain_text(self) -> str:
        return markdownify(self.content_html)

    def save(self, *args, **kwargs):
        self.content_html = nh3.clean(self.content_html, attributes=ALLOWED_ATTRIBUTES, tags=ALLOWED_TAGS)
        super().save(*args, **kwargs)

    def as_dict(self) -> "EmailCustomizationValues":
        """Return a dictionary representation of the email customization.

        This is ultimately used to render customization opens in the email template.
        """
        return {"content_html": self.content_html, "content_plain_text": self.content_plain_text}
