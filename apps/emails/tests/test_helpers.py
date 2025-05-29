import datetime
from zoneinfo import ZoneInfo

import pytest

from apps.emails.helpers import (
    convert_to_timezone_formatted,
    get_contribution_receipt_customizations,
)
from apps.emails.models import EmailCustomization


@pytest.mark.parametrize(
    ("timezone", "fmt", "is_UTC", "expect"),
    [
        ("America/New_York", "%d/%m/%Y %H:%M %Z", False, "05/12/2022 19:00 EST"),
        ("America/New_York", None, False, "12-05-22 19:00 EST"),
        ("America/New_York", None, True, "12-05-22 19:00 EST"),
        (None, None, False, "12-06-22 00:00 UTC"),
    ],
)
def test_convert_to_timezone_formatted(timezone, fmt, is_UTC, expect):
    test_date = datetime.datetime(2022, 12, 6)  # noqa: DTZ001 point of helper is to add tz

    if is_UTC:
        test_date = test_date.replace(tzinfo=ZoneInfo("UTC"))
    assert test_date.strftime("%m-%d-%y %H:%M %Z") == "12-06-22 00:00" + " UTC" if is_UTC else " "

    tz_date = (
        convert_to_timezone_formatted(test_date, timezone, fmt)
        if fmt
        else convert_to_timezone_formatted(test_date, timezone)
    )
    assert tz_date == expect


@pytest.mark.django_db
class TestGetContributionReceiptCustomizations:
    def test_sets_properties_when_present(self, revenue_program):
        customization = EmailCustomization(
            content_html="test-content",
            email_type="contribution_receipt",
            email_block="message",
            revenue_program=revenue_program,
        )
        customization.save()
        assert get_contribution_receipt_customizations(revenue_program=revenue_program)["message"] == customization

    def test_handles_no_data(self, revenue_program):
        assert get_contribution_receipt_customizations(revenue_program=revenue_program)["message"] is None
