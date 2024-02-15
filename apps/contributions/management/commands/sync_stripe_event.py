from django.core.management.base import BaseCommand, CommandParser

from apps.contributions.stripe_contributions_provider import StripeEventSyncer


class Command(BaseCommand):
    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--stripe_account", required=True)
        parser.add_argument("--event_id", required=True)
        parser.add_argument("--async_mode", action="store_true", default=False)

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Running `sync_stripe_event`"))
        StripeEventSyncer(
            stripe_account_id=options["stripe_account"],
            event_id=options["event_id"],
            async_mode=options["async_mode"],
        ).sync()
        self.stdout.write(self.style.SUCCESS("`backfill_contribution_and_payments_from_stripe` is done"))
