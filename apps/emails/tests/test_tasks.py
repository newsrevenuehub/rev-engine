import os
from unittest import TestCase
from unittest.mock import call, patch

from django.conf import settings

from apps.emails.tasks import send_templated_email_with_attachment


class TestTaskStripeContributions(TestCase):
    @patch("apps.emails.tasks.EmailMessage")
    def test_task_pull_serialized_stripe_contributions_to_cache(self, email_message):
        send_templated_email_with_attachment(
            "to@to.com",
            "This is a subject",
            "nrh-contribution-csv-email-body.txt",
            "nrh-contribution-csv-email-body.html",
            {"username": "Test", "logo_url": os.path.join(settings.SITE_URL, "static", "nre_logo_black_yellow.png")},
            "data",
            "text/csv",
            "contributions.csv",
        )
        calls = [
            call().attach(filename="contributions.csv", content="data".encode("utf-8"), mimetype="text/csv"),
            call().send(),
        ]
        email_message.assert_has_calls(calls)
