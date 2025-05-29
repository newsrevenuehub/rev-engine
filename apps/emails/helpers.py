import datetime
import zoneinfo
from dataclasses import InitVar, dataclass, field

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


@dataclass
class ContributionReceiptEmailCustomizations:
    """Customizations for contribution receipts."""

    message: EmailCustomization | None = field(default=None, init=False)
    revenue_program: InitVar[RevenueProgram]

    def __post_init__(self, revenue_program):
        for customization in EmailCustomization.objects.filter(
            revenue_program=revenue_program, email_type="contribution_receipt"
        ):
            # We'll have other email_block values eventually, so it doesn't make
            # sense to move this into the filter() above.
            if customization.email_block == "message":
                self.message = customization
