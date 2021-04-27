# Generated by Django 3.2 on 2021-04-27 17:07

from django.db import migrations
import django.utils.timezone
import model_utils.fields


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0002_auto_20210426_1553"),
    ]

    operations = [
        migrations.AddField(
            model_name="feature",
            name="created",
            field=model_utils.fields.AutoCreatedField(
                db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="created"
            ),
        ),
        migrations.AddField(
            model_name="feature",
            name="modified",
            field=model_utils.fields.AutoLastModifiedField(
                db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="modified"
            ),
        ),
        migrations.AddField(
            model_name="organization",
            name="created",
            field=model_utils.fields.AutoCreatedField(
                db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="created"
            ),
        ),
        migrations.AddField(
            model_name="organization",
            name="modified",
            field=model_utils.fields.AutoLastModifiedField(
                db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="modified"
            ),
        ),
        migrations.AddField(
            model_name="plan",
            name="created",
            field=model_utils.fields.AutoCreatedField(
                db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="created"
            ),
        ),
        migrations.AddField(
            model_name="plan",
            name="modified",
            field=model_utils.fields.AutoLastModifiedField(
                db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="modified"
            ),
        ),
        migrations.AddField(
            model_name="revenueprogram",
            name="created",
            field=model_utils.fields.AutoCreatedField(
                db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="created"
            ),
        ),
        migrations.AddField(
            model_name="revenueprogram",
            name="modified",
            field=model_utils.fields.AutoLastModifiedField(
                db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="modified"
            ),
        ),
    ]
