# Generated by Django 3.2.2 on 2021-05-13 14:39

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0010_alter_organization_name"),
    ]

    operations = [
        migrations.AlterField(
            model_name="feature",
            name="feature_value",
            field=models.CharField(
                help_text="Limit feature types must be a positive integer. Valid Boolean Type values are ('t', 'f', '1', '0')",
                max_length=32,
            ),
        ),
    ]
