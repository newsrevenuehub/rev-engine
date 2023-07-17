from django.conf import settings
from django.core.management.base import BaseCommand
from django.urls import reverse

from apps.common.utils import create_stripe_webhook
from apps.contributions.utils import get_hub_stripe_api_key


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("live", nargs="?", type=bool, default=False)
        parser.add_argument("url", nargs="?", type=str)

    def handle(self, *args, **options):
        webhook_url = (
            options["url"] if options.get("url") else settings.SITE_URL + reverse("stripe-webhooks-contributions")
        )
        api_key = get_hub_stripe_api_key(options["live"])
        kwargs = {"webhook_url": webhook_url, "api_key": api_key}
        secret = create_stripe_webhook(**kwargs)
        self.stdout.write(self.style.WARNING("wh_sec = %s" % secret))
