from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse

import stripe


test_events = ["test_1", "test_2"]

test_site_url = "https://testing.gov"

test_key = "test_key"
live_key = "live_key"
test_stripe_api_version = "01-01-2022"


def mock_create_stripe_endpoint(*args, **kwargs):
    return kwargs


@override_settings(STRIPE_WEBHOOK_EVENTS=test_events)
@override_settings(SITE_URL=test_site_url)
@override_settings(STRIPE_LIVE_SECRET_KEY=live_key)
@override_settings(STRIPE_TEST_SECRET_KEY=test_key)
@override_settings(STRIPE_API_VERSION=test_stripe_api_version)
@patch("stripe.WebhookEndpoint.create", side_effect=mock_create_stripe_endpoint)
class CreateStripeWebhooksTest(TestCase):
    def setUp(self):
        def run_command(live=None, url=None):
            out = StringIO()
            call_command("create_stripe_webhooks", live=live, url=url, stdout=out)
            return out

        self.run_command = run_command

    def test_proper_args_with_live_flag(self, mock_endpoint_create):
        self.run_command(live=True)
        stripe.WebhookEndpoint.create.assert_called_with(
            url=test_site_url + reverse("stripe-webhooks"),
            enabled_events=test_events,
            connect=True,
            api_key=live_key,
            api_version=test_stripe_api_version,
        )

    def test_proper_args_without_live_flag(self, mock_endpoint_create):
        self.run_command(live=False)
        stripe.WebhookEndpoint.create.assert_called_with(
            url=test_site_url + reverse("stripe-webhooks"),
            enabled_events=test_events,
            connect=True,
            api_key=test_key,
            api_version=test_stripe_api_version,
        )

    def test_proper_args_with_custom_url(self, mock_endpoint_create):
        url = "http://google.com"
        self.run_command(url=url)
        stripe.WebhookEndpoint.create.assert_called_with(
            url=url, enabled_events=test_events, connect=True, api_key=test_key, api_version=test_stripe_api_version
        )
