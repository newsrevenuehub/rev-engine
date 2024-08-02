# Generated by Django 4.2.14 on 2024-07-29 19:52

from django.db import migrations, models


def set_first_payment_date_default(apps, schema_editor):
    # cribbed from
    # https://stackoverflow.com/questions/29787853/django-migrations-add-field-with-default-as-function-of-model
    Contribution = apps.get_model("contributions", "contribution")
    all_contributions = Contribution.objects.all()
    for contribution in all_contributions:
        contribution.first_payment_date = contribution.created
    Contribution.objects.bulk_update(all_contributions, ["first_payment_date"], batch_size=1000)


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0011_DEV_3658"),
    ]

    operations = [
        migrations.AddField(
            model_name="contribution",
            name="first_payment_date",
            field=models.DateTimeField(null=True),
            preserve_default=False,
        ),
        # Doesn't need to do anything to reverse it because we'd remove the field.
        migrations.RunPython(set_first_payment_date_default, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="contribution",
            name="first_payment_date",
            field=models.DateTimeField(null=False),
        ),
    ]
