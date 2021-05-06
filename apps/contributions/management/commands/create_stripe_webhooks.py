from django.conf import settings
from django.core.management.base import BaseCommand
from django.urls import reverse

import stripe

from apps.contributions.utils import get_default_api_key


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("live", nargs="?", type=bool, default=False)
        parser.add_argument("url", nargs="?", type=str)

    def handle(self, *args, **options):
        webhook_url = (
            options["url"] if options.get("url") else settings.SITE_URL + reverse("stripe-webhooks")
        )
        api_key = get_default_api_key(options["live"])

        stripe.WebhookEndpoint.create(
            url=webhook_url,
            enabled_events=settings.STRIPE_WEBHOOK_EVENTS,
            connect=True,
            api_key=api_key,
        )
