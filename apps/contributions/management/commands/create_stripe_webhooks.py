from django.conf import settings
from django.core.management.base import BaseCommand
from django.urls import reverse

from apps.common.utils import create_stripe_webhook


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("live", nargs="?", type=bool, default=False)
        parser.add_argument("url-contributions", nargs="?", type=str)
        parser.add_argument("url-upgrades", nargs="?", type=str)

    def create_stripe_webhook_for_contributions(self, webhook_url: str, api_key: str) -> str:
        """This creates a webhook for the Stripe account used for managing contributions on behalf of connected orgs"""
        return create_stripe_webhook(webhook_url=webhook_url, api_key=api_key)

    def create_stripe_webhook_for_upgrades(self, webhook_url: str, api_key: str) -> str:
        """This creates a webhook for the Stripe account used for the self-upgrade flow for org users"""
        return create_stripe_webhook(
            webhook_url=webhook_url, api_key=api_key, enabled_events=settings.STRIPE_UPGRADE_WEBHOOK_EVENTS
        )

    def handle(self, *args, **options):
        contributions_webhook_url = (
            options["url-contributions"]
            if options.get("url-contributions")
            else settings.SITE_URL + reverse("stripe-webhooks-contributions")
        )
        upgrades_webhook_url = (
            options["url-upgrades"]
            if options.get("url-upgrades")
            else settings.SITE_URL + reverse("organization-handle-stripe-webhook")
        )
        self.stdout.write(
            f"contributions_webhook_url = {contributions_webhook_url}, upgrades_webhook_url = {upgrades_webhook_url}",
        )
        contributions_api_key = (
            settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS
            if (live := options["live"])
            else settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS
        )
        upgrades_api_key = (
            settings.STRIPE_LIVE_SECRET_KEY_UPGRADES if live else settings.STRIPE_TEST_SECRET_KEY_UPGRADES
        )
        contributions_stripe_secret = create_stripe_webhook(
            api_key=contributions_api_key,
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_FOR_CONTRIBUTIONS,
            webhook_url=contributions_webhook_url,
        )
        self.stdout.write(self.style.WARNING("For contributions, wh_sec = %s" % contributions_stripe_secret))
        upgrade_stripe_secret = create_stripe_webhook(
            api_key=upgrades_api_key,
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_FOR_UPGRADES,
            webhook_url=upgrades_webhook_url,
        )
        self.stdout.write(self.style.WARNING("For self-upgrade, wh_sec = %s" % upgrade_stripe_secret))
