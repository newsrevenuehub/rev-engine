# Generated by Django 3.2.2 on 2021-06-30 23:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("emails", "0004_alter_pageemailtemplate_schema"),
        ("pages", "0018_donationpage_email_templates"),
    ]

    operations = [
        migrations.AlterField(
            model_name="donationpage",
            name="email_templates",
            field=models.ManyToManyField(blank=True, to="emails.PageEmailTemplate"),
        ),
    ]
