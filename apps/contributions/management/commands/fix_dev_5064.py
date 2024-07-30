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


# This is the revision comment we expect contributions created by the `import_stripe_transactions_data` management command to have
REVISION_COMMENT = "StripeTransactionsImporter.upsert_contribution created Contribution"
# Contributions in revengine with these metadata versions will also have an "arbitrary" (from viewpoint of contributor) first_payment_date
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

    def get_contributions(self) -> tuple[QuerySet[Contribution], QuerySet[Contribution]]:
        """Get relevant contributions to be updated by this command.

        Relevancy criteria:
        - if one-time, must have provider_payment_id
        - if recurring, must have provider_subscription_id
        - parent stripe account must be connected
        """
        self.stdout.write(self.style.HTTP_INFO("Retrieving contributions with relevant metadata or revision comment"))
        qs = Contribution.objects.with_stripe_account().filter(
            Q(
                Q(provider_payment_id__isnull=False, interval=ContributionInterval.ONE_TIME)
                | Q(
                    provider_subscription_id__isnull=False,
                    interval__in=(ContributionInterval.MONTHLY, ContributionInterval.YEARLY),
                )
            )
        )
        #  ~99% of relevant contributions are in the first query
        relevant_via_metadata = qs.filter(contribution_metadata__schema_version__in=METADATA_VERSIONS)
        self.stdout.write(self.style.HTTP_INFO(f"Found {relevant_via_metadata.count()} with relevant metadata"))
        # as distinct from first query
        via_metadata_ids = relevant_via_metadata.values_list("id", flat=True)
        _exclude_kwargs = {}
        if via_metadata_ids := relevant_via_metadata.values_list("id", flat=True):
            _exclude_kwargs["id__in"] = via_metadata_ids
        relevant_via_revision_comment = qs.get_via_reversion_comment(comment=REVISION_COMMENT).exclude(
            **_exclude_kwargs
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
        return (
            relevant_via_metadata.exclude(id__in=(_ids := unfixable.values_list("id", flat=True))),
            relevant_via_revision_comment.exclude(id__in=_ids),
        )

    def handle_relevant_via_metadata(
        self, contributions: QuerySet[Contribution], importer: StripeTransactionsImporter
    ) -> None:
        """Get contributions relevant to this command because they have metadata versions in `METADATA_VERSIONS`."""
        self.stdout.write(
            self.style.HTTP_INFO(f"Processing relevant via metadata for account {importer.stripe_account_id}")
        )
        if not contributions.exists():
            self.stdout.write(self.style.HTTP_INFO("No contributions to process, so will not list and cache resources"))
            return

        for _version in METADATA_VERSIONS:
            importer.list_and_cache_payment_intents_with_metadata_version(
                metadata_version=_version, prune_fn=lambda x: {"id": x["id"], "created": x["created"]}
            )
            importer.list_and_cache_subscriptions_with_metadata_version(
                metadata_version=_version, prune_fn=lambda x: {"id": x["id"], "start_date": x["start_date"]}
            )
        to_update = []
        for con in contributions:
            if con.interval == ContributionInterval.ONE_TIME:
                pi = importer.get_resource_from_cache(
                    key=importer.make_key(entity_name="PaymentIntent", entity_id=con.provider_payment_id)
                )
                if pi:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Found PaymentIntent {pi['id']} for contribution {con.id}. Setting first_billing_date to pi "
                            f"created ({pi['created']})"
                        )
                    )
                    con.first_payment_date = datetime.datetime.fromtimestamp(pi["created"], tz=datetime.timezone.utc)
                    to_update.append(con)
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Could not find PaymentIntent for contribution {con.id} with provider_payment_id {con.provider_payment_id}"
                        )
                    )

            else:
                sub = importer.get_resource_from_cache(
                    key=importer.make_key(entity_name="Subscription", entity_id=con.provider_subscription_id)
                )
                if sub:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Found subscription {sub['id']} for contribution {con.id}. Setting first_billing_date to subscription "
                            f"first ({sub['start_date']})"
                        )
                    )
                    con.first_payment_date = datetime.datetime.fromtimestamp(
                        sub["start_date"], tz=datetime.timezone.utc
                    )
                    to_update.append(con)
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Could not find PaymentIntent for contribution {con.id} with provider_payment_id {con.provider_payment_id}"
                        )
                    )
        self.stdout.write(self.style.HTTP_INFO(f"Bulk updating {len(to_update)} contributions"))
        Contribution.objects.bulk_update(to_update, ["first_payment_date", "modified"])

    def handle_relevant_via_revision_comment(
        self, contributions: QuerySet[Contribution], stripe_account_id: str
    ) -> None:
        """Get contributions relevant to this command because they have revision comment `REVISION_COMMENT`."""
        self.stdout.write(
            self.style.HTTP_INFO(f"Processing relevant via revision comment for account {stripe_account_id}")
        )
        to_update = []
        for con in contributions:
            if con.interval == ContributionInterval.ONE_TIME:
                try:
                    pi = stripe.PaymentIntent.retrieve(con.provider_payment_id, stripe_account=stripe_account_id)
                except stripe.error.InvalidRequestError:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Could not find PaymentIntent for contribution {con.id} with provider_payment_id {con.provider_payment_id}"
                        )
                    )
                    continue
                else:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Found PaymentIntent {pi['id']} for contribution {con.id}. Setting first_billing_date to pi created "
                            f"({pi['created']})"
                        )
                    )
                    con.first_payment_date = datetime.datetime.fromtimestamp(pi["created"], tz=datetime.timezone.utc)
                    to_update.append(con)
            else:
                try:
                    sub = stripe.Subscription.retrieve(con.provider_subscription_id, stripe_account=stripe_account_id)
                except stripe.error.InvalidRequestError:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Could not find Subscription for contribution {con.id} with provider_subscription_id "
                            f"{con.provider_subscription_id}"
                        )
                    )
                    continue
                else:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Found subscription {sub['id']} for contribution {con.id}. Setting first_billing_date "
                            f"to subscription start date ({sub['start_date']})"
                        )
                    )
                    con.first_payment_date = datetime.datetime.fromtimestamp(
                        sub["start_date"], tz=datetime.timezone.utc
                    )
                    to_update.append(con)
        self.stdout.write(self.style.HTTP_INFO(f"Bulk pdating {len(to_update)} contributions"))
        Contribution.objects.bulk_update(to_update, ["first_payment_date", "modified"])

    def handle_account(
        self,
        account_id: str,
        relevant_via_metadata: QuerySet[Contribution],
        relevant_via_revision_comment: QuerySet[Contribution],
    ) -> None:
        """Handle contributions for a specific stripe account.

        This involves retrieving the contributions, then filling Stripe data cache
        """
        self.stdout.write(self.style.HTTP_INFO(f"Processing account {account_id}"))
        importer = StripeTransactionsImporter(
            from_date=None,
            to_date=None,
            stripe_account_id=account_id,
            retrieve_payment_method=False,
            sentry_profiler=False,
        )
        self.handle_relevant_via_metadata(contributions=relevant_via_metadata, importer=importer)
        self.handle_relevant_via_revision_comment(
            contributions=relevant_via_revision_comment, stripe_account_id=account_id
        )

    def handle(self, *args, **options):
        command_name = Path(__file__).stem
        self.stdout.write(self.style.HTTP_INFO(f"Running {command_name}"))
        self.configure_stripe_log_level(options["suppress_stripe_info_logs"])

        # Fetch contributions
        relevant_via_metadata, relevant_via_revision_comment = self.get_contributions()
        # Combine and distinct
        combined_qs = relevant_via_metadata | relevant_via_revision_comment
        distinct_accounts = combined_qs.values_list("stripe_account", flat=True).distinct()
        # Convert to set to ensure uniqueness
        unique_accounts = set(distinct_accounts)
        # Process each unique account
        for account in unique_accounts:
            # not sure why, but need to re-call `with_stripe_account` here even though the original queryset should already have it
            # in practice it seems to drop out (maybe because of the union and some weird side effect?)
            _via_metadata = relevant_via_metadata.with_stripe_account().filter(stripe_account=account)
            _via_revision_comment = relevant_via_revision_comment.with_stripe_account().filter(stripe_account=account)
            self.handle_account(
                account_id=account,
                relevant_via_metadata=_via_metadata,
                relevant_via_revision_comment=_via_revision_comment,
            )
            self.stdout.write(self.style.SUCCESS(f"Account {account} is done"))

        self.stdout.write(self.style.SUCCESS(f"{command_name} is done"))
