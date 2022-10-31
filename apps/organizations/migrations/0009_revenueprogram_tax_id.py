# Generated by Django 3.2.15 on 2022-10-31 20:14

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0008_DEV-2178_refactor_plan_modeling_and_migrate_legacy_clients"),
    ]

    operations = [
        migrations.AddField(
            model_name="revenueprogram",
            name="tax_id",
            field=models.PositiveIntegerField(
                blank=True, null=True, validators=[django.core.validators.MaxValueValidator(999999999)]
            ),
        ),
    ]
