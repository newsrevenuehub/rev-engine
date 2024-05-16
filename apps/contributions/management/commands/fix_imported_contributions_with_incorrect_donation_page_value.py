from pathlib import Path

from django.core.management.base import BaseCommand
from django.db.models import CharField, Exists, F, OuterRef, Q
from django.db.models.functions import Cast

import reversion
from reversion.models import Revision

from apps.contributions.models import Contribution
from apps.organizations.models import RevenueProgram


REVISION_COMMENT = "StripeTransactionsImporter.upsert_contribution created Contribution"


class Command(BaseCommand):
    """Find recurring contributions affected by bug solved for in DEV-4783 and fix them by...

    ...setting donation_page to None and setting `._revenue_program` to the correct RevenueProgram.
    """

    @property
    def name(self):
        return Path(__file__).name

    def handle(self, *args, **options):
        path = Path(__file__)
        name = path.name
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name}`"))
        revision_subquery = Revision.objects.filter(
            comment=REVISION_COMMENT,
            version__object_id=Cast(OuterRef("pk"), output_field=CharField()),
            version__content_type__model="contribution",
        ).values("pk")
        contributions = Contribution.objects.filter(
            # only contributions created by StripeTransactionsImporter.upsert_contribution
            Exists(revision_subquery),
            ~Q(contribution_metadata__has_key="referer") | Q(contribution_metadata__referer=""),
            ~Q(contribution_metadata__revenue_program_id=""),
            contribution_metadata__has_key="revenue_program_id",
            donation_page__isnull=False,
            # donation is set to same value as default donation page of the rp
            donation_page=F("donation_page__revenue_program__default_donation_page"),
        )

        if not contributions.exists():
            self.stdout.write(self.style.HTTP_INFO("No affected contributions found, exiting"))
            return

        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {contributions} eligible contribution{'' if contributions == 1 else 's'} to fix"
            )
        )
        updated_ids = []
        for x in contributions.all():
            rp = RevenueProgram.objects.get(pk=x.contribution_metadata["revenue_program_id"])
            x.donation_page = None
            x._revenue_program = rp
            with reversion.create_revision():
                x.save(update_fields={"donation_page", "_revenue_program", "modified"})
                reversion.set_comment(f"{name} updated contribution")
            updated_ids.append(x.id)
        self.stdout.write(
            self.style.SUCCESS(
                f"Updated {len(updated_ids)} contribution(s) out of {contributions} eligible contributions. "
                f"The following contributions were updated: {', '.join(map(str, updated_ids))}"
            )
        )
        self.stdout.write(self.style.SUCCESS(f"`{self.name}` is done"))
