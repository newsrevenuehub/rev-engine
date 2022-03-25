import os

from django.conf import settings
from django.core.management.base import BaseCommand  # pragma: no cover
from django.urls import reverse

import heroku3

from apps.common.utils import (
    create_stripe_webhook,
    extract_ticket_id_from_branch_name,
    upsert_cloudflare_cnames,
)
from apps.contributions.utils import get_hub_stripe_api_key
from apps.organizations.models import RevenueProgram


class Command(BaseCommand):  # pragma: no cover
    help = "Bootstrap Heroku review app"

    def handle(self, *args, **options):
        branch_name = os.environ.get("HEROKU_BRANCH")
        zone_name = os.environ.get("CF_ZONE_NAME")
        heroku_app_name = os.environ.get("HEROKU_APP_NAME")
        heroku_api_key = os.environ.get("HEROKU_API_KEY")
        ticket_id = extract_ticket_id_from_branch_name(branch_name).lower()

        heroku_conn = heroku3.from_key(heroku_api_key)
        heroku_app = heroku_conn.apps()[heroku_app_name]

        revenue_programs = RevenueProgram.objects.all()
        heroku_domains = [x.hostname for x in heroku_app.domains()]

        for revenue_program in revenue_programs:
            # rename slugs
            if ticket_id in revenue_program.slug:
                self.stdout.write(self.style.WARNING("slug already modified: %s" % revenue_program.slug))
            else:
                revenue_program.slug = f"{revenue_program.slug}-{ticket_id}".lower()
            revenue_program.save()

            fqdn = f"{revenue_program.slug}.{zone_name}"
            if fqdn not in heroku_domains:
                self.stdout.write(self.style.SUCCESS(f"Creating Heroku domain entry entry for {fqdn}"))
                heroku_app.add_domain(fqdn, None)

        slugs = [x.slug for x in revenue_programs]
        # create a CNAME record for the ticket_id too
        slugs.append(ticket_id)
        upsert_cloudflare_cnames(slugs)

        # tell Heroku that the ticket_id is a valid domain too
        fqdn = f"{ticket_id}.{zone_name}"
        if fqdn not in heroku_domains:
            self.stdout.write(self.style.SUCCESS(f"Creating Heroku domain entry entry for {fqdn}"))
            heroku_app.add_domain(fqdn, None)

        webhook_url = settings.SITE_URL + reverse("stripe-webhooks")
        api_key = get_hub_stripe_api_key()
        wh_sec = create_stripe_webhook(webhook_url=webhook_url, api_key=api_key)

        # insert config vars:
        heroku_config = heroku_app.config()
        heroku_config["SITE_URL"] = f"{ticket_id}.{zone_name}"
        heroku_config["STRIPE_WEBHOOK_SECRET"] = wh_sec
        heroku_config["NON_DONATION_PAGE_SUBDOMAINS"] = ticket_id

        self.stdout.write(self.style.SUCCESS("Configured DNS for %s" % heroku_app_name))
