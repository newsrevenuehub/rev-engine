import logging
import typing
from datetime import date

from django.conf import settings
from django.db import IntegrityError, models, transaction
from django.utils import timezone

import reversion

from apps.contributions.models import Contribution
from apps.emails.tasks import generate_email_data, send_receipt_email


if typing.TYPE_CHECKING:  # pragma: no cover
    from apps.emails.helpers import EmailCustomizationValues

import nh3
from markdownify import markdownify

from apps.common.models import IndexedTimeStampedModel


# <span style> is allowed for font size adjustments
ALLOWED_TAGS = {"em", "li", "ol", "p", "s", "span", "strong", "u", "ul"}
ALLOWED_ATTRIBUTES = {"span": {"style"}}

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class TransactionalEmailNames(models.TextChoices):
    CONTRIBUTION_RECEIPT = "contribution_receipt", "Contribution Receipt"
    ANNUAL_PAYMENT_REMINDER = "annual_payment_reminder", "Annual Payment Reminder"


class EmailCustomization(IndexedTimeStampedModel):

    class EmailBlock(models.TextChoices):
        MESSAGE = "message", "Main Message Body"

    revenue_program = models.ForeignKey("organizations.RevenueProgram", on_delete=models.CASCADE)
    content_html = models.TextField(max_length=5000, help_text="HTML source code of the custom content")
    email_type = models.CharField(
        max_length=30, choices=TransactionalEmailNames.choices, help_text="Type of email this relates to"
    )
    email_block = models.CharField(
        max_length=30, choices=EmailBlock.choices, help_text="Which block of content in an email this relates to"
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


class TransactionalEmailRecord(IndexedTimeStampedModel):
    """A record of a transactional email sent for a contribution."""

    contribution = models.ForeignKey("contributions.Contribution", on_delete=models.CASCADE)
    name = models.CharField(max_length=50, choices=TransactionalEmailNames.choices)
    sent_on = models.DateTimeField(default=timezone.now, help_text="When the email was sent")
    unique_identifier = models.CharField(
        max_length=300,
        null=True,
        blank=True,
        help_text=(
            "A unique identifier for the email, such as a webhook event ID or similar to ensure transactional "
            "emails are not sent multiple times for the same event."
        ),
    )

    # We expect to add additional fields to uniqueness constraint in the future as we add more email types.
    # Specifically, we expect to eventually store webhook event IDs here to ensure we don't send the same email
    # multiple times for the same webhook event.
    class Meta:
        unique_together = (
            "contribution",
            "name",
            "unique_identifier",
        )

    def __str__(self):
        return f"TransactionalEmailRecord #{self.pk} ({self.name}) for {self.contribution.pk} sent {self.sent_on}"

    @staticmethod
    def handle_annual_payment_reminder(
        contribution: Contribution, unique_identifier: str, next_charge_date: date
    ) -> None:
        """If warranted, trigger an annual payment reminder email to the contributor."""
        logger.info("Running for contribution %s", contribution.pk)
        if contribution.revenue_program.organization.disable_reminder_emails:
            logger.info(
                "Will not send annual payment reminder email for contribution %s, "
                "organization does not send annual payment reminder emails via NRE",
                contribution.pk,
            )
            return
        with transaction.atomic(), reversion.create_revision():
            _, created = TransactionalEmailRecord.objects.get_or_create(
                contribution=contribution,
                name=TransactionalEmailNames.ANNUAL_PAYMENT_REMINDER,
                unique_identifier=unique_identifier,
            )
            if not created:
                logger.info(
                    "Annual payment reminder email for contribution %s already sent, skipping email creation",
                    contribution.pk,
                )
            else:
                contribution.send_recurring_contribution_change_email(
                    f"Reminder: {contribution.revenue_program.name} scheduled contribution",
                    "recurring-contribution-email-reminder",
                    next_charge_date,
                )
                reversion.set_comment("Created by TransactionalEmailRecord.handle_annual_payment_reminder")

    @staticmethod
    def send_receipt_email(contribution: Contribution, show_billing_history: bool = True) -> None:
        """Send a receipt email to the contributor and save a record of the email."""
        logger.info("Running for receipt email for contribution %s", contribution.pk)
        data = generate_email_data(contribution, show_billing_history=show_billing_history)
        send_receipt_email(data)

    @classmethod
    def handle_receipt_email(cls, contribution: Contribution, show_billing_history: bool = True) -> None:
        """If warranted, trigger a receipt email to the contributor and save a record of the email."""
        logger.info("Running for for contribution %s", contribution.pk)
        if not contribution.revenue_program.organization.send_receipt_email_via_nre:
            logger.info(
                "Skipping sending receipt email for contribution %s, organization does not send receipt emails via NRE",
                contribution.pk,
            )
            return
        # If there's a problem sending the email, we want to rollback the email record creation.
        # We also want to ensure that if a separate process runs this same method conccurently with same contribution,
        # it cannot lead to multiple emails being sent.
        with transaction.atomic(), reversion.create_revision():
            try:
                TransactionalEmailRecord.objects.create(
                    contribution=contribution,
                    name=TransactionalEmailNames.CONTRIBUTION_RECEIPT,
                )
            except IntegrityError:
                logger.info(
                    "Receipt email for contribution %s already sent, skipping email creation",
                    contribution.pk,
                )
                return
            else:
                reversion.set_comment("Created by TransactionalEmailRecord.handle_receipt_email")
                # we only send email if the record was created successfully, but if there's an error in sending the email,
                # we'll get rollback of email record, which is what we want since we only want to create if sent (as best we can tell).
                cls.send_receipt_email(contribution=contribution, show_billing_history=show_billing_history)
