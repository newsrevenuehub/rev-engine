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
        heroku_config = heroku_app.config()
        heroku_config["SITE_URL"] = f"{ticket_id}.{zone_name}"
        revenue_programs = RevenueProgram.objects.all()
        cloudflare_conn = CloudFlare.CloudFlare()
        heroku_domains = [x.hostname for x in heroku_app.domains()]
        zone_id = cloudflare_conn.zones.get(params={"name": zone_name})[0]["id"]
        cloudflare_domains = {
            x["name"]: x["content"] for x in cloudflare_conn.zones.dns_records.get(zone_id, params={"per_page": 300})
        }
        cloudflare_ids = {
            x["name"]: x["id"] for x in cloudflare_conn.zones.dns_records.get(zone_id, params={"per_page": 300})
        }

        for revenue_program in revenue_programs:
            if ticket_id in revenue_program.slug:
                self.stdout.write(self.style.WARNING("slug already modified: %s" % revenue_program.slug))
            else:
                revenue_program.slug = f"{revenue_program.slug}-{ticket_id}".lower()
            fqdn = f"{revenue_program.slug}.{zone_name}"
            content = (f"{heroku_app_name}.herokuapp.com",)
            dns_record = {
                "name": f"{revenue_program.slug}",
                "type": "CNAME",
                "content": content,
                "proxied": True,
            }
            try:
                if fqdn not in cloudflare_domains:
                    self.stdout.write(self.style.SUCCESS(f"Creating DNS entry for {fqdn} → {content}"))
                    cloudflare_conn.zones.dns_records.post(zone_id, data=dns_record)
                if cloudflare_domains[fqdn] != content:
                    self.stdout.write(self.style.SUCCESS(f"Updating DNS entry for {fqdn} → {content}"))
                    record_id = cloudflare_ids[fqdn]
                    cloudflare_conn.zones.dns_records.patch(zone_id, record_id, data=dns_record)
            except CloudFlare.exceptions.CloudFlareAPIError as error:
                self.stdout.write(self.style.WARNING(error))
            if fqdn not in heroku_domains:
                self.stdout.write(self.style.SUCCESS(f"Creating Heroku domain entry entry for {fqdn}"))
                heroku_app.add_domain(fqdn, None)
            revenue_program.save()

        self.stdout.write(self.style.SUCCESS("Configured DNS for %s" % heroku_app_name))
