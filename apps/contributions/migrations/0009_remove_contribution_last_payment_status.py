# Generated by Django 3.2.2 on 2021-06-09 18:07

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0008_auto_20210608_2047"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="contribution",
            name="last_payment_status",
        ),
    ]
