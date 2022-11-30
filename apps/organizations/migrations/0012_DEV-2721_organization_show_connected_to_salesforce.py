# Generated by Django 3.2.16 on 2022-11-19 07:11

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0011_DEV-2772_organization_show_connected_to_slack"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="show_connected_to_salesforce",
            field=models.BooleanField(
                default=False,
                help_text="Indicates Salesforce integration status, designed for manual operation by staff members",
                verbose_name="Show connected to Salesforce",
            ),
        ),
    ]
