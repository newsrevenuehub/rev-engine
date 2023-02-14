# Generated by Django 3.2.13 on 2022-06-24 02:35

import apps.users.models
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import model_utils.fields
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Contributor",
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
                ("uuid", models.UUIDField(default=uuid.uuid4, editable=False)),
                ("email", models.EmailField(max_length=254, unique=True)),
            ],
            options={
                "abstract": False,
            },
        ),
        migrations.CreateModel(
            name="Contribution",
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
                ("amount", models.IntegerField(help_text="Stored in cents")),
                ("currency", models.CharField(default="usd", max_length=3)),
                ("reason", models.CharField(blank=True, max_length=255)),
                (
                    "interval",
                    models.CharField(
                        choices=[("one_time", "One time"), ("month", "Monthly"), ("year", "Yearly")], max_length=8
                    ),
                ),
                ("payment_provider_used", models.CharField(max_length=64)),
                ("payment_provider_data", models.JSONField(null=True)),
                ("provider_payment_id", models.CharField(blank=True, max_length=255, null=True)),
                ("provider_subscription_id", models.CharField(blank=True, max_length=255, null=True)),
                ("provider_customer_id", models.CharField(blank=True, max_length=255, null=True)),
                ("provider_payment_method_id", models.CharField(blank=True, max_length=255, null=True)),
                ("provider_payment_method_details", models.JSONField(null=True)),
                ("last_payment_date", models.DateTimeField(null=True)),
                ("bad_actor_score", models.IntegerField(null=True)),
                ("bad_actor_response", models.JSONField(null=True)),
                ("flagged_date", models.DateTimeField(null=True)),
                ("contribution_metadata", models.JSONField(null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("processing", "processing"),
                            ("paid", "paid"),
                            ("canceled", "canceled"),
                            ("failed", "failed"),
                            ("flagged", "flagged"),
                            ("rejected", "rejected"),
                        ],
                        max_length=10,
                        null=True,
                    ),
                ),
                (
                    "contributor",
                    models.ForeignKey(
                        null=True, on_delete=django.db.models.deletion.SET_NULL, to="contributions.contributor"
                    ),
                ),
            ],
            options={
                "ordering": ["-created"],
                "get_latest_by": "modified",
            },
            bases=(models.Model,),
        ),
    ]
