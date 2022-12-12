import datetime

import pytest
import pytz

from apps.emails.helpers import convert_to_timezone_formatted


@pytest.mark.parametrize(
    "timezone, fmt, isUTC, expect",
    [
        ("America/New_York", "%d/%m/%Y %H:%M %Z", False, "05/12/2022 19:00 EST"),
        ("America/New_York", None, False, "12-05-22 19:00 EST"),
        ("America/New_York", None, True, "12-05-22 19:00 EST"),
        (None, None, False, "12-06-22 00:00 UTC"),
    ],
)
def test__convert_to_timezone_formatted(timezone, fmt, isUTC, expect):
    test_date = datetime.datetime(2022, 12, 6)

    if isUTC:
        test_date = test_date.replace(tzinfo=pytz.UTC)
    assert test_date.strftime("%m-%d-%y %H:%M %Z") == "12-06-22 00:00" + " UTC" if isUTC else " "

    tz_date = convert_to_timezone_formatted(test_date, timezone, fmt)
    assert tz_date == expect
