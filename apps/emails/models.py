import datetime
import logging
import typing

from django.conf import settings
from django.db import models

import reversion

from apps.contributions.models import Contribution
from apps.emails.tasks import generate_email_data, send_receipt_email


if typing.TYPE_CHECKING:  # pragma: no cover
    from apps.emails.helpers import EmailCustomizationValues

import nh3
from markdownify import markdownify

from apps.common.models import IndexedTimeStampedModel


# <span style> is allowed for font size adjustments
ALLOWED_TAGS = {"b", "i", "li", "ol", "p", "s", "span", "u", "ul"}
ALLOWED_ATTRIBUTES = {"span": {"style"}}

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class EmailCustomization(IndexedTimeStampedModel):
    class EmailTypes(models.TextChoices):
        CONTRIBUTION_RECEIPT = "contribution_receipt", "Contribution Receipt"

    class EmailBlocks(models.TextChoices):
        MESSAGE = "message", "Main Message Body"

    revenue_program = models.ForeignKey("organizations.RevenueProgram", on_delete=models.CASCADE)
    content_html = models.TextField(max_length=5000, help_text="HTML source code of the custom content")
    email_type = models.CharField(max_length=30, choices=EmailTypes.choices, help_text="Type of email this relates to")
    email_block = models.CharField(
        max_length=30, choices=EmailBlocks.choices, help_text="Which block of content in an email this relates to"
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


class TransactionalEmailNames(models.TextChoices):
    RECEIPT_EMAIL = "receipt_email", "receipt email"


class TransactionalEmailRecord(IndexedTimeStampedModel):
    """A record of a transactional email sent for a contribution."""

    contribution = models.ForeignKey("contributions.Contribution", on_delete=models.CASCADE)
    name = models.CharField(max_length=50, choices=TransactionalEmailNames.choices)
    sent_on = models.DateTimeField(default=datetime.datetime.now)

    def __str__(self):
        return f"TransactionalEmailRecord #{self.pk} ({self.name}) for {self.contribution.pk} sent {self.sent_on}"

    @staticmethod
    def handle_receipt_email(contribution: Contribution, show_billing_history: bool = True) -> None:
        """Send a receipt email to the contributor and save a record of the email."""
        logger.info("Running for receipt email for contribution %s", contribution.pk)
        if not contribution.revenue_program.organization.send_receipt_email_via_nre:
            logger.info(
                "Skipping sending receipt email for contribution %s, organization does not send receipt emails via NRE",
                contribution.pk,
            )
            return
        if TransactionalEmailRecord.objects.filter(
            contribution=contribution,
            name=EmailCustomization.EmailTypes.CONTRIBUTION_RECEIPT,
        ).exists():
            logger.info(
                "Skipping sending receipt email for contribution %s, already sent",
                contribution.pk,
            )
            return
        data = generate_email_data(contribution, show_billing_history=show_billing_history)
        send_receipt_email(data)
        with reversion.create_revision():
            TransactionalEmailRecord.objects.create(
                contribution=contribution,
                name=EmailCustomization.EmailTypes.CONTRIBUTION_RECEIPT,
                sent_on=datetime.datetime.now(datetime.timezone.utc),
            )
            reversion.set_comment("Created by TransactionalEmailRecord.handle_receipt_email")
