# Generated by Django 3.2.2 on 2021-06-04 20:27

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("emails", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="mailgunemailtemplate",
            old_name="merge_data",
            new_name="schema",
        ),
    ]
