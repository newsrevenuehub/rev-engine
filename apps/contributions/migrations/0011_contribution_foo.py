# Generated by Django 3.2.25 on 2024-05-23 16:22

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0010_DEV-4562_add_revenue_program_with_constraint"),
    ]

    operations = [
        migrations.AddField(
            model_name="contribution",
            name="foo",
            field=models.TextField(null=True),
        ),
    ]
