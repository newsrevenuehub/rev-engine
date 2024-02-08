import datetime

from django.core.management.base import BaseCommand, CommandParser

from apps.contributions.stripe_contributions_provider import StripeToRevengineTransformer


def _parse_datetime(s: str) -> datetime.datetime:
    return datetime.datetime.fromtimestamp(int(s))


class Command(BaseCommand):
    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--gte", type=_parse_datetime)
        parser.add_argument("--lte", type=_parse_datetime)
        parser.add_argument(
            "--for_orgs",
            type=lambda s: [x.trim() for x in s.split(",")],
            default=[],
            help="Optional comma-separated list of org ids to limit to",
        )
        parser.add_argument(
            "--for_stripe_accounts",
            type=lambda s: [x.trim() for x in s.split(",")],
            default=[],
            help="Optional comma-separated list of stripe accounts to limit to",
        )
        parser.add_argument("--async_mode", action="store_true")

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Running `backfill_contribution_and_payments_from_stripe`"))
        transformer = StripeToRevengineTransformer(**options)
        transformer.backfill_contributions_and_payments_from_stripe()
        self.stdout.write(self.style.SUCCESS("`backfill_contribution_and_payments_from_stripe` is done"))
