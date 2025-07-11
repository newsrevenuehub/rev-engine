from pathlib import Path

from django.core.management.base import BaseCommand
from django.db.models import Count

import reversion

from apps.contributions.choices import ContributionInterval, ContributionStatus, QuarantineStatus
from apps.contributions.models import Contribution


class Command(BaseCommand):
    """Command to retroactively add quarantine status to contributions that were approved or rejected in the past."""

    @property
    def name(self):
        return Path(__file__).name

    def update_contribution_quarantine_status_for_recurring_rejected_by_human(self):
        self.stdout.write(
            self.style.HTTP_INFO("Updating quarantine status for recurring contributions rejected by human")
        )
        qs = (
            Contribution.objects.filter(
                interval__in=[ContributionInterval.MONTHLY, ContributionInterval.YEARLY],
                quarantine_status__isnull=True,
                status=ContributionStatus.REJECTED,
            )
            .annotate(payment_count=Count("payment"))
            .filter(payment_count=0)
        )
        self.stdout.write(
            self.style.HTTP_INFO(f"Found {qs.count()} rejected recurring contributions to update quarantine status")
        )
        for contribution in qs:
            contribution.quarantine_status = QuarantineStatus.REJECTED_BY_HUMAN_FOR_UNKNOWN
            with reversion.create_revision():
                contribution.save(update_fields={"quarantine_status", "modified"})
                reversion.set_comment(
                    "add_quarantine_status updated quarantine status for recurring contribution rejected by human"
                )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Updated quarantine status for contribution {contribution.id} to {contribution.quarantine_status}"
                )
            )

    def update_contribution_quarantine_status_for_one_time_rejected_by_human(self):
        self.stdout.write(
            self.style.HTTP_INFO("Updating quarantine status for one-time contributions rejected by human")
        )
        # Note on small edge case here around one-time contributions where have rejected status because rejected by stripe as fraudulent.
        # Alternative would be to look for a revision comment but the code didn't always add revision comment we can look for
        # here (confirm this)
        qs = Contribution.objects.filter(
            interval=ContributionInterval.ONE_TIME,
            quarantine_status__isnull=True,
            status=ContributionStatus.REJECTED,
        )
        self.stdout.write(
            self.style.HTTP_INFO(f"Found {qs.count()} one-time rejected contributions to update quarantine status")
        )
        for contribution in qs:
            contribution.quarantine_status = QuarantineStatus.REJECTED_BY_HUMAN_FOR_UNKNOWN
            with reversion.create_revision():
                contribution.save(update_fields={"quarantine_status", "modified"})
                reversion.set_comment(
                    "add_quarantine_status updated quarantine status for one-time contribution rejected by human"
                )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Updated quarantine status for contribution {contribution.id} to {contribution.quarantine_status}"
                )
            )

    def update_quarantine_status_for_recurring_approved_contributions(self):
        self.stdout.write(self.style.HTTP_INFO("Updating quarantine status for recurring contributions approved"))
        qs = (
            Contribution.objects.filter(
                interval__in=[ContributionInterval.MONTHLY, ContributionInterval.YEARLY],
                quarantine_status__isnull=True,
                status=ContributionStatus.PAID,
            )
            .annotate(payment_count=Count("payment"))
            .filter(payment_count=0)
        )
        self.stdout.write(
            self.style.HTTP_INFO(f"Found {qs.count()} approved recurring contributions to update quarantine status")
        )
        for contribution in qs:
            contribution.quarantine_status = QuarantineStatus.APPROVED_BY_HUMAN

    def handle_recurring_contributions(self):
        self.update_contribution_quarantine_status_for_recurring_rejected_by_human()
        self.update_quarantine_status_for_recurring_approved_contributions()

    def update_quarantine_status_for_one_time_approved_contributions(self):
        pass

    def handle_one_time_contributions(self):
        self.update_contribution_quarantine_status_for_one_time_rejected_by_human()
        self.update_quarantine_status_for_one_time_approved_contributions()

    def handle(self, *args, **options):
        """Handle command."""
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name}`"))
        self.handle_recurring_contributions()
        self.handle_one_time_contributions()
        self.stdout.write(self.style.SUCCESS(f"`{self.name}` is done"))
