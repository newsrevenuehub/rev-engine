# Generated by Django 3.2.14 on 2022-07-08 19:39

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0005_DEV-2030_alter_organization_plan"),
        ("common", "0002_DEV-2049_delete_address"),
    ]

    operations = [
        migrations.AddField(
            model_name="socialmeta",
            name="revenue_program",
            field=models.OneToOneField(
                null=True, on_delete=django.db.models.deletion.CASCADE, to="organizations.revenueprogram"
            ),
        ),
    ]
