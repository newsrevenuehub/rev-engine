# Generated by Django 3.2 on 2021-05-12 18:15

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0006_organization_stripe_verified"),
    ]

    operations = [
        migrations.AlterField(
            model_name="organization",
            name="stripe_verified",
            field=models.BooleanField(
                default=False,
                help_text='A fully verified Stripe Connected account should have "charges_enabled: true" in Stripe',
            ),
        ),
    ]
