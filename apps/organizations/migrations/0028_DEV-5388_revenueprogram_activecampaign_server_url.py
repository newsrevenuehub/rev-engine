# Generated by Django 4.2.16 on 2024-11-25 21:31

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0027_DEV-5079_alter_organization_options"),
    ]

    operations = [
        migrations.AddField(
            model_name="revenueprogram",
            name="activecampaign_server_url",
            field=models.URLField(blank=True, max_length=100, null=True),
        ),
    ]
