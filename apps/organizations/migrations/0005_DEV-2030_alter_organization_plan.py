# Generated by Django 3.2.14 on 2022-07-08 13:29

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0004_DEV-2049_add_org_country_retire_address"),
    ]

    operations = [
        migrations.AlterField(
            model_name="organization",
            name="plan",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, to="organizations.plan"),
        ),
    ]
