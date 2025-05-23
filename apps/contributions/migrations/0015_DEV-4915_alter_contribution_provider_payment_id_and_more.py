# Generated by Django 4.2.16 on 2025-01-10 15:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0014_DEV-4882_alter_contribution_provider_subscription_id"),
    ]

    operations = [
        migrations.AlterField(
            model_name="contribution",
            name="provider_payment_id",
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name="contribution",
            name="provider_setup_intent_id",
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
    ]
