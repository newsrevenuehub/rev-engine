# Generated by Django 3.2.16 on 2022-11-15 19:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0010_DEV-1867_rename_plan_organization_plan_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="show_connected_to_slack",
            field=models.BooleanField(default=False, verbose_name="Show connected to Slack"),
        ),
    ]
