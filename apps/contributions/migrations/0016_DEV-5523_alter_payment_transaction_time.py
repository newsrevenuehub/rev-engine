# Generated by Django 4.2.18 on 2025-02-07 04:13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0015_DEV-4915_alter_contribution_provider_payment_id_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="payment",
            name="transaction_time",
            field=models.DateTimeField(db_index=True),
        ),
    ]
