# Generated by Django 3.2.5 on 2021-08-10 14:28

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0025_auto_20210810_1426"),
    ]

    operations = [
        migrations.RenameField(
            model_name="revenueprogram",
            old_name="org_google_analytics_v4_id",
            new_name="google_analytics_v4_id",
        ),
    ]
