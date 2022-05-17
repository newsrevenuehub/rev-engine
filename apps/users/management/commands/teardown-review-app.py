from django.conf import settings
from django.core.management.base import BaseCommand  # pragma: no cover
from django.urls import reverse

from apps.common.utils import (
    delete_cloudflare_cnames,
    delete_stripe_webhook,
    extract_ticket_id_from_branch_name,
)
from apps.contributions.utils import get_hub_stripe_api_key


class Command(BaseCommand):  # pragma: no cover
    def add_arguments(self, parser):
        parser.add_argument("--ticket", nargs="?", type=str)

    help = "Tear down Heroku review app"

    def handle(self, *args, **options):
        if not options["ticket"]:
            ticket_id = extract_ticket_id_from_branch_name(settings.HEROKU_BRANCH)
        else:
            ticket_id = options["ticket"].lower()

        delete_cloudflare_cnames(ticket_id)

        site_url = f"https://{ticket_id}.{settings.CF_ZONE_NAME}"
        webhook_url = f"{site_url}{reverse('stripe-webhooks')}".lower()
        api_key = get_hub_stripe_api_key()
        delete_stripe_webhook(webhook_url=webhook_url, api_key=api_key)
