# Generated by Django 3.2.20 on 2023-08-31 17:44

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0021_DEV-1750_add_uuid_and_stripe_subscription_id_to_org"),
    ]

    operations = [
        migrations.AlterField(
            model_name="organization",
            name="name",
            field=models.CharField(max_length=63, unique=True),
        ),
    ]
