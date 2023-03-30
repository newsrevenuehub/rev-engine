# Generated by Django 3.2.16 on 2023-03-02 21:51

from django.db import migrations, models


# Note: due to oddities around the order in which related PRs were merged, this migration
# ended up being merged with a file name that is contrary to our typical convention. Specifically,
# this migration should have been named 0016_DEV-3298_add_mailchimp_fields.py, as 3298 pulled in the migration
# that was in this branch. Ultimately, 3298 was merged into main ahead of 3297, hence discrepancy.


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0015_DEV-3131_organization_add_fiscal_status_fiscal_sponsor_name_remove_nonprofit"),
    ]

    operations = [
        # this is a temporary field, to be removed in https://news-revenue-hub.atlassian.net/browse/DEV-3302
        migrations.AddField(
            model_name="revenueprogram",
            name="mailchimp_access_token",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="revenueprogram",
            name="mailchimp_server_prefix",
            field=models.TextField(blank=True, null=True),
        ),
    ]
