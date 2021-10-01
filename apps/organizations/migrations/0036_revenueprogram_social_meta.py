# Generated by Django 3.2.5 on 2021-09-08 12:07

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0002_socialmeta"),
        ("organizations", "0035_auto_20210901_1729"),
    ]

    operations = [
        migrations.AddField(
            model_name="revenueprogram",
            name="social_meta",
            field=models.OneToOneField(null=True, on_delete=django.db.models.deletion.SET_NULL, to="common.socialmeta"),
        ),
    ]
