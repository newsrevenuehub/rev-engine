import logging
from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser

import dateparser
import stripe

from apps.contributions.stripe_import import StripeTransactionsImporter
from apps.contributions.tasks import task_import_contributions_and_payments_for_stripe_account
from apps.organizations.models import PaymentProvider


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
                help="Optional start date(time) for the import (inclusive). Tries to parse whatever it's given.",
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
        parser.add_argument(
            "--retrieve-payment-method",
            action="store_true",
            default=False,
            help="Retrieve payment method details per contribution (note this may trigger API rate limiting)",
        )
        parser.add_argument("--suppress-stripe-info-logs", action="store_true", default=False)
        parser.add_argument("--sentry-profiler", action="store_true", default=False)
        parser.add_argument(
            "--exclude-one-times",
            action="store_true",
            default=False,
            help="Exclude Stripe one-time payments from import",
        )
        parser.add_argument(
            "--exclude-recurring", action="store_true", default=False, help="Exclude Stripe subscriptions from import"
        )
        # see https://docs.stripe.com/api/subscriptions/list#list_subscriptions-status for available values.
        # Note that "uncanceled" is not a valid value, but we use it to indicate that no value should be sent to
        # Stripe when retrieving subscriptions, which results in default behavior of all being returned that are not
        # canceled.
        parser.add_argument(
            "--subscription-status", type=str, default="all", choices=["all", "ended", "canceled", "uncanceled"]
        )

    def get_stripe_account_ids(self, for_orgs: list[str], for_stripe_accounts: list[str]) -> list[str]:
        query = PaymentProvider.objects.filter(stripe_account_id__isnull=False)
        if for_orgs:
            query = query.filter(revenueprogram__organization__id__in=for_orgs)
        if for_stripe_accounts:
            query = query.filter(stripe_account_id__in=for_stripe_accounts)
        return list(query.values_list("stripe_account_id", flat=True))

    def configure_stripe_log_level(self, suppress_stripe_info_logs: bool) -> None:
        """Set Stripe log level to ERROR to suppress INFO logs (which we would otherwise get by default)."""
        if suppress_stripe_info_logs:
            stripe_logger = logging.getLogger("stripe")
            stripe_logger.setLevel(logging.ERROR)

    def handle(self, *args, **options):
        command_name = Path(__file__).stem
        self.stdout.write(self.style.HTTP_INFO(f"Running {command_name}"))
        self.configure_stripe_log_level(options["suppress_stripe_info_logs"])
        account_ids = self.get_stripe_account_ids(options["for_orgs"], options["for_stripe_accounts"])

        for account in account_ids:
            kwargs = {
                "stripe_account_id": account,
                "from_date": int(options["gte"].timestamp()) if options["gte"] else None,
                "to_date": int(options["lte"].timestamp()) if options["lte"] else None,
                "retrieve_payment_method": options["retrieve_payment_method"],
                "sentry_profiler": options["sentry_profiler"],
                "subscription_status": options["subscription_status"],
                "include_one_time_contributions": not options["exclude_one_times"],
                "include_recurring_contributions": not options["exclude_recurring"],
            }
            if options["async_mode"]:
                result = task_import_contributions_and_payments_for_stripe_account.delay(**kwargs)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Celery task {result.task_id} to import transactions for account {account} has been scheduled"
                    )
                )
            else:
                try:
                    StripeTransactionsImporter(**kwargs).import_contributions_and_payments()
                except stripe.error.PermissionError as e:
                    self.stdout.write(self.style.ERROR(f"Error importing transactions for account {account}: {e}"))
                else:
                    self.stdout.write(self.style.SUCCESS(f"Import transactions for account {account} is done"))
        self.stdout.write(self.style.SUCCESS(f"{command_name} is done"))
