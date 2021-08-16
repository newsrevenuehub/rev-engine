# Generated by Django 3.2.5 on 2021-08-10 20:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("media", "0003_mediaimage_thumb"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="mediaimage",
            name="thumb",
        ),
        migrations.AddField(
            model_name="mediaimage",
            name="thumbnail",
            field=models.ImageField(blank=True, null=True, upload_to="images/thumbs"),
        ),
    ]
