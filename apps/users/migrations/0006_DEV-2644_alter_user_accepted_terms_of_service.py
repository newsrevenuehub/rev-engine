# Generated by Django 3.2.16 on 2022-11-22 07:43

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0005_DEV-2038_add_first_name_last_name_job_title"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="accepted_terms_of_service",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
