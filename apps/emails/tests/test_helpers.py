import datetime
from zoneinfo import ZoneInfo

import pytest

from apps.emails.helpers import convert_to_timezone_formatted


@pytest.mark.parametrize(
    "timezone, fmt, is_UTC, expect",
    [
        ("America/New_York", "%d/%m/%Y %H:%M %Z", False, "05/12/2022 19:00 EST"),
        ("America/New_York", None, False, "12-05-22 19:00 EST"),
        ("America/New_York", None, True, "12-05-22 19:00 EST"),
        (None, None, False, "12-06-22 00:00 UTC"),
    ],
)
def test_convert_to_timezone_formatted(timezone, fmt, is_UTC, expect):
    test_date = datetime.datetime(2022, 12, 6)

    if is_UTC:
        test_date = test_date.replace(tzinfo=ZoneInfo("UTC"))
    assert test_date.strftime("%m-%d-%y %H:%M %Z") == "12-06-22 00:00" + " UTC" if is_UTC else " "

    tz_date = (
        convert_to_timezone_formatted(test_date, timezone, fmt)
        if fmt
        else convert_to_timezone_formatted(test_date, timezone)
    )
    assert tz_date == expect
