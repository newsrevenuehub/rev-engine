from django.core.management.base import BaseCommand, CommandParser

from apps.organizations.models import RevenueProgram


class Command(BaseCommand):
    """Command to disable select integrations for a revenue program."""

    def add_arguments(self, parser: CommandParser):
        parser.add_argument("--slug", type=str, help="Slug of the revenue program to disable", required=True)
        parser.add_argument(
            "--integrations",
            type=str,
            nargs="+",
            help="Specify integrations to disable",
            choices=["mailchimp", "activecampaign"],
            required=True,
        )

    def handle(self, *args, **options):
        revenue_program = RevenueProgram.objects.get(slug=options["slug"])
        if "activecampaign" in options["integrations"]:
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"Attempting to disable ActiveCampaign integration for revenue program ID "
                    f"{revenue_program.pk} / slug {revenue_program.slug}"
                )
            )
            revenue_program.disable_activecampaign_integration()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Disabled ActiveCampaign integration for revenue program ID {revenue_program.pk} / slug {revenue_program.slug}"
                )
            )
        if "mailchimp" in options["integrations"]:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Attempting to disable Mailchimp integration for revenue program ID {revenue_program.pk} / slug {revenue_program.slug}"
                )
            )
            revenue_program.disable_mailchimp_integration()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Disabled Mailchimp integration for revenue program ID {revenue_program.pk} / slug {revenue_program.slug}"
                )
            )
