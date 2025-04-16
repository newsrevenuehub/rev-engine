# Generated by Django 4.2.20 on 2025-04-08 00:06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0029_DEV-5584_revenueprogram_mailchimp_monthly_contributor_segment_id_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="disable_reminder_emails",
            field=models.BooleanField(
                default=False,
                help_text="If True, annual contribution reminder emails will not be sent through RevEngine. This does not impact other transactional emails.",
            ),
        ),
    ]
