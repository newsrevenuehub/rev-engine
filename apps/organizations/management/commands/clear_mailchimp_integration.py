from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser

import reversion

from apps.organizations.models import RevenueProgram


class Command(BaseCommand):
    """Command to clear the Mailchimp integration data for a revenue program."""

    @property
    def name(self):
        return Path(__file__).name

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--slug", type=str, help="Slug of the revenue program to clear", required=True)

    def handle(self, *args, **options):
        revenue_program = RevenueProgram.objects.get(slug=options["slug"])
        with reversion.create_revision():
            del revenue_program.mailchimp_access_token  # must delete to trigger deletion in Google Secret Manager
            revenue_program.mailchimp_server_prefix = None
            revenue_program.save()
            reversion.set_comment(f"{self.name} cleared Mailchimp integration")
        self.stdout.write(
            self.style.SUCCESS(
                f"Cleared Mailchimp integration for revenue program ID {revenue_program.id} / slug {revenue_program.slug}"
            )
        )
