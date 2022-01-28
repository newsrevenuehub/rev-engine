# Generated by Django 3.2.5 on 2022-01-28 18:08

import apps.config.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0044_alter_revenueprogram_slug"),
    ]

    operations = [
        migrations.AlterField(
            model_name="revenueprogram",
            name="slug",
            field=models.SlugField(
                blank=True,
                help_text="This will be used as the subdomain for donation pages made under this revenue program. If left blank, it will be derived from the Revenue Program name.",
                max_length=63,
                unique=True,
                validators=[apps.config.validators.validate_slug_against_denylist],
            ),
        ),
    ]
