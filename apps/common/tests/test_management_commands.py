from io import StringIO

from django.core.management import call_command
from django.urls import reverse


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

    def test_when_called_with_live_flag(self, mocker, settings):
        mock_webhook_create = mocker.patch("stripe.WebhookEndpoint.create")
        mock_webhook_retrieve = mocker.patch("stripe.WebhookEndpoint.list")
        settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS = "live_key"
        settings.STRIPE_LIVE_SECRET_KEY_UPGRADES = "live_key_other"
        self.run_command(live=True)
        assert mock_webhook_retrieve.call_count == 2
        assert mock_webhook_create.call_count == 2
        assert mock_webhook_retrieve.call_args_list[0] == mocker.call(
            api_key=settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS
        )
        assert mock_webhook_retrieve.call_args_list[1] == mocker.call(api_key=settings.STRIPE_LIVE_SECRET_KEY_UPGRADES)
        assert mock_webhook_create.call_args_list[0] == mocker.call(
            url=f"{settings.SITE_URL}{reverse('stripe-webhooks-contributions')}",
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_FOR_CONTRIBUTIONS,
            connect=True,
            api_key=settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS,
            api_version="2020-08-27",
        )
        assert mock_webhook_create.call_args_list[1] == mocker.call(
            url=f"{settings.SITE_URL}{reverse('organization-handle-stripe-webhook')}",
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_FOR_UPGRADES,
            connect=True,
            api_key=settings.STRIPE_LIVE_SECRET_KEY_UPGRADES,
            api_version="2020-08-27",
        )

    def test_when_called_without_live_flag(self, mocker, settings):
        mock_webhook_create = mocker.patch("stripe.WebhookEndpoint.create")
        mock_webhook_retrieve = mocker.patch("stripe.WebhookEndpoint.list")
        settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS = "test_key"
        settings.STRIPE_TEST_SECRET_KEY_UPGRADES = "test_key_other"
        self.run_command(live=False)
        assert mock_webhook_retrieve.call_count == 2
        assert mock_webhook_create.call_count == 2
        assert mock_webhook_retrieve.call_args_list[0] == mocker.call(
            api_key=settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS
        )
        assert mock_webhook_retrieve.call_args_list[1] == mocker.call(api_key=settings.STRIPE_TEST_SECRET_KEY_UPGRADES)
        assert mock_webhook_create.call_args_list[0] == mocker.call(
            url=f"{settings.SITE_URL}{reverse('stripe-webhooks-contributions')}",
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_FOR_CONTRIBUTIONS,
            connect=True,
            api_key=settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS,
            api_version="2020-08-27",
        )
        assert mock_webhook_create.call_args_list[1] == mocker.call(
            url=f"{settings.SITE_URL}{reverse('organization-handle-stripe-webhook')}",
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_FOR_UPGRADES,
            connect=True,
            api_key=settings.STRIPE_TEST_SECRET_KEY_UPGRADES,
            api_version="2020-08-27",
        )

    def test_can_call_with_custom_urls(self, mocker, settings):
        mock_webhook_create = mocker.patch("stripe.WebhookEndpoint.create")
        mocker.patch("stripe.WebhookEndpoint.list")
        settings.STRIPE_TEST_CONTRIBUTIONS_SECRET_KEY = "test_key"
        settings.STRIPE_TEST_UPGRADES_SECRET_KEY = "test_key_other"
        self.run_command(
            **{
                "url_contributions": (url_contributions := "http://custom.com"),
                "url_upgrades": (url_upgrades := "http://bespoke.com"),
            },
        )
        assert mock_webhook_create.call_count == 2
        assert mock_webhook_create.call_args_list[0] == mocker.call(
            url=url_contributions,
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_FOR_CONTRIBUTIONS,
            connect=True,
            api_key=settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS,
            api_version="2020-08-27",
        )
        assert mock_webhook_create.call_args_list[1] == mocker.call(
            url=url_upgrades,
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_FOR_UPGRADES,
            connect=True,
            api_key=settings.STRIPE_TEST_SECRET_KEY_UPGRADES,
            api_version="2020-08-27",
        )
