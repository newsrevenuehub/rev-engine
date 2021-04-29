# Generated by Django 3.2 on 2021-04-27 17:55

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0002_organization_users"),
        ("pages", "0005_auto_20210426_1447"),
    ]

    operations = [
        migrations.AlterField(
            model_name="benefit",
            name="organization",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="organizations.organization"),
        ),
        migrations.AlterField(
            model_name="benefittier",
            name="organization",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="organizations.organization"),
        ),
        migrations.AlterField(
            model_name="donationpage",
            name="donor_benefits",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="pages.donorbenefit",
            ),
        ),
        migrations.AlterField(
            model_name="donationpage",
            name="organization",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="organizations.organization"),
        ),
        migrations.AlterField(
            model_name="donationpage",
            name="revenue_program",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="organizations.revenueprogram",
            ),
        ),
        migrations.AlterField(
            model_name="donorbenefit",
            name="organization",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="organizations.organization"),
        ),
        migrations.AlterField(
            model_name="style",
            name="organization",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="organizations.organization"),
        ),
        migrations.AlterField(
            model_name="template",
            name="donor_benefits",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="pages.donorbenefit",
            ),
        ),
        migrations.AlterField(
            model_name="template",
            name="organization",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="organizations.organization"),
        ),
    ]
