# Generated by Django 3.2.25 on 2024-05-21 20:07

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0025_DEV-4244_revenueprogram_mailchimp_all_contributors_segment_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="show_connected_to_digestbuilder",
            field=models.BooleanField(
                default=False,
                help_text="Indicates digestbuilder integration status, designed for manual operation by staff members",
                verbose_name="Show connected to digestbuilder",
            ),
        ),
        migrations.AddField(
            model_name="organization",
            name="show_connected_to_eventbrite",
            field=models.BooleanField(
                default=False,
                help_text="Indicates Eventbrite integration status, designed for manual operation by staff members",
                verbose_name="Show connected to Eventbrite",
            ),
        ),
        migrations.AddField(
            model_name="organization",
            name="show_connected_to_google_analytics",
            field=models.BooleanField(
                default=False,
                help_text="Indicates Google Analytics integration status, designed for manual operation by staff members",
                verbose_name="Show connected to Google Analytics",
            ),
        ),
        migrations.AddField(
            model_name="organization",
            name="show_connected_to_newspack",
            field=models.BooleanField(
                default=False,
                help_text="Indicates Newspack integration status, designed for manual operation by staff members",
                verbose_name="Show connected to Newspack",
            ),
        ),
    ]