# Generated by Django 3.2.13 on 2022-05-06 17:05

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0046_auto_20220502_2228"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="donationpage",
            name="email_templates",
        ),
    ]
