import os

from django.core.management.base import BaseCommand  # pragma: no cover

import CloudFlare
import heroku3

from apps.common.utils import extract_ticket_id_from_branch_name
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
        cloudflare_conn = CloudFlare.CloudFlare()

        for revenue_program in revenue_programs:
            if ticket_id in revenue_program.slug:
                self.stdout.write(self.style.WARNING("slug already ticketed: %s" % revenue_program.slug))
                continue
            slug = f"{revenue_program.slug}-{ticket_id}".lower()
            fqdn = f"{slug}.{zone_name}"
            revenue_program.slug = slug
            zone_id = cloudflare_conn.zones.get(params={"name": zone_name})[0]["id"]
            dns_record = {
                "name": f"{slug}",
                "type": "CNAME",
                "content": f"{heroku_app_name}.herokuapp.com",
                "proxied": True,
            }
            try:
                cloudflare_conn.zones.dns_records.post(zone_id, data=dns_record)
            except CloudFlare.exceptions.CloudFlareAPIError as error:
                self.stdout.write(self.style.WARNING(error))
                continue
            heroku_app.add_domain(fqdn, None)
            revenue_program.save()
            self.stdout.write(self.style.SUCCESS("Added DNS for entry for %s" % slug))

        self.stdout.write(self.style.SUCCESS("Configured DNS for %s" % heroku_app_name))
