from django.core.management.base import BaseCommand, CommandParser

from apps.organizations.models import RevenueProgram


class Command(BaseCommand):
    """Command to disable the Mailchimp integration data for a revenue program."""

    def add_arguments(self, parser: CommandParser):
        parser.add_argument("--slug", type=str, help="Slug of the revenue program to disable", required=True)

    def handle(self, *args, **options):
        revenue_program = RevenueProgram.objects.get(slug=options["slug"])
        revenue_program.disable_mailchimp_integration()
        self.stdout.write(
            self.style.SUCCESS(
                f"Disabled Mailchimp integration for revenue program ID {revenue_program.id} / slug {revenue_program.slug}"
            )
        )
