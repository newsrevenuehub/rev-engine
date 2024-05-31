# Generated by Django 3.2.18 on 2023-03-31 19:39

from django.db import migrations, models

import apps.config.validators


class Migration(migrations.Migration):
    dependencies = [
        ("pages", "0007_DEV_2718_delete_template"),
    ]

    operations = [
        migrations.AlterField(
            model_name="donationpage",
            name="slug",
            field=models.SlugField(
                blank=True,
                help_text="If not entered, it will be built from the Page name",
                validators=[apps.config.validators.validate_slug_against_denylist],
            ),
        ),
        migrations.AlterUniqueTogether(
            name="donationpage",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="donationpage",
            constraint=models.UniqueConstraint(fields=("revenue_program", "name"), name="unique_name"),
        ),
        migrations.AddConstraint(
            model_name="donationpage",
            constraint=models.UniqueConstraint(fields=("revenue_program", "slug"), name="unique_slug"),
        ),
    ]
