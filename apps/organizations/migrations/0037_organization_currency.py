# Generated by Django 3.2.5 on 2021-10-04 18:23

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0036_revenueprogram_social_meta"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="currency",
            field=models.CharField(choices=[("USD", "USD"), ("CAD", "CAD")], default="USD", max_length=3),
        ),
    ]
