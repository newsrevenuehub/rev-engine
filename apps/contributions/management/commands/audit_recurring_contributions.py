import logging
from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser
from django.db.models import Q, QuerySet
from django.utils import timezone

import pandas as pd
import stripe

from apps.common.utils import get_stripe_accounts_and_their_connection_status
from apps.contributions.choices import ContributionInterval
from apps.contributions.models import Contribution
from apps.contributions.stripe_import import StripeTransactionsImporter


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
        self.stdout.write(
            self.style.HTTP_INFO(f"Getting stripe subscriptions for stripe account `{stripe_account_id}`")
        )
        return list(stripe.Subscription.list(stripe_account=stripe_account_id, status="all").auto_paging_iter())

    def _get_link_for_subscription(self, subscription: stripe.Subscription, stripe_account_id: str) -> str:
        return f"https://dashboard.stripe.com/accounts/{stripe_account_id}/subscriptions/{subscription.id}"

    def get_contributions_with_unexpected_status(
        self, contributions: QuerySet[Contribution], subscriptions: list[stripe.Subscription], stripe_account_id: str
    ) -> list[dict]:
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Getting contributions with unexpected status for stripe account `{stripe_account_id}`"
            )
        )
        problems = []
        subs_map = {sub.id: sub for sub in subscriptions}
        for contribution in contributions:
            sub = subs_map[contribution.provider_subscription_id]
            if contribution.status != StripeTransactionsImporter.get_status_for_subscription(sub.status):
                problems.append(
                    {
                        "contribution_id": contribution.id,
                        "contribution_status": contribution.status,
                        "subscription_status": sub.status,
                        "subscription_id": sub.id,
                        "subscription_link": self._get_link_for_subscription(sub, stripe_account_id),
                    }
                )
        return problems

    def do_audit(self, stripe_account_id: str, timestamp_str) -> None:
        stripe_subscriptions = self.get_stripe_subscriptions_for_account(stripe_account_id)
        self.stdout.write(
            self.style.HTTP_INFO("Found {len(stripe_subscriptions)} subscriptions for account {stripe_account_id}")
        )
        existing_contributions = self.get_recurring_contributions_for_account(stripe_account_id)
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {existing_contributions.count()} contributions for account {stripe_account_id}"
            )
        )
        orphaned_contributions = existing_contributions.filter(
            Q(provider_subscription_id__isnull=True)
            | Q(provider_subscription_id__in=[sub.id for sub in stripe_subscriptions])
        )
        self.stdout.write(self.style.HTTP_INFO(f"Found {orphaned_contributions.count()} orphaned contributions"))
        if orphaned_contributions.exists():
            pd.DataFrame(
                [
                    {"id": x.id, "status": x.status, "interval": x.interval, "problem": "stripe subscription not found"}
                    for x in orphaned_contributions
                ]
            ).to_csv(f"orphaned_contributions_{stripe_account_id}-{timestamp_str}.csv", index=False)
        orphaned_subscriptions = [
            sub
            for sub in stripe_subscriptions
            if sub.id not in existing_contributions.values_list("provider_subscription_id", flat=True)
        ]
        self.stdout.write(self.style.HTTP_INFO(f"Found {len(orphaned_subscriptions)} orphaned subscriptions"))
        if orphaned_subscriptions:
            pd.DataFrame(
                [
                    {
                        "id": sub.id,
                        "status": sub.status,
                        "link": self._get_link_for_subscription(sub, stripe_account_id),
                    }
                    for sub in orphaned_subscriptions
                ]
            ).to_csv(f"orphaned_subscriptions_{stripe_account_id}-{timestamp_str}.csv", index=False)
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

        if contributions_with_unexpected_status:
            pd.DataFrame(contributions_with_unexpected_status).to_csv(
                f"contributions_with_unexpected_status_{stripe_account_id}-{timestamp_str}.csv", index=False
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
                self.do_audit(
                    stripe_account_id=stripe_account_id, timestamp_str=timezone.now().strftime("%Y-%m-%d_%H-%M-%S")
                )
        self.stdout.write(self.style.SUCCESS(f"`{self.name}` is done"))
