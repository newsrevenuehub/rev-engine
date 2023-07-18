from django.conf import settings
from django.core.management.base import BaseCommand
from django.urls import reverse

from apps.common.utils import create_stripe_webhook


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("live", nargs="?", type=bool, default=False)
        parser.add_argument("url-contributions", nargs="?", type=str)
        parser.add_argument("url-upgrades", nargs="?", type=str)

    def get_contributions_endpoint_url(self, options: dict) -> str:
        if options.get("url-contributions", False):
            return options["url-contributions"]
        else:
            return settings.SITE_URL + reverse("stripe-webhooks-contributions")

    def get_upgrades_endpoint_url(self, options: dict) -> str:
        if options.get("url-upgrades", False):
            return options["url-upgrades"]
        else:
            return settings.SITE_URL + reverse("organization-handle-stripe-webhook")

    def handle(self, *args, **options):
        contributions_stripe_secret = create_stripe_webhook(
            api_key=settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS
            if (live := options["live"])
            else settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS,
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_FOR_CONTRIBUTIONS,
            webhook_url=self.get_contributions_endpoint_url(options),
        )
        self.stdout.write(self.style.WARNING("For contributions, wh_sec = %s" % contributions_stripe_secret))

        upgrade_stripe_secret = create_stripe_webhook(
            api_key=settings.STRIPE_LIVE_SECRET_KEY_UPGRADES if live else settings.STRIPE_TEST_SECRET_KEY_UPGRADES,
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_FOR_UPGRADES,
            webhook_url=self.get_upgrades_endpoint_url(options),
        )
        self.stdout.write(self.style.WARNING("For self-upgrade, wh_sec = %s" % upgrade_stripe_secret))
