from django.conf import settings
from django.core.management.base import BaseCommand
from django.urls import reverse

from apps.common.utils import create_stripe_webhook


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("-l", "--live", type=bool, default=False)
        parser.add_argument(
            "-uc",
            "--url-contributions",
            type=str,
            default=settings.SITE_URL + reverse("stripe-webhooks-contributions"),
        )
        parser.add_argument(
            "-uu",
            "--url-upgrades",
            type=str,
            default=settings.SITE_URL + reverse("organization-handle-stripe-webhook"),
        )

    def handle(self, *args, **options):
        contributions_stripe_secret = create_stripe_webhook(
            api_key=settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS
            if (live := options["live"])
            else settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS,
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_CONTRIBUTIONS,
            webhook_url=options["url_contributions"],
        )
        self.stdout.write(self.style.WARNING("For contributions, wh_sec = %s" % contributions_stripe_secret))
        upgrade_stripe_secret = create_stripe_webhook(
            api_key=settings.STRIPE_LIVE_SECRET_KEY_UPGRADES if live else settings.STRIPE_TEST_SECRET_KEY_UPGRADES,
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS_FOR_UPGRADES,
            webhook_url=options["url_upgrades"],
        )
        self.stdout.write(self.style.WARNING("For self-upgrade, wh_sec = %s" % upgrade_stripe_secret))
