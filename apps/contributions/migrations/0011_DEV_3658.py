# Generated by Django 3.2.25 on 2024-06-06 04:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0010_DEV-4562_add_revenue_program_with_constraint"),
    ]

    operations = [
        migrations.CreateModel(
            name="Quarantine",
            fields=[],
            options={
                "verbose_name_plural": "Quarantine",
                "proxy": True,
                "indexes": [],
                "constraints": [],
            },
            bases=("contributions.contribution",),
        ),
        migrations.RemoveField(
            model_name="contribution",
            name="payment_provider_data",
        ),
        migrations.AlterField(
            model_name="contribution",
            name="status",
            field=models.CharField(
                choices=[
                    ("processing", "processing"),
                    ("paid", "paid"),
                    ("canceled", "canceled"),
                    ("failed", "failed"),
                    ("flagged", "flagged"),
                    ("rejected", "rejected"),
                    ("refunded", "refunded"),
                    ("abandoned", "abandoned"),
                ],
                max_length=10,
                null=True,
            ),
        ),
    ]