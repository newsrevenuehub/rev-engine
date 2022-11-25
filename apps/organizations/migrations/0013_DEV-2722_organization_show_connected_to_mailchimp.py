# Generated by Django 3.2.16 on 2022-11-19 07:47

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0012_DEV-2721_organization_show_connected_to_salesforce"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="show_connected_to_mailchimp",
            field=models.BooleanField(
                default=False,
                help_text="Indicates Mailchimp integration status, designed for manual operation by staff members",
                verbose_name="Show connected to Mailchimp",
            ),
        ),
    ]
