# Generated by Django 4.2.19 on 2025-04-18 14:20

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models

import model_utils.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.CreateModel(
            name="ActivityLog",
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
                ("actor_object_id", models.PositiveIntegerField(blank=True, null=True)),
                ("activity_object_object_id", models.PositiveIntegerField()),
                ("action", models.CharField(choices=[("canceled", "CANCELED")], max_length=255)),
                (
                    "activity_object_content_type",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="activity_object",
                        to="contenttypes.contenttype",
                    ),
                ),
                (
                    "actor_content_type",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="actor",
                        to="contenttypes.contenttype",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["actor_content_type", "actor_object_id"], name="activity_lo_actor_c_0c141d_idx"
                    ),
                    models.Index(
                        fields=["activity_object_content_type", "activity_object_object_id"],
                        name="activity_lo_activit_f46be0_idx",
                    ),
                ],
            },
        ),
    ]
