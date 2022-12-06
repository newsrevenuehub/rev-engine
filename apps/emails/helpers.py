import zoneinfo

from django.utils import timezone

import pytz


def convert_to_timezone(utctime, selected_timezone=None):
    fmt = "%m-%d-%y %H:%M %Z"
    utc = utctime.replace(tzinfo=pytz.UTC)
    if selected_timezone:
        localtz = utc.astimezone(zoneinfo.ZoneInfo(selected_timezone))
    else:
        # TODO: update function to get client's timezone
        localtz = utc.astimezone(timezone.get_current_timezone())
    return localtz.strftime(fmt)
