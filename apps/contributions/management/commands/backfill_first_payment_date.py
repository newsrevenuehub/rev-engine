import datetime
import logging
from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser
from django.db.models import Q, QuerySet

import stripe

from apps.common.utils import get_stripe_accounts_and_their_connection_status
from apps.contributions.choices import ContributionInterval
from apps.contributions.models import Contribution
from apps.contributions.stripe_import import StripeTransactionsImporter


# This is the revision comment we expect contributions created by the
# `import_stripe_transactions_data` management command to have.
REVISION_COMMENT = "StripeTransactionsImporter.upsert_contribution created Contribution"

# Contributions in revengine with these metadata versions will also have an
# "arbitrary" (from viewpoint of contributor) first_payment_date.
METADATA_VERSIONS = (
    "1.3",
    "1.5",
)


class Command(BaseCommand):
    """Set contribution.first_payment_date to created date of PaymentIntent or start date of Subscription, where applicable.

    We target contributions created through Stripe transactions import (evidenced by having an expected revision comment of
    `REVISION_COMMENT` or metadata version in `METADATA_VERSIONS`).

    For relevant contributions where Stripe account is connected to revengine, we pull down the PaymentIntent or Subscription
    and save the created/start date as the first_payment_date.
    """

    help = "Set contribution.first_payment_date to created date of PaymentIntent or start date of Subscription, where applicable."

    @property
    def name(self) -> str:
        return Path(__file__).name

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--suppress-stripe-info-logs", action="store_true", default=False)

    def configure_stripe_log_level(self, suppress_stripe_info_logs: bool) -> None:
        """Set Stripe log level to ERROR to suppress INFO logs (which we would otherwise get by default)."""
        if suppress_stripe_info_logs:
            stripe_logger = logging.getLogger("stripe")
            stripe_logger.setLevel(logging.ERROR)

    def get_contributions(self) -> QuerySet[Contribution]:
        """Get relevant contributions to be updated by this command.

        Relevancy criteria:
        - if one-time, must have provider_payment_id
        - if recurring, must have provider_subscription_id
        - parent Stripe account must be connected
        """
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Retrieving contributions with relevant metadata versions {METADATA_VERSIONS} "
                f"or revision comment '{REVISION_COMMENT}'"
            )
        )
        # Removing ordering here (which defaults to creation date) so that we
        # can later use distinct() to get distinct account IDs. If we leave it
        # in, the created column is selected which defeats the purpose of the distinct.
        qs = (
            Contribution.objects.order_by()
            .with_stripe_account()
            .filter(
                Q(
                    Q(provider_payment_id__isnull=False, interval=ContributionInterval.ONE_TIME)
                    | Q(
                        provider_subscription_id__isnull=False,
                        interval__in=(ContributionInterval.MONTHLY, ContributionInterval.YEARLY),
                    )
                )
            )
        )
        #  ~99% of relevant contributions are in the first query
        relevant_via_metadata = qs.filter(contribution_metadata__schema_version__in=METADATA_VERSIONS)
        self.stdout.write(self.style.HTTP_INFO(f"Found {relevant_via_metadata.count()} with relevant metadata"))
        # as distinct from first query
        relevant_via_revision_comment = qs.get_via_reversion_comment(comment=REVISION_COMMENT).exclude(
            id__in=relevant_via_metadata.values_list("id", flat=True)
        )
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {relevant_via_revision_comment.count()} with relevant revision comment (distinct from metadata query set members)"
            )
        )
        combined = relevant_via_metadata | relevant_via_revision_comment
        accounts = get_stripe_accounts_and_their_connection_status(
            set(combined.values_list("stripe_account", flat=True).distinct())
        )
        unfixable = combined.filter(
            stripe_account__in=[account for account, connected in accounts.items() if connected is False]
        )
        self.stdout.write(
            self.style.HTTP_INFO(
                f"There are {unfixable.count()} contribution(s) that cannot be fixed due to unconnected stripe account(s): "
                f"{unfixable.values_list('id', flat=True)}"
            )
        )
        return relevant_via_metadata.exclude(
            id__in=(_ids := unfixable.values_list("id", flat=True))
        ) | relevant_via_revision_comment.exclude(id__in=_ids)

    def handle_account(self, account_id: str, contributions: QuerySet[Contribution]) -> None:
        """Handle contributions for a single Stripe account."""
        self.stdout.write(self.style.HTTP_INFO(f"Processing account {account_id}"))
        # Preload Stripe data where it can be bulk requested.
        importer = StripeTransactionsImporter(
            from_date=None,
            to_date=None,
            stripe_account_id=account_id,
            retrieve_payment_method=False,
            sentry_profiler=False,
        )
        for version in METADATA_VERSIONS:
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"Caching Stripe subs and PIs for account {account_id}, metadata version {version}"
                )
            )
            # no cover pragmas below are because testing these lambdas has a low ROI.
            importer.list_and_cache_payment_intents_with_metadata_version(
                metadata_version=version,
                prune_fn=lambda x: {"id": x["id"], "created": x["created"]},  # pragma: no cover
            )
            importer.list_and_cache_subscriptions_with_metadata_version(
                metadata_version=version,
                prune_fn=lambda x: {"id": x["id"], "start_date": x["start_date"]},  # pragma: no cover
            )
        # Update contributions.
        to_update = []
        for contribution in contributions:
            self.stdout.write(self.style.HTTP_INFO(f"Processing contribution ID {contribution.id}"))
            # Try to retrieve data from the import cache if possible. Only
            # contributions eligible via metadata version will have this,
            # though. Otherwise, we need to make a request to Stripe.
            if contribution.interval == ContributionInterval.ONE_TIME:
                pi = importer.get_resource_from_cache(
                    key=importer.make_key(entity_name="PaymentIntent", entity_id=contribution.provider_payment_id)
                )
                if not pi:
                    self.stdout.write(
                        self.style.HTTP_INFO(f"Contribution {contribution.id} isn't in cache, retrieving from Stripe")
                    )
                    try:
                        pi = stripe.PaymentIntent.retrieve(
                            contribution.provider_payment_id, stripe_account=contribution.stripe_account_id
                        )
                    except stripe.error.InvalidRequestError:
                        self.stdout.write(
                            self.style.WARNING(
                                f"Could not find PaymentIntent for contribution {contribution.id} with "
                                f"provider_payment_id {contribution.provider_payment_id}"
                            )
                        )
                        continue
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Found PaymentIntent {pi['id']} for contribution {contribution.id}. "
                        f"Setting first_billing_date to pi created ({pi['created']})"
                    )
                )
                contribution.first_payment_date = datetime.datetime.fromtimestamp(
                    pi["created"], tz=datetime.timezone.utc
                )
                to_update.append(contribution)
                continue
            sub = importer.get_resource_from_cache(
                key=importer.make_key(entity_name="Subscription", entity_id=contribution.provider_subscription_id)
            )
            if not sub:
                self.stdout.write(
                    self.style.HTTP_INFO(f"Contribution {contribution.id} isn't in cache, retrieving from Stripe")
                )
                try:
                    sub = stripe.Subscription.retrieve(
                        contribution.provider_subscription_id, stripe_account=contribution.stripe_account_id
                    )
                except stripe.error.InvalidRequestError:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Could not find subscription for contribution {contribution.id} with "
                            f"provider_subscription_id {contribution.provider_subscription_id}"
                        )
                    )
                    continue
            self.stdout.write(
                self.style.SUCCESS(
                    f"Found subscription {sub['id']} for contribution {contribution.id}. "
                    f"Setting first_billing_date to subscription first ({sub['start_date']})"
                )
            )
            contribution.first_payment_date = datetime.datetime.fromtimestamp(
                sub["start_date"], tz=datetime.timezone.utc
            )
            to_update.append(contribution)
        self.stdout.write(self.style.HTTP_INFO(f"Bulk updating {len(to_update)} contributions"))
        Contribution.objects.bulk_update(to_update, ["first_payment_date", "modified"])
        self.stdout.write(self.style.SUCCESS(f"Account {account_id} is done"))

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(f"Running {self.name}"))
        self.configure_stripe_log_level(options["suppress_stripe_info_logs"])
        contributions = self.get_contributions().with_stripe_account()
        account_ids = contributions.values_list("stripe_account", flat=True).distinct()
        for stripe_account_id in account_ids:
            self.handle_account(
                account_id=stripe_account_id, contributions=contributions.filter(stripe_account=stripe_account_id)
            )
        self.stdout.write(self.style.SUCCESS(f"{self.name} is done"))
