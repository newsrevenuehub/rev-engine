# Generated by Django 3.2.16 on 2022-11-01 16:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0005_DEV-2183_contribution_provider_client_secret_id"),
    ]

    operations = [
        migrations.AlterField(
            model_name="contribution",
            name="bad_actor_score",
            field=models.IntegerField(
                choices=[
                    (0, "0 - Information"),
                    (1, "1 - Unknown"),
                    (2, "2 - Good"),
                    (3, "3 - Suspect"),
                    (4, "4 - Bad"),
                    (5, "5 - Very Bad"),
                ],
                null=True,
            ),
        ),
        migrations.AddConstraint(
            model_name="contribution",
            constraint=models.CheckConstraint(
                check=models.Q(("bad_actor_score__in", [0, 1, 2, 3, 4, 5])),
                name="contributions_contribution_bad_actor_score_valid",
            ),
        ),
    ]
