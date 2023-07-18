from django.conf import settings
from django.core.management.base import BaseCommand
from django.urls import reverse

from apps.common.utils import create_stripe_webhook


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("live", nargs="?", type=bool, default=False)
        parser.add_argument("url", nargs="?", type=str)

    def handle(self, *args, **options):
        upgrades_webhook_url = (
            options["url"] if options.get("url") else settings.SITE_URL + reverse("organization-handle-stripe-webhook")
        )
        self.stdout.write(f"upgrades_webhook_url = {upgrades_webhook_url}")
        secret = create_stripe_webhook(
            api_key=settings.STRIPE_LIVE_SECRET_KEY_UPGRADES
            if options["live"]
            else settings.STRIPE_TEST_SECRET_KEY_UPGRADES,
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_FOR_UPGRADES,
            webhook_url=upgrades_webhook_url,
        )
        self.stdout.write(self.style.WARNING("For self-upgrade, wh_sec = %s" % secret))
