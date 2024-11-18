import logging
from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser
from django.db.models import Case, F, Q, QuerySet, Value, When

import stripe

from apps.common.utils import get_stripe_accounts_and_their_connection_status
from apps.contributions.choices import ContributionInterval
from apps.contributions.models import Contribution
from apps.contributions.stripe_import import StripeTransactionsImporter
from apps.contributions.types import STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS


# otherwise we get spammed by stripe info logs when running this command
logging.getLogger("stripe").setLevel(logging.ERROR)


class Command(BaseCommand):

    @property
    def name(self):
        return Path(__file__).name

    def get_recurring_contributions_for_account(self, stripe_account_id: str) -> QuerySet[Contribution]:
        self.stdout.write(
            self.style.HTTP_INFO(f"Getting recurring contributions for stripe account `{stripe_account_id}`")
        )
        return Contribution.objects.with_stripe_account().filter(
            ~Q(interval=ContributionInterval.ONE_TIME),
            Q(
                Q(donation_page__revenue_program__payment_provider__stripe_account_id=stripe_account_id)
                | Q(_revenue_program__payment_provider__stripe_account_id=stripe_account_id)
            ),
        )

    def get_stripe_subscriptions_for_account(self, stripe_account_id: str) -> list[stripe.Subscription]:
        """Get all stripe subscriptions with conforming metadata schema versions for a given stripe account."""
        self.stdout.write(
            self.style.HTTP_INFO(f"Getting stripe subscriptions for stripe account `{stripe_account_id}`")
        )
        query = " OR ".join(
            f'metadata["schema_version"]:"{version}"' for version in STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS
        )
        return list(
            stripe.Subscription.search(
                stripe_account=stripe_account_id,
                query=query,
            ).auto_paging_iter()
        )

    def get_contributions_with_unexpected_status(
        self, contributions: QuerySet[Contribution], subscriptions: list[stripe.Subscription], stripe_account_id: str
    ) -> QuerySet[dict]:
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Getting contributions with unexpected status for stripe account `{stripe_account_id}`"
            )
        )
        expected_status_map = {
            sub.id: StripeTransactionsImporter.get_status_for_subscription(sub.status) for sub in subscriptions
        }
        subscription_status_map = {sub.id: sub.status for sub in subscriptions}
        return (
            contributions.annotate(
                expected_status=Case(
                    *[
                        When(provider_subscription_id=sub_id, then=Value(status))
                        for sub_id, status in expected_status_map.items()
                    ],
                    default=Value(None),
                ),
                subscription_status=Case(
                    *[
                        When(provider_subscription_id=sub_id, then=Value(status))
                        for sub_id, status in subscription_status_map.items()
                    ],
                    default=Value(None),
                ),
            )
            .filter(~Q(status=F("expected_status")))
            .values(
                "id",
                "provider_subscription_id",
                "expected_status",
                "status",
                "subscription_status",
            )
        )

    def do_audit(self, stripe_account_id: str) -> None:
        stripe_subscriptions = self.get_stripe_subscriptions_for_account(stripe_account_id)
        self.stdout.write(
            self.style.HTTP_INFO(f"Found {len(stripe_subscriptions)} subscriptions for account {stripe_account_id}")
        )
        existing_contributions = self.get_recurring_contributions_for_account(stripe_account_id)
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {existing_contributions.count()} contributions for account {stripe_account_id}"
            )
        )
        orphaned_contributions = existing_contributions.filter(
            Q(
                Q(provider_subscription_id__isnull=False)
                & ~Q(provider_subscription_id__in=[sub.id for sub in stripe_subscriptions])
            )
        )
        self.stdout.write(self.style.HTTP_INFO(f"Found {orphaned_contributions.count()} orphaned contributions"))
        for x in orphaned_contributions:
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"ORPHANED CONTRIBUTION: Contribution {x.id} has reference to an unretrievable Stripe "
                    f"subscription {x.provider_subscription_id}"
                )
            )
        orphaned_subscriptions = [
            sub
            for sub in stripe_subscriptions
            if sub.id not in existing_contributions.values_list("provider_subscription_id", flat=True)
        ]
        self.stdout.write(self.style.HTTP_INFO(f"Found {len(orphaned_subscriptions)} orphaned subscriptions"))
        for x in orphaned_subscriptions:
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"ORPHANED SUBSCRIPTION: Stripe subscription {x.id} with status {x.status} has no corresponding contribution"
                )
            )
        contributions_with_unexpected_status = self.get_contributions_with_unexpected_status(
            existing_contributions.exclude(id__in=orphaned_contributions.values_list("id", flat=True)),
            stripe_subscriptions,
            stripe_account_id,
        )
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {len(contributions_with_unexpected_status)} contributions with unexpected status"
            )
        )
        for x in contributions_with_unexpected_status:
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"UNEXPECTED STATUS: Contribution {x['id']} has status {x['status']} but expected "
                    f"{x['expected_status']}. Subscription {x['provider_subscription_id']} has status {x['subscription_status']}"
                )
            )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--for-stripe-accounts",
            type=lambda s: [x.strip() for x in s.split(",")],
            required=True,
            help="Required comma-separated list of stripe accounts to audit",
        )

    def handle(self, *args, **options):
        """Handle command."""
        accounts_by_status = get_stripe_accounts_and_their_connection_status(options["for_stripe_accounts"])
        for stripe_account_id, connected in accounts_by_status.items():
            if not connected:
                self.stdout.write(
                    self.style.WARNING(f"Skipping stripe account `{stripe_account_id}` because it is not connected")
                )
            else:
                self.stdout.write(
                    self.style.HTTP_INFO(f"Auditing recurring contributions for stripe account `{stripe_account_id}`")
                )
                self.do_audit(stripe_account_id=stripe_account_id)
        self.stdout.write(self.style.SUCCESS(f"`{self.name}` is done"))
