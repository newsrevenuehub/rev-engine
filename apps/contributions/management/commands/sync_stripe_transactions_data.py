import logging

from django.core.management.base import BaseCommand, CommandParser

import dateparser

from apps.contributions.stripe_sync import StripeTransactionsSyncer
from apps.contributions.tasks import task_sync_contributions_and_payments


# otherwise we get thousands and thousands of info logs from stripe and hard to find our own logs
stripe_logger = logging.getLogger("stripe")
stripe_logger.setLevel(logging.ERROR)


class Command(BaseCommand):
    """This commands allows the admin user to sync down payments data from Stripe to revengine. It locates payment intents for one time
    contributions and invoices for recurring contributions (plus related data entities) in order to create or update revengine contributor,
    contribution, and payment objects. It DOES not mutate Stripe objects in any way. This command is idempotent and can be run multiple times.
    """

    help = "Sync down payments data from Stripe to revengine to create or update revengine contributor, contribution, and payment objects."

    # NB: The no covers below is because HTML coverage is falsely reporting these lines as partially covered, when in fact
    # we have tests running command both with and without these options.
    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(  # pragma: no cover
            "--gte",
            type=lambda s: dateparser.parse(s),
            help=("Optional start date(time) for the sync (inclusive). Tries to parse whatever it's given.",),
        ),
        parser.add_argument(  # pragma: no cover
            "--lte",
            type=lambda s: dateparser.parse(s),
            help="Optional end date(time) for the sync (inclusive). Tries to parse whatever it's given.",
        ),
        parser.add_argument(  # pragma: no cover
            "--for_orgs",
            type=lambda s: [x.strip() for x in s.split(",")],
            default=[],
            help="Optional comma-separated list of org ids to limit to",
        )
        parser.add_argument(  # pragma: no cover
            "--for_stripe_accounts",
            type=lambda s: [x.strip() for x in s.split(",")],
            default=[],
            help="Optional comma-separated list of stripe accounts to limit to",
        )
        parser.add_argument("--async_mode", action="store_true", default=False)

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Running `sync_contribution_and_payments_from_stripe`"))
        if options["async_mode"]:
            self.stdout.write(self.style.HTTP_INFO("Running in async mode. Using celery task to sync"))
            result = task_sync_contributions_and_payments.delay(
                from_date=int(options["gte"].timestamp()) if options["gte"] else None,
                to_date=int(options["lte"].timestamp()) if options["lte"] else None,
                for_orgs=options["for_orgs"],
                for_stripe_accounts=options["for_stripe_accounts"],
            )
            self.stdout.write(self.style.SUCCESS(f"Celery task {result.task_id} to sync has been scheduled"))
        else:
            StripeTransactionsSyncer(
                from_date=options["gte"],
                to_date=options["lte"],
                for_orgs=options["for_orgs"],
                for_stripe_accounts=options["for_stripe_accounts"],
            ).sync_stripe_transactions_data()
            self.stdout.write(self.style.SUCCESS("`sync_contribution_and_payments_from_stripe` is done"))
