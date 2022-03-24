import os

from django.core.management.base import BaseCommand  # pragma: no cover

import CloudFlare

from apps.common.utils import extract_ticket_id_from_branch_name
from apps.organizations.models import RevenueProgram


class Command(BaseCommand):  # pragma: no cover
    help = "Bootstrap Heroku review app"

    def handle(self, *args, **options):
        branch_name = os.environ.get("HEROKU_BRANCH")
        zone_name = os.environ.get("CF_ZONE_NAME")
        heroku_app_name = os.environ.get("HEROKU_APP_NAME")
        ticket_id = extract_ticket_id_from_branch_name(branch_name)

        # TODO: remove this limit after testing:
        revenue_programs = RevenueProgram.objects.all()
        cloudflare_conn = CloudFlare.CloudFlare()
        for revenue_program in revenue_programs:
            if ticket_id in revenue_program.slug:
                self.stdout.write(self.style.WARNING("slug already ticketed: %s" % revenue_program.slug))
                continue
            slug = f"{revenue_program.slug}-{ticket_id}".lower()
            zone_id = cloudflare_conn.zones.get(params={"name": zone_name})[0]["id"]
            fqdn = f"{slug}.{zone_name}"
            dns_records = cloudflare_conn.zones.dns_records.get(zone_id, params={"name": fqdn})
            for dns_record in dns_records:
                dns_record_id = dns_record["id"]
                cloudflare_conn.zones.dns_records.delete(zone_id, dns_record_id)

        self.stdout.write(self.style.SUCCESS("Tore down DNS for %s" % heroku_app_name))
