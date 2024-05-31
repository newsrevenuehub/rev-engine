# Generated by Django 3.2.19 on 2023-07-17 14:15
import uuid

from django.db import migrations, models


def create_uuid(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    for organization in Organization.objects.filter(uuid__isnull=True).all():
        organization.uuid = uuid.uuid4()
        organization.save(update_fields={"uuid", "modified"})


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0020_DEV-3303_add_rp_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="stripe_subscription_id",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="organization",
            name="uuid",
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.RunPython(create_uuid),
        migrations.AlterField(
            model_name="organization",
            name="uuid",
            field=models.UUIDField(unique=True, editable=False, default=uuid.uuid4),
        ),
    ]
