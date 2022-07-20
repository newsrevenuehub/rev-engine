# Generated by Django 3.2.14 on 2022-07-08 04:52

from django.db import migrations, models


def populate_rp_country_from_old_related_addresses(apps, schema_editor):
    RevenueProgram = apps.get_model("organizations", "RevenueProgram")
    for rp in RevenueProgram.objects.filter(address__isnull=False).all():
        rp.country = rp.address.country
        rp.save()


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0003_DEV-1757_uses_email_templates"),
    ]

    operations = [
        migrations.AddField(
            model_name="revenueprogram",
            name="country",
            field=models.CharField(
                choices=[("US", "United States"), ("CA", "Canada")],
                default="US",
                help_text="2-letter country code of RP's company. This gets included in data sent to stripe when creating a payment",
                max_length=2,
                verbose_name="Country",
            ),
        ),
        migrations.RunPython(
            code=populate_rp_country_from_old_related_addresses,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name="organization",
            name="address",
        ),
        migrations.RemoveField(
            model_name="revenueprogram",
            name="address",
        ),
    ]
