from django.core.management.base import BaseCommand, CommandParser

from apps.contributions.models import Contribution


class Command(BaseCommand):
    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("-d", "--dry-run", action="store_true")

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Running `sync_missing_contribution_data_from_stripe`"))
        Contribution.fix_contributions_stuck_in_processing(dry_run=options["dry_run"])
        Contribution.fix_missing_provider_payment_method_id(dry_run=options["dry_run"])
        Contribution.fix_missing_payment_method_details_data(dry_run=options["dry_run"])
        Contribution.fix_missing_contribution_metadata(dry_run=options["dry_run"])
        self.stdout.write(self.style.SUCCESS("`sync_missing_contribution_data_from_stripe` is done"))
