import datetime

from django.test import SimpleTestCase

import pytz

from apps.emails.helpers import convert_to_timezone


class HelperTests(SimpleTestCase):
    def test_convert_to_timezone_with_selected_timezone(self):
        test_date = datetime.datetime(2022, 12, 6)

        utc = test_date.replace(tzinfo=pytz.UTC)
        self.assertEqual(utc.strftime("%m-%d-%y %H:%M %Z"), "12-06-22 00:00 UTC")

        tz_date = convert_to_timezone(test_date, "America/New_York")
        self.assertEqual(tz_date, "12-05-22 19:00 EST")

    def test_convert_to_timezone_without_selected_timezone(self):
        test_date = datetime.datetime(2022, 12, 6)

        utc = test_date.replace(tzinfo=pytz.UTC)
        self.assertEqual(utc.strftime("%m-%d-%y %H:%M %Z"), "12-06-22 00:00 UTC")

        tz_date = convert_to_timezone(test_date)
        # Should be the same as the "timezone.get_current_timezone()" is UTC
        self.assertEqual(tz_date, "12-06-22 00:00 UTC")
