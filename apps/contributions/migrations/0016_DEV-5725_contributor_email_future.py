# Generated by Django 4.2.18 on 2025-02-10 14:37

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0015_DEV-4915_alter_contribution_provider_payment_id_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="contributor",
            name="email_future",
            field=models.EmailField(
                blank=True, db_collation="case_insensitive", max_length=254, null=True, unique=True
            ),
        ),
    ]
