# Generated by Django 3.2.13 on 2022-06-17 17:06

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("config", "0004_initial_historical_record"),
    ]

    operations = [
        migrations.DeleteModel(
            name="HistoricalDenyListWord",
        ),
    ]
