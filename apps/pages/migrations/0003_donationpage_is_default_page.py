# Generated by Django 3.2 on 2021-04-23 13:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0002_auto_20210422_1445"),
    ]

    operations = [
        migrations.AddField(
            model_name="donationpage",
            name="is_default_page",
            field=models.BooleanField(default=False),
        ),
    ]
