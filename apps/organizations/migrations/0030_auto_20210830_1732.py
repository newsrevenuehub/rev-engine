# Generated by Django 3.2.5 on 2021-08-30 17:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0029_merge_20210813_1932"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="organization",
            name="contact_email",
        ),
        migrations.AddField(
            model_name="revenueprogram",
            name="contact_email",
            field=models.EmailField(blank=True, max_length=255),
        ),
    ]
