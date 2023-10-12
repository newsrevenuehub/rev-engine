# Generated by Django 3.2.14 on 2022-07-08 13:29

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0005_DEV-2030_alter_organization_plan"),
        ("users", "0002_auto_20220624_0235"),
    ]

    operations = [
        migrations.AlterField(
            model_name="roleassignment",
            name="organization",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to="organizations.organization"
            ),
        ),
    ]
