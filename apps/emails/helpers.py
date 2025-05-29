import datetime
import zoneinfo
from typing import TypedDict

from django.utils import timezone

from apps.emails.models import EmailCustomization


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


def customization_values(customization: EmailCustomization) -> EmailCustomizationValues:
    return {"content_html": customization.content_html, "content_plain_text": customization.content_plain_text}


def get_contribution_receipt_customizations(revenue_program) -> ContributionReceiptCustomizations:
    result: ContributionReceiptCustomizations = {"message": None}
    for customization in EmailCustomization.objects.filter(
        revenue_program=revenue_program, email_type="contribution_receipt"
    ):
        # We'll have other email_block values eventually, so it doesn't make
        # sense to move this into the filter() above.
        if customization.email_block == "message":
            result["message"] = customization_values(customization)
    return result
