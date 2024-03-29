# Generated by Django 3.2.13 on 2022-05-13 03:01

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0002_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="organization",
            old_name="uses_email_templates",
            new_name="send_receipt_email_via_nre",
        ),
        migrations.AlterField(
            model_name="organization",
            name="send_receipt_email_via_nre",
            field=models.BooleanField(
                default=True,
                help_text="If false, receipt email assumed to be sent via Salesforce. Other emails, e.g. magic_link, are always sent via NRE regardless of this setting",
            ),
        ),
    ]
