# Generated by Django 3.2.18 on 2023-05-09 18:37

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0019_DEV-3302_remove_revenueprogram_mailchimp_access_token"),
    ]

    operations = [
        migrations.AddField(
            model_name="revenueprogram",
            name="mailchimp_contributor_segment_id",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="revenueprogram",
            name="mailchimp_list_id",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="revenueprogram",
            name="mailchimp_recurring_contributor_segment_id",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
