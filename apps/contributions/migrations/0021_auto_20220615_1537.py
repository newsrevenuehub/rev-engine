# Generated by Django 3.2.13 on 2022-06-15 15:37

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0020_initial_historical_record"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="historicalcontributor",
            name="history_user",
        ),
        migrations.DeleteModel(
            name="HistoricalContribution",
        ),
        migrations.DeleteModel(
            name="HistoricalContributor",
        ),
    ]
