# Generated by Django 3.2.5 on 2021-08-10 15:09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0026_rename_org_google_analytics_v4_id_revenueprogram_google_analytics_v4_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="revenueprogram",
            name="facebook_pixel_id",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
