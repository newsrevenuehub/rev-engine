import logging
from enum import Enum
from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction
from django.db.models import Q, QuerySet

import reversion
import stripe

from apps.common.utils import get_stripe_accounts_and_their_connection_status
from apps.contributions.choices import ContributionInterval, ContributionStatus
from apps.contributions.models import Contribution


# otherwise we get spammed by stripe info logs when running this command
logging.getLogger("stripe").setLevel(logging.ERROR)


TEMP_PM_ID = "pm_this_is_temp_for_2445"


class ContributionOutcome(Enum):
    UPDATED = "updated"
    NOT_UPDATED = "not updated"


class Command(BaseCommand):
    """Command to specifically solve for incident 2445."""

    @property
    def name(self):
        return Path(__file__).name

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--payment-method-id", type=str, help="Payment method ID to query for contributions with", required=True
        )
        parser.add_argument(
            "--original-contribution-id",
            type=str,
            help="Original contribution ID to exclude from the query",
            required=True,
        )

    def _save_changes(self, contribution: Contribution, update_fields: set) -> Contribution:
        """Save changes to contribution and create a reversion revision for it."""
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Saving changes to contribution {contribution.id} with fields {', '.join(update_fields)}"
            )
        )
        with reversion.create_revision():
            contribution.save(update_fields=update_fields | {"modified"})
            reversion.set_comment(f"Updated by {self.name} command")
        return contribution

    def get_stripe_subscription(self, contribution: Contribution) -> stripe.Subscription | None:
        """Retrieve stripe subscription for contribution.

        If Stripe gives us problems we return None.
        """
        self.style.HTTP_INFO(f"Getting for contribution {contribution.id}")
        if not (sub_id := contribution.provider_subscription_id):
            return None
        try:
            self.style.HTTP_INFO(f"Retrieving subscription {sub_id} for contribution {contribution.id}")
            return stripe.Subscription.retrieve(
                contribution.provider_subscription_id,
                stripe_account=contribution.stripe_account_id,
                expand=["latest_invoice.payment_intent"],
            )
        except stripe.error.StripeError as e:
            self.stdout.write(
                self.style.ERROR(
                    f"Failed to retrieve subscription {sub_id} for contribution {contribution.id} with error: {e}"
                )
            )

    def handle_sync_pm(self, contribution: Contribution, pm_id: str, update_fields: set) -> tuple[Contribution, set]:
        """Sync payment method ID and optionally details to contribution."""
        self.stdout.write(self.style.HTTP_INFO(f"Syncing payment method ID {pm_id} to contribution {contribution.id}"))
        update_fields.add("provider_payment_method_id")
        contribution.provider_payment_method_id = pm_id
        if pm_details := contribution.fetch_stripe_payment_method(pm_id):
            contribution.provider_payment_method_details = pm_details
            update_fields.add("provider_payment_method_details")
        return contribution, update_fields

    def handle_recurring_contribution(self, contribution: Contribution) -> tuple[Contribution, ContributionOutcome]:
        """Handle recurring contribution.

        Try to get payment method id via subscription or setup intent if flagged and if found, we try to retrieve details.
        Update provider_payment_method_id and optionally provider_payment_method_details if found.
        """
        self.stdout.write(self.style.HTTP_INFO(f"Handling recurring contribution {contribution.id}"))
        update_fields = set()
        if (
            (sub := self.get_stripe_subscription(contribution))
            and sub.latest_invoice
            and sub.latest_invoice.payment_intent
            and (pm_id := sub.latest_invoice.payment_intent.payment_method)
        ) or (
            contribution.status == ContributionStatus.FLAGGED
            and (si := contribution.stripe_setup_intent)
            and (pm_id := si.payment_method)
        ):
            contribution, update_fields = self.handle_sync_pm(contribution, pm_id, update_fields)
        else:
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"Could not find payment method ID for contribution {contribution.id} with status {contribution.status}"
                )
            )
        if update_fields:
            return self._save_changes(contribution, update_fields), ContributionOutcome.UPDATED
        return contribution, ContributionOutcome.NOT_UPDATED

    def handle_one_time_contribution(self, contribution: Contribution) -> tuple[Contribution, ContributionOutcome]:
        """Handle one-time contribution.

        Try to get payment method id via payment intent. If found, we try to retrieve details.
        Update provider_payment_method_id and optionally provider_payment_method_details if found.
        """
        update_fields = set()
        if (pi := contribution.stripe_payment_intent) and (pm_id := pi.payment_method):
            contribution, update_fields = self.handle_sync_pm(contribution, pm_id, update_fields)
        if update_fields:
            return self._save_changes(contribution, update_fields), ContributionOutcome.UPDATED
        return contribution, ContributionOutcome.NOT_UPDATED

    def nullify_bad_change(self, contributions: QuerySet[Contribution]) -> QuerySet[Contribution]:
        """Set affected contribution's payment related fields to temp values."""
        self.stdout.write(self.style.HTTP_INFO("Nullifying bad change to contributions"))
        with transaction.atomic():
            for x in contributions:
                with reversion.create_revision():
                    x.provider_payment_method_id = TEMP_PM_ID
                    x.provider_payment_method_details = None
                    x.save(update_fields={"provider_payment_method_id", "provider_payment_method_details", "modified"})
                    reversion.set_comment(f"Nullified bad change by {self.name}.Command.nullify_bad_change")
        return contributions

    def get_queryset(self, original_contribution_id: str, payment_method_id: str) -> QuerySet[Contribution]:
        """Get queryset of contributions."""
        return Contribution.objects.exclude(id=original_contribution_id).filter(
            provider_payment_method_id__in=(payment_method_id, TEMP_PM_ID)
        )

    def handle(self, *args, **options):
        """Handle command.

        Find all contributions that have provider_payment_method_id value equal to provided one in options.
        Of those, exclude ones where we can't connect to Stripe account and excluding the original contribution that is meant to have
        this provider_payment_method_id.
        For the rest, update provider_payment_method_id and optionally provider_payment_method_details via distinct routines
        for one-time and recurring contributions.
        """
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name}`"))
        contributions = self.get_queryset(options["original_contribution_id"], options["payment_method_id"])
        if not contributions.exists():
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"No effected contributions with provider payment method ID {options['payment_method_id']} found"
                )
            )
            return
        nullified = self.nullify_bad_change(contributions)
        account_ids = set(
            list(
                nullified.filter(donation_page__revenue_program__payment_provider__stripe_account_id__isnull=False)
                .values_list("donation_page__revenue_program__payment_provider__stripe_account_id", flat=True)
                .distinct()
            )
            + list(
                nullified.filter(_revenue_program__payment_provider__stripe_account_id__isnull=False)
                .values_list("_revenue_program__payment_provider__stripe_account_id", flat=True)
                .distinct()
            )
        )
        accounts = get_stripe_accounts_and_their_connection_status(account_ids)
        unretrievable_accounts = [k for k, v in accounts.items() if not v]
        connected_accounts = [k for k, v in accounts.items() if v]

        fixable_contributions = nullified.filter(
            Q(donation_page__revenue_program__payment_provider__stripe_account_id__in=connected_accounts)
            | Q(_revenue_program__payment_provider__stripe_account_id__in=connected_accounts)
        )
        fixable_contributions_count = fixable_contributions.count()
        ineligible_because_of_account = contributions.filter(
            Q(donation_page__revenue_program__payment_provider__stripe_account_id__in=unretrievable_accounts)
            | Q(_revenue_program__payment_provider__stripe_account_id__in=unretrievable_accounts),
        )
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {fixable_contributions_count} eligible contribution{'' if fixable_contributions_count == 1 else 's'} to fix"
            )
        )
        if ineligible_because_of_account.exists():
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"Found {(_inel_account:=ineligible_because_of_account.count())} contribution{'' if _inel_account == 1 else 's'} "
                    f"that cannot be updated because account is disconnected or some other problem "
                    f"retrieving account: {', '.join(str(x) for x in ineligible_because_of_account.values_list('id', flat=True))}"
                )
            )
        updated_ids = []
        unupdated_ids = []
        for contribution in fixable_contributions.all():
            if contribution.interval == ContributionInterval.ONE_TIME:
                _method = self.handle_one_time_contribution
            else:
                _method = self.handle_recurring_contribution
            handled, outcome = _method(contribution)
            if outcome == ContributionOutcome.UPDATED:
                updated_ids.append(handled.id)
            else:
                unupdated_ids.append(handled.id)

        self.stdout.write(
            self.style.SUCCESS(
                f"Updated {len(updated_ids)} contribution(s) out of {fixable_contributions_count} eligible contributions. "
                f"The following contributions were updated: {', '.join(map(str, updated_ids))}"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                f"Failed to update {len(unupdated_ids)} contribution(s) out of {fixable_contributions_count} eligible contributions. "
                f"The following contributions were not updated: {', '.join(map(str, unupdated_ids))}"
            )
        )
        self.stdout.write(self.style.SUCCESS(f"`{self.name}` is done"))
