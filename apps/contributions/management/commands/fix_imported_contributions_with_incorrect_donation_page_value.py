from django.core.management.base import BaseCommand
from django.db.models import Exists, F, OuterRef

import reversion
from reversion.models import Revision

from apps.contributions.models import Contribution
from apps.organizations.models import RevenueProgram


class Command(BaseCommand):
    """Find recurring contributions..."""

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.HTTP_INFO("Running `fix_imported_contributions_with_incorrect_donation_page_value`")
        )
        revision_subquery = Revision.objects.filter(
            comment="StripeTransactionsImporter.upsert_contribution created contribution",
            version__object_id=OuterRef("pk"),
            version__content_type__model="contribution",
        ).values("pk")
        contributions = Contribution.objects.filter(
            Exists(revision_subquery),
            donation_page__isnull=False,
            donation_page=F("donation_page__revenue_program__default_donation_page"),
        )
        if not contributions.exists():
            self.stdout.write(self.style.HTTP_INFO("No effected contributions found, exiting"))
            return

        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {contributions} eligible contribution{'' if contributions == 1 else 's'} to fix"
            )
        )
        updated_ids = []
        unupdated_ids = []
        for x in contributions.all():
            try:
                rp = RevenueProgram.objects.get(pk=x.contribution_metadata["revenue_program_id"])
            except RevenueProgram.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(
                        f"Failed to retrieve revenue program for contribution {x.id} with metadata {x.contribution_metadata}"
                    )
                )
                unupdated_ids.append(x.id)
                continue
            else:
                x.donation_page = None
                x._revenue_program = rp
                with reversion.create_revision():
                    x.save(update_fields={"donation_page", "_revenue_program", "modified"})
                    reversion.set_comment(
                        "fix_imported_contributions_with_incorrect_donation_page_value updated contribution"
                    )
                updated_ids.append(x.id)
        self.stdout.write(
            self.style.SUCCESS(
                f"Updated {len(updated_ids)} contribution(s) out of {contributions} eligible contributions. "
                f"The following contributions were updated: {', '.join(map(str, updated_ids))}"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                f"Failed to update {len(unupdated_ids)} contribution(s) out of {contributions} eligible contributions. "
                f"The following contributions were not updated: {', '.join(map(str, unupdated_ids))}"
            )
        )
        self.stdout.write(self.style.SUCCESS("`fix_imported_contributions_with_incorrect_donation_page_value` is done"))
