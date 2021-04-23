# Generated by Django 3.2 on 2021-04-23 16:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0002_auto_20210423_1338"),
    ]

    operations = [
        migrations.CreateModel(
            name="Feature",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
            ],
        ),
        migrations.AddField(
            model_name="plan",
            name="features",
            field=models.ManyToManyField(to="organizations.Feature"),
        ),
    ]
