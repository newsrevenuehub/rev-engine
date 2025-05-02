from django.conf import settings
from django.core.management.base import BaseCommand

from apps.common.hookdeck import tear_down as tear_down_hookdeck
from apps.common.utils import delete_cloudflare_cnames, extract_ticket_id_from_branch_name, hide_sentry_environment


class Command(BaseCommand):  # pragma: no cover low ROI for test of command line tool with all cloudfare mocked out.
    def add_arguments(self, parser):
        parser.add_argument("--ticket", nargs="?", type=str)

    help = "Tear down Heroku review app"

    def handle(self, *args, **options):
        if not options["ticket"]:
            ticket_id = extract_ticket_id_from_branch_name(settings.HEROKU_BRANCH)
        else:
            ticket_id = options["ticket"].lower()

        delete_cloudflare_cnames(ticket_id)
        tear_down_hookdeck(ticket_id)
        hide_sentry_environment(ticket_id)
