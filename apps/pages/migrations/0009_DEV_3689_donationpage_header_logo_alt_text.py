# Generated by Django 3.2.19 on 2023-07-07 17:59

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pages", "0008_DEV_2301_name_unique"),
    ]

    operations = [
        migrations.AddField(
            model_name="donationpage",
            name="header_logo_alt_text",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
