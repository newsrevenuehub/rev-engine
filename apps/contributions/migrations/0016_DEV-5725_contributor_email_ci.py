# Generated by Django 4.2.16 on 2025-01-24 20:46

from django.db import migrations, models


# NB: This migration includes a workaround for an issue related to case-insensitive collation
# and unique constraints in Django 4.2. More detail can be found at links below, but to summarize
# you can't simply add case insensitivity to an already unique field. The workaround is to
# add a temp field, copy the data, remove the old field, rename the new field to the old field name.
# See:
# https://code.djangoproject.com/ticket/33901
# https://code.djangoproject.com/ticket/34898
def copy_email(apps, schema_editor):
    Contributor = apps.get_model("contributions", "Contributor")
    for contributor in Contributor.objects.all():
        contributor._email = contributor.email
        contributor.save()


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0015_DEV-4915_alter_contribution_provider_payment_id_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="contributor",
            name="_email",
            field=models.EmailField(db_collation="case_insensitive", max_length=254, null=True, unique=True),
        ),
        migrations.RunPython(copy_email),
        migrations.AlterField(
            model_name="contributor",
            name="_email",
            field=models.EmailField(db_collation="case_insensitive", max_length=254, unique=True),
        ),
        migrations.RemoveField(model_name="contributor", name="email"),
        migrations.RenameField(model_name="contributor", old_name="_email", new_name="email"),
    ]
