# Generated by Django 3.2 on 2021-04-23 17:18

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("users", "0002_auto_20210423_1718"),
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="users",
            field=models.ManyToManyField(
                through="users.OrganizationUser", to=settings.AUTH_USER_MODEL
            ),
        ),
    ]
