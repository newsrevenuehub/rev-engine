# Generated by Django 3.2.25 on 2024-04-04 15:08

from django.db import migrations, models

import apps.organizations.validators


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0023_DEV-4264_create_social_meta_for_existing_rps"),
    ]

    operations = [
        migrations.AddField(
            model_name="revenueprogram",
            name="contact_phone",
            field=models.CharField(
                blank=True, max_length=17, validators=[apps.organizations.validators.validate_contact_phone_number]
            ),
        ),
    ]
