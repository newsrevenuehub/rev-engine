import datetime

from django.test import SimpleTestCase

import pytz

from apps.emails.helpers import convert_to_timezone_formatted


class HelperTests(SimpleTestCase):
    def test_convert_to_timezone_formatted_with_custom_format_string(self):
        test_date = datetime.datetime(2022, 12, 6)
        self.assertEqual(test_date.strftime("%m-%d-%y %H:%M %Z"), "12-06-22 00:00 ")

        tz_date = convert_to_timezone_formatted(test_date, "America/New_York", "%d/%m/%Y %H:%M %Z")
        self.assertEqual(tz_date, "05/12/2022 19:00 EST")

    def test_convert_to_timezone_formatted_with_selected_timezone_and_date_without_timezone_info(self):
        test_date = datetime.datetime(2022, 12, 6)
        self.assertEqual(test_date.strftime("%m-%d-%y %H:%M %Z"), "12-06-22 00:00 ")

        # Even with test_date not having timezone information, `convert_to_timezone_formatted` assumes it's UTC
        tz_date = convert_to_timezone_formatted(test_date, "America/New_York")
        self.assertEqual(tz_date, "12-05-22 19:00 EST")

    def test_convert_to_timezone_formatted_with_selected_timezone_and_date_with_UTC_timezone(self):
        test_date = datetime.datetime(2022, 12, 6)
        utc = test_date.replace(tzinfo=pytz.UTC)
        self.assertEqual(utc.strftime("%m-%d-%y %H:%M %Z"), "12-06-22 00:00 UTC")

        tz_date = convert_to_timezone_formatted(utc, "America/New_York")
        self.assertEqual(tz_date, "12-05-22 19:00 EST")

    def test_convert_to_timezone_formatted_without_selected_timezone(self):
        test_date = datetime.datetime(2022, 12, 6)
        self.assertEqual(test_date.strftime("%m-%d-%y %H:%M %Z"), "12-06-22 00:00 ")

        tz_date = convert_to_timezone_formatted(test_date)
        # Should be the same as the "timezone.get_current_timezone()" is UTC
        self.assertEqual(tz_date, "12-06-22 00:00 UTC")
