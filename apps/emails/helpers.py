import zoneinfo

from django.utils import timezone


def convert_to_timezone_formatted(utc, selected_timezone=None, date_format="%m-%d-%y %H:%M %Z"):
    if selected_timezone:
        localtz = utc.astimezone(zoneinfo.ZoneInfo(selected_timezone))
    else:
        # TODO: DEV-2904 show correct time/date/zone in transactional emails -> update function to get client's timezone
        localtz = utc.astimezone(timezone.get_current_timezone())
    return localtz.strftime(date_format)
