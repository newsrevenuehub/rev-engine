import logging

from django.core.management.base import BaseCommand, CommandParser

import dateparser

from apps.contributions.stripe_sync import StripeTransactionsSyncer
from apps.contributions.tasks import task_backfill_contributions_and_payments


# otherwise we get thousands and thousands of info logs from stripe and hard to find our own logs
stripe_logger = logging.getLogger("stripe")
stripe_logger.setLevel(logging.ERROR)


class Command(BaseCommand):
    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--gte", type=lambda s: dateparser.parse(s, settings={"TIMEZONE": "UTC"}))
        parser.add_argument("--lte", type=lambda s: dateparser.parse(s, settings={"TIMEZONE": "UTC"}))
        parser.add_argument(
            "--for_orgs",
            type=lambda s: [x.strip() for x in s.split(",")],
            default=[],
            help="Optional comma-separated list of org ids to limit to",
        )
        parser.add_argument(
            "--for_stripe_accounts",
            type=lambda s: [x.strip() for x in s.split(",")],
            default=[],
            help="Optional comma-separated list of stripe accounts to limit to",
        )
        parser.add_argument("--async_mode", action="store_true", default=False)

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Running `backfill_contribution_and_payments_from_stripe`"))
        if options["async_mode"]:
            self.stdout.write(self.style.HTTP_INFO("Running in async mode. Using celery task to backfill"))
            task_backfill_contributions_and_payments.delay(
                from_date=int(options["gte"].timestamp()) if options["gte"] else None,
                to_date=int(options["lte"].timestamp()) if options["lte"] else None,
                for_orgs=options["for_orgs"],
                for_stripe_accounts=options["for_stripe_accounts"],
            )
            return
        else:
            StripeTransactionsSyncer(
                from_date=options["gte"],
                to_date=options["lte"],
                for_orgs=options["for_orgs"],
                for_stripe_accounts=options["for_stripe_accounts"],
            ).sync_stripe_transactions_data()
        self.stdout.write(self.style.SUCCESS("`backfill_contribution_and_payments_from_stripe` is done"))
