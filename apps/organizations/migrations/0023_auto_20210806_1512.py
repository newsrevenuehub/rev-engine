# Generated by Django 3.2.5 on 2021-08-06 15:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0022_auto_20210806_1355"),
    ]

    operations = [
        migrations.AddField(
            model_name="benefitlevel",
            name="benefits",
            field=models.ManyToManyField(through="organizations.BenefitLevelBenefit", to="organizations.Benefit"),
        ),
        migrations.AlterField(
            model_name="benefitlevel",
            name="upper_limit",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="revenueprogram",
            name="benefit_levels",
            field=models.ManyToManyField(
                through="organizations.RevenueProgramBenefitLevel", to="organizations.BenefitLevel"
            ),
        ),
    ]
