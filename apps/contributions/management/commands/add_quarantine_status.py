from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

import reversion

from apps.contributions.choices import ContributionInterval, ContributionStatus, QuarantineStatus
from apps.contributions.models import Contribution


# TODO @BW: Remove this command and tests after ITS-3204 is complete
# DEV-6356


class Command(BaseCommand):
    """Command to retroactively add quarantine status to contributions that were approved or rejected in the past."""

    @property
    def name(self):
        return Path(__file__).name

    @property
    def base_queryset(self):
        # We will limit to only v1.4 contributions because they're the only ones that should have a quarantine status,
        # and some assumptions in other code in command (such as presence of provider_setup_intent_id) are only valid for
        # v1.4 contributions.
        return Contribution.objects.filter(contribution_metadata__schema_version="1.4", quarantine_status__isnull=True)

    @property
    def rejected_contributions(self):
        """Get contributions that were rejected by a human in quarantine.

        Note: In general, status of "rejected" is a good indicator that contribution was rejected via quarantine queue. That said,
        there may be a small number of one-time contributions whose status is `rejected` not because a human rejected them
        in quarantine, but because we processed a stripe payment_intent.canceled event, which can happen from time to time if we
        let through a transaction that downstream Stripe identifies as fraudulent for some reason. While we could look into revision
        comments (for instance, look for the absence of a revision comment indicating the webhook processor for payment_intent.canceled
        touched contribution), this is a small edge case and we can ignore it for now.
        """
        return self.base_queryset.filter(status=ContributionStatus.REJECTED)

    @property
    def approved_recurring_contributions(self):
        """Get recurring contributions that were approved."""
        return self.base_queryset.filter(
            interval__in=[ContributionInterval.MONTHLY, ContributionInterval.YEARLY],
            provider_setup_intent_id__isnull=False,
            provider_subscription_id__isnull=False,
        )

    @property
    def approved_one_time_contributions(self):
        """Get one-time contributions that were approved."""
        return self.base_queryset.filter(
            interval=ContributionInterval.ONE_TIME,
            status=ContributionStatus.PAID,
            bad_actor_score__gte=settings.BAD_ACTOR_BAD_SCORE,
        )

    @property
    def approved_contributions(self):
        """Get contributions that were approved."""
        return self.approved_one_time_contributions.union(self.approved_recurring_contributions, all=True)

    def update_rejected_contributions_quarantine_status(self):
        """Update quarantine status for contributions that were rejected."""
        self.stdout.write(self.style.HTTP_INFO("Updating quarantine status for rejected contributions"))
        qs = self.rejected_contributions
        self.stdout.write(
            self.style.HTTP_INFO(f"Found {qs.count()} rejected contributions to update quarantine status")
        )
        for contribution in qs:
            self.update_contribution_quarantine_status(contribution, QuarantineStatus.REJECTED_BY_HUMAN_FOR_UNKNOWN)

    def update_approved_contributions_quarantine_status(self):
        """Update quarantine status for recurring contributions that were approved."""
        self.stdout.write(self.style.HTTP_INFO("Updating quarantine status for approved recurring contributions"))
        qs = self.approved_contributions
        self.stdout.write(
            self.style.HTTP_INFO(f"Found {qs.count()} approved recurring contributions to update quarantine status")
        )
        for contribution in qs:
            self.update_contribution_quarantine_status(contribution, QuarantineStatus.APPROVED_BY_UKNKOWN)

    def update_contribution_quarantine_status(self, contribution: Contribution, status: QuarantineStatus):
        """Update the quarantine status of a contribution."""
        contribution.quarantine_status = status
        with reversion.create_revision():
            contribution.save(update_fields={"quarantine_status", "modified"})
            reversion.set_comment("Management command add_quarantine_status [DEV-5528] updated quarantine status")
        self.stdout.write(
            self.style.SUCCESS(f"Updated quarantine status for contribution {contribution.id} to {status}")
        )

    def handle(self, *args, **options):
        """Handle command."""
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name}`"))
        self.update_rejected_contributions_quarantine_status()
        self.update_approved_contributions_quarantine_status()
        self.stdout.write(self.style.SUCCESS(f"`{self.name}` is done"))
