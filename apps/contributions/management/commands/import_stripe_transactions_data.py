import logging
from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser

import dateparser

from apps.contributions.stripe_import import StripeTransactionsImporter
from apps.contributions.tasks import task_import_contributions_and_payments_for_stripe_account
from apps.organizations.models import PaymentProvider


# otherwise we get thousands and thousands of info logs from stripe and hard to find our own logs
stripe_logger = logging.getLogger("stripe")
stripe_logger.setLevel(logging.ERROR)


class Command(BaseCommand):
    """Allow admin user to import transaction data from Stripe to revengine.

    It locates payment intents for one-time contributions and invoices for recurring contributions (plus related data
    entities) in order to create or update revengine contributor, contribution, and payment objects. It DOES not mutate
    Stripe objects in any way. This command is idempotent and can be run multiple times.
    """

    help = "Import transactions data from Stripe to revengine to create or update revengine contributor, contribution, and payment objects."

    # NB: The no covers below are because HTML coverage is falsely reporting these lines as partially covered, when in fact
    # we have tests running command both with and without these options.
    def add_arguments(self, parser: CommandParser) -> None:
        (
            parser.add_argument(  # pragma: no cover
                "--gte",
                type=lambda s: dateparser.parse(s),
                help=("Optional start date(time) for the import (inclusive). Tries to parse whatever it's given.",),
            ),
        )
        (
            parser.add_argument(  # pragma: no cover
                "--lte",
                type=lambda s: dateparser.parse(s),
                help="Optional end date(time) for the import (inclusive). Tries to parse whatever it's given.",
            ),
        )
        parser.add_argument(  # pragma: no cover
            "--for-orgs",
            type=lambda s: [x.strip() for x in s.split(",")],
            default=[],
            help="Optional comma-separated list of org ids to limit to",
        )
        parser.add_argument(  # pragma: no cover
            "--for-stripe-accounts",
            type=lambda s: [x.strip() for x in s.split(",")],
            default=[],
            help="Optional comma-separated list of stripe accounts to limit to",
        )
        parser.add_argument("--async-mode", action="store_true", default=False)

    def get_stripe_account_ids(self, for_orgs: list[str], for_stripe_accounts: list[str]) -> list[str]:
        query = PaymentProvider.objects.filter(stripe_account_id__isnull=False)
        if for_orgs:
            query = query.filter(revenueprogram__organization__id__in=for_orgs)
        if for_stripe_accounts:
            query = query.filter(stripe_account_id__in=for_stripe_accounts)
        return list(query.values_list("stripe_account_id", flat=True))

    def handle(self, *args, **options):
        command_name = Path(__file__).stem
        self.stdout.write(self.style.HTTP_INFO(f"Running {command_name}"))
        account_ids = self.get_stripe_account_ids(options["for_orgs"], options["for_stripe_accounts"])
        for account in account_ids:
            if options["async_mode"]:
                result = task_import_contributions_and_payments_for_stripe_account.delay(
                    stripe_account_id=account,
                    from_date=int(options["gte"].timestamp()) if options["gte"] else None,
                    to_date=int(options["lte"].timestamp()) if options["lte"] else None,
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Celery task {result.task_id} to import transactions for account {account} has been scheduled"
                    )
                )
            else:
                StripeTransactionsImporter(
                    from_date=options["gte"],
                    to_date=options["lte"],
                    stripe_account_id=account,
                ).import_contributions_and_payments()
                self.stdout.write(self.style.SUCCESS(f"Import transactions for account {account} is done"))

        self.stdout.write(self.style.SUCCESS(f"{command_name} is done"))
