# Generated by Django 3.2.5 on 2022-02-04 19:01

import apps.emails.models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import simple_history.models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("emails", "0004_alter_pageemailtemplate_schema"),
    ]

    operations = [
        migrations.CreateModel(
            name="HistoricalPageEmailTemplate",
            fields=[
                ("id", models.BigIntegerField(auto_created=True, blank=True, db_index=True, verbose_name="ID")),
                (
                    "identifier",
                    models.CharField(
                        blank=True, help_text="This should match the template name on the ESP", max_length=256
                    ),
                ),
                (
                    "template_type",
                    models.CharField(
                        choices=[
                            ("OTD", "One Time Donation"),
                            ("RCD", "Recurring Donation"),
                            ("FLD", "Failed Payment"),
                            ("CAN", "Cancelled Donation"),
                        ],
                        default="OTD",
                        max_length=3,
                    ),
                ),
                (
                    "schema",
                    models.JSONField(
                        blank=True, default=apps.emails.models.BaseEmailTemplate.ContactType.default_schema, null=True
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
                "verbose_name": "historical page email template",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": "history_date",
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
    ]
