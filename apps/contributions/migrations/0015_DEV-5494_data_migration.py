from django.db import migrations, transaction
from django.db.models import Count
from django.db.models.functions import Lower

import reversion


def deduplicate_contributors(apps, schema_editor):
    Contributor = apps.get_model("contributions", "Contributor")
    Contribution = apps.get_model("contributions", "Contribution")

    # Find all duplicate emails
    duped_emails = (
        Contributor.objects.values(email_lower=Lower("email"))
        .annotate(email_count=Count("id"))
        .filter(email_count__gt=1)
        .values_list("email_lower", flat=True)
    )

    # Process each duplicate email
    for email in duped_emails:
        with transaction.atomic():
            contributors = list(Contributor.objects.filter(email__iexact=email).order_by("id"))
            canonical = contributors[0]  # Oldest contributor

            # Update contributions to point to the canonical contributor
            for con in Contribution.objects.filter(contributor__in=contributors[1:]):
                con.contributor = canonical
                with reversion.create_revision():
                    con.save(update_fields={"modified", "contributor"})
                    reversion.set_comment("updated by data migration 0015_DEV_5494")

            # Delete duplicate contributors
            for cont in Contributor.objects.filter(id__in=[c.id for c in contributors[1:]]):
                with reversion.create_revision():
                    cont.delete()
                    reversion.set_comment("deleted by data migration 0015_DEV_5494")


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0014_DEV-4882_alter_contribution_provider_subscription_id"),
    ]

    operations = [
        migrations.RunPython(deduplicate_contributors),
    ]
