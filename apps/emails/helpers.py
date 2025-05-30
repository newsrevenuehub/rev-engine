import datetime
import zoneinfo
from typing import TypedDict

from django.utils import timezone

from apps.emails.models import EmailCustomization
from apps.organizations.models import RevenueProgram


def convert_to_timezone_formatted(
    dt: datetime.datetime, selected_timezone: str | None = None, date_format="%m-%d-%y %H:%M %Z"
) -> str:
    if selected_timezone:
        localtz = dt.astimezone(zoneinfo.ZoneInfo(selected_timezone))
    else:
        # TODO @DC: show correct time/date/zone in transactional emails -> update function to get client's timezone
        # DEV-2904
        localtz = dt.astimezone(timezone.get_current_timezone())
    return localtz.strftime(date_format)


class EmailCustomizationValues(TypedDict):
    content_html: str
    content_plain_text: str


class ContributionReceiptCustomizations(TypedDict):
    message: EmailCustomizationValues | None


def get_contribution_receipt_email_customizations(revenue_program: RevenueProgram) -> ContributionReceiptCustomizations:
    """Generate dict for configuring cutomization of receipt email templates."""
    result: ContributionReceiptCustomizations = {"message": None}
    message_customization = EmailCustomization.objects.filter(
        revenue_program=revenue_program, email_type="contribution_receipt", email_block="message"
    ).first()
    if message_customization:
        result["message"] = message_customization.as_dict()
    return result
