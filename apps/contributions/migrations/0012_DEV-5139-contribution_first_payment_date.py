# Generated by Django 4.2.14 on 2024-08-19 17:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0011_DEV_3658"),
    ]

    operations = [
        migrations.AddField(
            model_name="contribution",
            name="first_payment_date",
            field=models.DateTimeField(null=True),
        ),
    ]