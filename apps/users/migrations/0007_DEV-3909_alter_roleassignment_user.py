# Generated by Django 3.2.20 on 2023-09-19 19:31

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0006_DEV-2644_alter_user_accepted_terms_of_service"),
    ]

    operations = [
        migrations.AlterField(
            model_name="roleassignment",
            name="user",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE, related_name="roleassignment", to=settings.AUTH_USER_MODEL
            ),
        ),
    ]
