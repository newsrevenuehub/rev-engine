from urllib.parse import urljoin

from django.conf import settings
from django.core.management.base import BaseCommand

import heroku3
from rest_framework.reverse import reverse

from apps.common.hookdeck import bootstrap as bootstrap_hookdeck
from apps.common.utils import extract_ticket_id_from_branch_name, upsert_cloudflare_cnames
from apps.organizations.models import RevenueProgram


class Command(BaseCommand):  # pragma: no cover low ROI for test of command line tool with all heroku mocked out.
    help = "Bootstrap Heroku review app"

    def handle(self, *args, **options):
        branch_name = settings.HEROKU_BRANCH
        zone_name = settings.CF_ZONE_NAME
        heroku_app_name = settings.HEROKU_APP_NAME
        heroku_api_key = settings.HEROKU_API_KEY
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

        site_url = f"https://{ticket_id}.{zone_name}"
        bootstrap_hookdeck(
            ticket_id,
            urljoin(site_url, reverse("stripe-webhooks-contributions")),
            urljoin(site_url, reverse("stripe-webhooks-upgrades")),
        )

        # insert config vars
        heroku_config = heroku_app.config()
        config_updates = {"SITE_URL": site_url, "DASHBOARD_SUBDOMAINS": ticket_id, "ENVIRONMENT": ticket_id}
        heroku_config.update(config_updates)

        self.stdout.write(self.style.SUCCESS("Postdeployment completed for %s" % heroku_app_name))
