# Generated by Django 3.2.15 on 2022-09-02 01:58

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("contributions", "0004_DEV-1691_alter_contribution_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="contribution",
            name="provider_client_secret_id",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
