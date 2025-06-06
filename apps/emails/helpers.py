import datetime
import zoneinfo
from typing import TypedDict

from django.utils import timezone


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
