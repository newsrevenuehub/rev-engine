# Generated by Django 3.2.5 on 2021-08-17 20:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("element_media", "0002_auto_20210817_2013"),
    ]

    operations = [
        migrations.AlterField(
            model_name="mediaimage",
            name="thumbnail",
            field=models.ImageField(blank=True, null=True, upload_to="thumbs"),
        ),
    ]
