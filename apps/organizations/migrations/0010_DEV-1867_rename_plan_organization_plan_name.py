# Generated by Django 3.2.16 on 2022-10-28 01:05

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0009_DEV-1446_rename_donation_in_help_text"),
    ]

    operations = [
        migrations.RenameField(
            model_name="organization",
            old_name="plan",
            new_name="plan_name",
        ),
    ]
