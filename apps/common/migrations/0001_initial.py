# Generated by Django 3.2.13 on 2022-06-24 02:35

from django.db import migrations, models
import sorl.thumbnail.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Address",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("address1", models.CharField(blank=True, max_length=255, verbose_name="Address 1")),
                ("address2", models.CharField(blank=True, max_length=255, verbose_name="Address 2")),
                ("city", models.CharField(blank=True, max_length=64, verbose_name="City")),
                (
                    "state",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("AL", "Alabama"),
                            ("AK", "Alaska"),
                            ("AZ", "Arizona"),
                            ("AR", "Arkansas"),
                            ("CA", "California"),
                            ("CO", "Colorado"),
                            ("CT", "Connecticut"),
                            ("DC", "Washington D.C."),
                            ("DE", "Delaware"),
                            ("FL", "Florida"),
                            ("GA", "Georgia"),
                            ("HI", "Hawaii"),
                            ("ID", "Idaho"),
                            ("IL", "Illinois"),
                            ("IN", "Indiana"),
                            ("IA", "Iowa"),
                            ("KS", "Kansas"),
                            ("LA", "Louisiana"),
                            ("ME", "Maine"),
                            ("MD", "Maryland"),
                            ("MA", "Massachusetts"),
                            ("MI", "Michigan"),
                            ("MN", "Minnesota"),
                            ("MS", "Mississippi"),
                            ("MO", "Missouri"),
                            ("MT", "Montana"),
                            ("NE", "Nebraska"),
                            ("NV", "Nevada"),
                            ("NH", "New Hampshire"),
                            ("NJ", "New Jersey"),
                            ("NM", "New Mexico"),
                            ("NY", "New York"),
                            ("NC", "North Carolina"),
                            ("ND", "North Dakota"),
                            ("OH", "Ohio"),
                            ("OK", "Oklahoma"),
                            ("OR", "Oregon"),
                            ("PA", "Pennsylvania"),
                            ("RI", "Rhode Island"),
                            ("SC", "South Carolina"),
                            ("SD", "South Dakota"),
                            ("TN", "Tennessee"),
                            ("TX", "Texas"),
                            ("UT", "Utah"),
                            ("VT", "Vermont"),
                            ("VA", "Virginia"),
                            ("WA", "Washington"),
                            ("WI", "Wisconsin"),
                            ("WY", "Wyoming"),
                            ("AB", "Alberta"),
                            ("BC", "British Columbia"),
                            ("MB", "Manitoba"),
                            ("NB", "New Brunswick"),
                            ("NL", "Newfoundland and Labrador"),
                            ("NS", "Nova Scotia"),
                            ("NT", "Northwest Territories"),
                            ("NU", "Nunavut"),
                            ("ON", "Ontario"),
                            ("PE", "Prince Edward Island"),
                            ("QC", "Quebec"),
                            ("SK", "Saskatchewan"),
                            ("YT", "Yukon"),
                        ],
                        max_length=2,
                        verbose_name="State/Province",
                    ),
                ),
                ("postal_code", models.CharField(blank=True, max_length=9, verbose_name="Postal code")),
                (
                    "country",
                    models.CharField(
                        blank=True,
                        choices=[("US", "US"), ("CA", "CA")],
                        default="US",
                        max_length=2,
                        verbose_name="Country",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="SocialMeta",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(blank=True, max_length=95)),
                ("description", models.TextField(blank=True)),
                ("url", models.URLField(blank=True)),
                ("card", sorl.thumbnail.fields.ImageField(blank=True, null=True, upload_to="")),
            ],
        ),
    ]
