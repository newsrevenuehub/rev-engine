# Generated by Django 3.2.25 on 2024-07-10 04:31

import django.utils.timezone
from django.db import migrations, models

import model_utils.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="CommitStatus",
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
                ("github_id", models.BigIntegerField(blank=True, null=True)),
                ("name", models.CharField(max_length=50)),
                ("commit_sha", models.CharField(max_length=40)),
                ("details", models.TextField(default="")),
                ("screenshot", models.ImageField(blank=True, null=True, upload_to="e2e/screenshots/")),
                (
                    "state",
                    models.CharField(
                        choices=[
                            ("success", "Success"),
                            ("failure", "Failure"),
                            ("pending", "Pending"),
                            ("error", "Error"),
                        ],
                        default="pending",
                        max_length=10,
                    ),
                ),
            ],
            options={
                "abstract": False,
            },
        ),
    ]