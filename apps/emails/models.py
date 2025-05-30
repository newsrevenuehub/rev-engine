import typing

from django.db import models


if typing.TYPE_CHECKING:
    from apps.emails.helpers import EmailCustomizationValues

import nh3
from markdownify import markdownify

from apps.common.models import IndexedTimeStampedModel


# <span style> is allowed for font size adjustments
ALLOWED_TAGS = {"b", "i", "li", "ol", "p", "s", "span", "u", "ul"}
ALLOWED_ATTRIBUTES = {"span": {"style"}}


class EmailCustomization(IndexedTimeStampedModel):
    EMAIL_TYPES = [("contribution_receipt", "Contribution Receipt")]
    EMAIL_BLOCKS = [("message", "Main Message Body")]

    revenue_program = models.ForeignKey("organizations.RevenueProgram", null=True, on_delete=models.CASCADE)
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
