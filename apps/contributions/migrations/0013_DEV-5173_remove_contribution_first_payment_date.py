# Generated by Django 4.2.15 on 2024-08-30 17:40

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0012_DEV-5139-contribution_first_payment_date"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="contribution",
            name="first_payment_date",
        ),
    ]
