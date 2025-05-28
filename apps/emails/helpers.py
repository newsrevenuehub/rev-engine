import datetime
import zoneinfo
from typing import TypedDict

from django.db.models import QuerySet
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


class ContributionReceiptEmailCustomizationsDict(TypedDict):
    message: str | None


class EmailCustomizationsDict(TypedDict):
    contribution_receipt: ContributionReceiptEmailCustomizationsDict


def make_customizations_dict(customizations: QuerySet[EmailCustomization]) -> EmailCustomizationsDict:
    """Transform a queryset of email customizations into a nested dict."""
    result: EmailCustomizationsDict = {"contribution_receipt": {"message": None}}
    for customization in customizations:
        result[customization.email_type][customization.email_block] = customization
    return result
