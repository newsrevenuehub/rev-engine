import datetime

from django.core.management.base import BaseCommand, CommandParser

from apps.contributions.stripe_sync import StripeToRevengineTransformer
from apps.contributions.tasks import task_backfill_contributions_and_payments


class Command(BaseCommand):
    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--gte", type=lambda s: datetime.datetime.fromtimestamp(int(s)))
        parser.add_argument("--lte", type=lambda s: datetime.datetime.fromtimestamp(int(s)))
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
                from_date=options["gte"].isoformat() if options["gte"] else None,
                to_date=options["lte"].isoformat() if options["lte"] else None,
                for_orgs=options["for_orgs"],
                for_stripe_accounts=options["for_stripe_accounts"],
            )
            return
        else:
            StripeToRevengineTransformer(
                from_date=options["gte"],
                to_date=options["lte"],
                for_orgs=options["for_orgs"],
                for_stripe_accounts=options["for_stripe_accounts"],
            ).backfill_contributions_and_payments_from_stripe()
        self.stdout.write(self.style.SUCCESS("`backfill_contribution_and_payments_from_stripe` is done"))
