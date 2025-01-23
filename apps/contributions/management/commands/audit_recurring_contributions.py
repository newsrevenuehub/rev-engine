import logging
from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser
from django.db.models import Case, F, Q, QuerySet, Value, When

import stripe

from apps.common.utils import get_stripe_accounts_and_their_connection_status
from apps.contributions.choices import ContributionInterval
from apps.contributions.models import Contribution
from apps.contributions.stripe_import import StripeTransactionsImporter
from apps.contributions.typings import STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS


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

    def get_expected_interval(self, subscription: stripe.Subscription) -> ContributionInterval:
        match subscription["items"].data[0].plan.interval:
            case "month":
                return ContributionInterval.MONTHLY
            case "year":
                return ContributionInterval.YEARLY
            case _:
                raise ValueError(f"Unexpected interval {subscription['items'].data[0].plan.interval}")

    def get_contributions_with_mismatched_data(
        self, contributions: QuerySet[Contribution], subscriptions: list[stripe.Subscription], stripe_account_id: str
    ) -> QuerySet[dict]:
        self.stdout.write(
            self.style.HTTP_INFO(f"Getting contributions with mismatched data for stripe account `{stripe_account_id}`")
        )
        expectations_map = {
            sub.id: {
                "expected_status": StripeTransactionsImporter.get_status_for_subscription(sub.status),
                "expected_interval": self.get_expected_interval(sub),
                "expected_amount": sub["items"].data[0].plan.amount,
                "subscription_status": sub.status,
            }
            for sub in subscriptions
        }
        annotated = contributions.annotate(
            expected_status=Case(
                *[
                    When(provider_subscription_id=sub_id, then=Value(data["expected_status"]))
                    for sub_id, data in expectations_map.items()
                ],
                default=Value(None),
            ),
            subscription_status=Case(
                *[
                    When(provider_subscription_id=sub_id, then=Value(data["subscription_status"]))
                    for sub_id, data in expectations_map.items()
                ],
                default=Value(None),
            ),
            expected_interval=Case(
                *[
                    When(provider_subscription_id=sub_id, then=Value(data["expected_interval"]))
                    for sub_id, data in expectations_map.items()
                ]
            ),
            expected_amount=Case(
                *[
                    When(provider_subscription_id=sub_id, then=Value(data["expected_amount"]))
                    for sub_id, data in expectations_map.items()
                ]
            ),
        )

        # Filter for mismatched data and return only relevant fields
        return annotated.filter(
            ~Q(status=F("expected_status")) | ~Q(interval=F("expected_interval")) | ~Q(amount=F("expected_amount"))
        ).values(
            "id",
            "provider_subscription_id",
            "expected_status",
            "status",
            "subscription_status",
            "expected_interval",
            "interval",
            "expected_amount",
            "amount",
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
        contributions_with_mismatched_data = self.get_contributions_with_mismatched_data(
            existing_contributions.exclude(id__in=orphaned_contributions.values_list("id", flat=True)),
            stripe_subscriptions,
            stripe_account_id,
        )
        self.stdout.write(
            self.style.HTTP_INFO(f"Found {len(contributions_with_mismatched_data)} contributions with mismatched data")
        )
        for x in contributions_with_mismatched_data:
            self.stdout.write(self.style.HTTP_INFO(f"MISMATCHED DATA: {x}"))

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
