# Generated by Django 3.2.5 on 2021-08-09 15:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0023_auto_20210809_1545"),
    ]

    operations = [
        migrations.AddField(
            model_name="revenueprogram",
            name="org_google_analytics_v4_id",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
