# Generated by Django 3.2.5 on 2022-02-07 16:45

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0046_merge_20220203_1437"),
        ("pages", "0038_alter_donationpage_slug"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="donationpage",
            name="organization",
        ),
        migrations.AddField(
            model_name="template",
            name="revenue_program",
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.SET_NULL, to="organizations.revenueprogram"
            ),
        ),
        migrations.AlterUniqueTogether(
            name="template",
            unique_together={("name", "revenue_program")},
        ),
        migrations.RemoveField(
            model_name="template",
            name="organization",
        ),
    ]
