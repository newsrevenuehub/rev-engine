# Generated by Django 3.2.5 on 2021-07-13 20:58

from django.db import migrations, models
import django.utils.timezone
import model_utils.fields


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0011_contributor_uuid"),
    ]

    operations = [
        migrations.CreateModel(
            name="ContributionMetadata",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "created",
                    model_utils.fields.AutoCreatedField(
                        db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="created"
                    ),
                ),
                (
                    "modified",
                    model_utils.fields.AutoLastModifiedField(
                        db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="modified"
                    ),
                ),
                ("key", models.CharField(max_length=255, unique=True)),
                ("label", models.CharField(max_length=255)),
                ("default_value", models.CharField(blank=True, max_length=255, null=True)),
                (
                    "additional_help_text",
                    models.TextField(
                        blank=True,
                        help_text="Will be displayed on the donation page underneath the label.",
                        max_length=255,
                        null=True,
                    ),
                ),
                (
                    "metadata_type",
                    models.CharField(
                        choices=[("TXT", "Text Values"), ("BLN", "True/False Values")], default="TXT", max_length=3
                    ),
                ),
                ("payment_processor", models.CharField(blank=True, default="stripe", max_length=32, null=True)),
                (
                    "processor_object",
                    models.CharField(
                        choices=[("PYMT", "Payment"), ("CUST", "Customer"), ("ALL", "All")],
                        default="PYMT",
                        max_length=4,
                    ),
                ),
                ("description", models.TextField(blank=True, null=True)),
                (
                    "donor_supplied",
                    models.BooleanField(
                        default=False,
                        help_text="If true this field is available within revengine (e.g. mailing_street). If true this will not show up in the front end list.",
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "Contribution Metadata",
            },
        ),
    ]
