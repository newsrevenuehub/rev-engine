from io import StringIO

from django.core.management import call_command

import pytest


class TestCreateStripeWebhooks:
    def run_command(self, url_contributions: str = "", url_upgrades: str = "", live: bool = False):
        out = StringIO()

        call_command(
            "create_stripe_webhooks",
            **{
                "live": live,
                "url-contributions": url_contributions,
                "url-upgrades": url_upgrades,
                "stdout": out,
            },
        )
        return out

    @pytest.mark.parametrize("live", (True, False))
    def test_live_flag(self, live: bool, mocker, settings):
        mock_webhook_create = mocker.patch("stripe.WebhookEndpoint.create")
        mock_webhook_retrieve = mocker.patch("stripe.WebhookEndpoint.list")
        settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS = "live_key"
        settings.STRIPE_LIVE_SECRET_KEY_UPGRADES = "live_key_other"
        settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS = "test_key"
        settings.STRIPE_TEST_SECRET_KEY_UPGRADES = "test_key_other"
        self.run_command(live=live)
        assert mock_webhook_retrieve.call_count == 2
        assert mock_webhook_create.call_count == 2
        assert mock_webhook_retrieve.call_args_list[0].kwargs.get("api_key", None) == (
            settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS if live else settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS
        )
        assert mock_webhook_retrieve.call_args_list[1].kwargs.get("api_key", None) == (
            settings.STRIPE_LIVE_SECRET_KEY_UPGRADES if live else settings.STRIPE_TEST_SECRET_KEY_UPGRADES
        )
        assert mock_webhook_create.call_args_list[0].kwargs.get("api_key", None) == (
            settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS if live else settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS
        )
        assert mock_webhook_create.call_args_list[1].kwargs.get("api_key", None) == (
            settings.STRIPE_LIVE_SECRET_KEY_UPGRADES if live else settings.STRIPE_TEST_SECRET_KEY_UPGRADES
        )

    def test_custom_urls(self, mocker, settings):
        mock_webhook_create = mocker.patch("stripe.WebhookEndpoint.create")
        mocker.patch("stripe.WebhookEndpoint.list")
        settings.STRIPE_TEST_CONTRIBUTIONS_SECRET_KEY = "test_key"
        settings.STRIPE_TEST_UPGRADES_SECRET_KEY = "test_key_other"
        self.run_command(
            **{
                "live": False,
                "url_contributions": (url_contributions := "http://custom.com"),
                "url_upgrades": (url_upgrades := "http://bespoke.com"),
            },
        )
        assert mock_webhook_create.call_count == 2
        assert mock_webhook_create.call_args_list[0].kwargs.get("url", None) == url_contributions
        assert mock_webhook_create.call_args_list[1].kwargs.get("url", None) == url_upgrades
