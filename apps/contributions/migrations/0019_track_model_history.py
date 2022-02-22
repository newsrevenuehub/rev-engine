# Generated by Django 3.2.5 on 2022-02-04 19:01

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import model_utils.fields
import simple_history.models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("pages", "0038_alter_donationpage_slug"),
        (
            "organizations",
            "0047_track_model_history",
        ),
        ("contributions", "0018_delete_contributionmetadata"),
    ]

    operations = [
        migrations.CreateModel(
            name="HistoricalContributor",
            fields=[
                ("id", models.IntegerField(auto_created=True, blank=True, db_index=True, verbose_name="ID")),
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
                ("email", models.EmailField(db_index=True, max_length=254)),
                ("history_id", models.AutoField(primary_key=True, serialize=False)),
                ("history_date", models.DateTimeField()),
                ("history_change_reason", models.CharField(max_length=100, null=True)),
                (
                    "history_type",
                    models.CharField(choices=[("+", "Created"), ("~", "Changed"), ("-", "Deleted")], max_length=1),
                ),
                (
                    "history_user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "historical contributor",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": "history_date",
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
        migrations.CreateModel(
            name="HistoricalContribution",
            fields=[
                ("id", models.IntegerField(auto_created=True, blank=True, db_index=True, verbose_name="ID")),
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
                ("history_id", models.AutoField(primary_key=True, serialize=False)),
                ("history_date", models.DateTimeField()),
                ("history_change_reason", models.CharField(max_length=100, null=True)),
                (
                    "history_type",
                    models.CharField(choices=[("+", "Created"), ("~", "Changed"), ("-", "Deleted")], max_length=1),
                ),
                (
                    "contributor",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to="contributions.contributor",
                    ),
                ),
                (
                    "donation_page",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to="pages.donationpage",
                    ),
                ),
                (
                    "history_user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to="organizations.organization",
                    ),
                ),
            ],
            options={
                "verbose_name": "historical contribution",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": "history_date",
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
    ]
