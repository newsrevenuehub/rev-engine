# Generated by Django 3.2.5 on 2022-02-17 12:34

from django.db import migrations
from django.utils.timezone import now


HISTORY_TYPE_CHANGE = "~"


def create_initial_historicalrecord(apps, schema_editor):
    """
    Create an initial edit for each model with a relation to HistoricalRecord.

    Originally, when we added the relation to django_simple_history's HistoricalRecords,
    we realized that the diff for the first subsequent change on a model didn't
    end up being shown in a meanigful way in the Django admin, because it had no
    previous change to create a diff against. In order for all changes (including
    the first) to have a meaningful diff, we create an initial HistoricalRecord
    for all instances of the model.
    """
    Contributor = apps.get_model("contributions", "Contributor")
    HistoricalContributor = apps.get_model("contributions", "HistoricalContributor")
    Contribution = apps.get_model("contributions", "Contribution")
    HistoricalContribution = apps.get_model("contributions", "HistoricalContribution")

    for contributor in Contributor.objects.all():
        HistoricalContributor.objects.create(
            # Fields copied from Contributor object.
            id=contributor.id,
            created=contributor.created,
            modified=contributor.modified,
            uuid=contributor.uuid,
            email=contributor.email,
            # Historical fields.
            history_date=now(),
            history_type=HISTORY_TYPE_CHANGE,
            history_user_id=None,
            history_change_reason="Initial change",
        )

    for contribution in Contribution.objects.all():
        HistoricalContribution.objects.create(
            # Fields copied from Contribution object.
            id=contribution.id,
            created=contribution.created,
            modified=contribution.modified,
            amount=contribution.amount,
            currency=contribution.currency,
            reason=contribution.reason,
            interval=contribution.interval,
            payment_provider_used=contribution.payment_provider_used,
            payment_provider_data=contribution.payment_provider_data,
            provider_payment_id=contribution.provider_payment_id,
            provider_subscription_id=contribution.provider_subscription_id,
            provider_customer_id=contribution.provider_customer_id,
            provider_payment_method_id=contribution.provider_payment_method_id,
            provider_payment_method_details=contribution.provider_payment_method_details,
            last_payment_date=contribution.last_payment_date,
            bad_actor_score=contribution.bad_actor_score,
            bad_actor_response=contribution.bad_actor_response,
            flagged_date=contribution.flagged_date,
            contribution_metadata=contribution.contribution_metadata,
            status=contribution.status,
            contributor_id=contribution.contributor_id,
            donation_page_id=contribution.donation_page_id,
            organization_id=contribution.organization_id,
            # Historical fields.
            history_date=now(),
            history_type=HISTORY_TYPE_CHANGE,
            history_user_id=None,
            history_change_reason="Initial change",
        )


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0019_track_model_history"),
    ]

    operations = [migrations.RunPython(create_initial_historicalrecord, reverse_code=migrations.RunPython.noop)]
