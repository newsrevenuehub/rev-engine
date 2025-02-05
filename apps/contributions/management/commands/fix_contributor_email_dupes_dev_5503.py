from io import StringIO
from pathlib import Path
from typing import TypedDict

from django.contrib.postgres.aggregates import ArrayAgg
from django.core.management.base import BaseCommand, CommandParser
from django.db.models import Count, QuerySet
from django.db.models.functions import Lower

import pandas as pd

from apps.contributions.models import Contributor


class ContributorGrouping(TypedDict):
    """Summary."""

    canonical: Contributor
    duplicates: QuerySet[Contributor]


class DuplicateEmailsByContributors(TypedDict):
    """Summary."""

    lower_email: str
    contributor_count: int
    contributors: list[int]


class Command(BaseCommand):
    """Summary."""

    @property
    def name(self):
        return Path(__file__).name

    @staticmethod
    def get_duplicate_emails_by_contributors() -> QuerySet[DuplicateEmailsByContributors]:
        """Return a dictionary of lowered emails and their corresponding contributors."""
        return (
            Contributor.objects.annotate(lower_email=Lower("email"))
            .values("lower_email")
            .annotate(
                contributor_count=Count("id"),
                contributors=ArrayAgg("id"),
            )
            .filter(contributor_count__gt=1)
        )

    def get_canonical_and_duplicate_contributors(
        self, duplicate_data: DuplicateEmailsByContributors
    ) -> ContributorGrouping:
        """Return the canonical contributor from a list of contributors."""
        qs = (
            Contributor.objects.filter(id__in=duplicate_data["contributors"])
            .prefetch_related("contribution_set")
            .order_by("created")
        )
        result: ContributorGrouping = {"canonical": qs.first(), "duplicates": qs[1:]}
        return result

    def make_initial_report(self, dupe_mapping: list[str, ContributorGrouping]) -> None:
        """Summary."""
        with_contributions = []
        without_contributions = []
        for grouping in dupe_mapping:
            if grouping["canonical"].contribution_set.exists():
                with_contributions.append(grouping)
            else:
                without_contributions.append(grouping)

        self.report = pd.DataFrame(
            data=[
                {
                    "to_delete_contributor_id": contributor.id,
                    "canonical_contributor_id": grouping["canonical"].id,
                    "canonical_contributor_email": grouping["canonical"].email,
                    "status": "pending",
                    "contribution_id": contribution.id,
                    "contribution_interval": contribution.interval,
                }
                for grouping in with_contributions
                for contributor in grouping["duplicates"]
                for contribution in contributor.contribution_set.all()
            ]
            + [
                {
                    "to_delete_contributor_id": contributor.id,
                    "canonical_contributor_id": grouping["canonical"].id,
                    "canonical_contributor_email": grouping["canonical"].email,
                    "status": "pending",
                    "contribution_id": None,
                    "contribution_interval": None,
                }
                for grouping in without_contributions
                for contributor in grouping["duplicates"]
            ]
        )

    def process_duped_emails(self, mapping: list[DuplicateEmailsByContributors]) -> None:
        """Summary."""
        self.stdout.write(self.style.WARNING("process_duped_emails not implemented yet"))

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--dry-run", action="store_true", default=True)
        parser.add_argument("--save-dir", type=Path, required=True)

    def print_report(self) -> None:
        """Summary."""
        self.report.to_csv(output := StringIO(), index=False)
        self.stdout.write(self.style.HTTP_INFO(output.getvalue()))

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name}`"))
        mapping = [
            self.get_canonical_and_duplicate_contributors(x) for x in self.get_duplicate_emails_by_contributors()
        ]
        self.make_initial_report(mapping)
        if mapping and not options["dry_run"]:
            self.process_duped_emails(mapping)
        self.print_report()
        self.stdout.write(self.style.SUCCESS(f"`{self.name}` is done"))
