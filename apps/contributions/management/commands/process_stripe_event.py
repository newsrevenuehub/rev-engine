from django.core.management.base import BaseCommand, CommandParser

from apps.contributions.stripe_import import StripeEventProcessor


class Command(BaseCommand):
    """Allows user to provide a Stripe event and account ID and then process that event using our webhookhandler."""

    help = "Process a Stripe event using our webhook handler."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--stripe-account", required=True)
        parser.add_argument("--event-id", required=True)
        parser.add_argument("--async-mode", action="store_true", default=False)

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Running `process_stripe_event`"))
        StripeEventProcessor(
            stripe_account_id=options["stripe_account"],
            event_id=options["event_id"],
            async_mode=options["async_mode"],
        ).process()
        self.stdout.write(self.style.SUCCESS("`process_stripe_event` is done"))
