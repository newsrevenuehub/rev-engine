# Generated by Django 3.2.5 on 2021-10-01 14:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0035_auto_20210901_1729"),
    ]

    operations = [
        migrations.AddField(
            model_name="revenueprogram",
            name="stripe_statement_descriptor_suffix",
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
    ]
