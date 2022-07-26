# Generated by Django 3.2.14 on 2022-07-08 13:29

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0005_DEV-2030_alter_organization_plan"),
        ("pages", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="donationpage",
            name="revenue_program",
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.CASCADE, to="organizations.revenueprogram"
            ),
        ),
        migrations.AlterField(
            model_name="template",
            name="revenue_program",
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.CASCADE, to="organizations.revenueprogram"
            ),
        ),
    ]
