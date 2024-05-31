# Generated by Django 3.2.13 on 2022-06-24 02:35

import django.db.models.deletion
import django.db.models.functions.text
import django.utils.timezone
from django.db import migrations, models

import model_utils.fields
import sorl.thumbnail.fields

import apps.config.validators
import apps.pages.defaults
import apps.pages.models
import apps.pages.validators
import apps.users.models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="DefaultPageLogo",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("logo", sorl.thumbnail.fields.ImageField(null=True, upload_to="")),
            ],
            options={
                "abstract": False,
            },
        ),
        migrations.CreateModel(
            name="Font",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "name",
                    models.CharField(
                        help_text="This is how the font will be displayed in the Org admin", max_length=255, unique=True
                    ),
                ),
                (
                    "source",
                    models.CharField(choices=[("typekit", "Typekit"), ("google", "Google fonts")], max_length=7),
                ),
                (
                    "font_name",
                    models.CharField(
                        help_text="This is the name by which CSS will use the font", max_length=255, unique=True
                    ),
                ),
                (
                    "accessor",
                    models.CharField(
                        help_text="For typekit fonts, use the kitId. For google fonts, use the value of the 'family' query param",
                        max_length=255,
                    ),
                ),
            ],
            options={
                "ordering": [django.db.models.functions.text.Lower("name")],
            },
        ),
        migrations.CreateModel(
            name="Style",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "created",
                    model_utils.fields.AutoCreatedField(
                        db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="created"
                    ),
                ),
                (
                    "modified",
                    model_utils.fields.AutoLastModifiedField(
                        db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="modified"
                    ),
                ),
                ("name", models.CharField(max_length=50)),
                ("styles", models.JSONField(validators=[apps.pages.validators.style_validator])),
                (
                    "revenue_program",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="organizations.revenueprogram"),
                ),
            ],
            options={
                "ordering": ["-created", "name"],
                "unique_together": {("name", "revenue_program")},
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name="Template",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "created",
                    model_utils.fields.AutoCreatedField(
                        db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="created"
                    ),
                ),
                (
                    "modified",
                    model_utils.fields.AutoLastModifiedField(
                        db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="modified"
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("heading", models.CharField(blank=True, max_length=255)),
                ("graphic", sorl.thumbnail.fields.ImageField(blank=True, null=True, upload_to="")),
                ("header_bg_image", sorl.thumbnail.fields.ImageField(blank=True, null=True, upload_to="")),
                ("header_logo", sorl.thumbnail.fields.ImageField(blank=True, default=None, null=True, upload_to="")),
                ("header_link", models.URLField(blank=True)),
                ("sidebar_elements", models.JSONField(blank=True, default=list, null=True)),
                (
                    "thank_you_redirect",
                    models.URLField(
                        blank=True,
                        help_text="If not using default Thank You page, add link to orgs Thank You page here",
                    ),
                ),
                (
                    "post_thank_you_redirect",
                    models.URLField(
                        blank=True,
                        help_text='Donors can click a link to go "back to the news" after viewing the default thank you page',
                    ),
                ),
                ("elements", models.JSONField(blank=True, default=list, null=True)),
                (
                    "revenue_program",
                    models.ForeignKey(
                        null=True, on_delete=django.db.models.deletion.SET_NULL, to="organizations.revenueprogram"
                    ),
                ),
                (
                    "styles",
                    models.ForeignKey(
                        blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="pages.style"
                    ),
                ),
            ],
            options={
                "unique_together": {("name", "revenue_program")},
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name="DonationPage",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "created",
                    model_utils.fields.AutoCreatedField(
                        db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="created"
                    ),
                ),
                (
                    "modified",
                    model_utils.fields.AutoLastModifiedField(
                        db_index=True, default=django.utils.timezone.now, editable=False, verbose_name="modified"
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("heading", models.CharField(blank=True, max_length=255)),
                ("graphic", sorl.thumbnail.fields.ImageField(blank=True, null=True, upload_to="")),
                ("header_bg_image", sorl.thumbnail.fields.ImageField(blank=True, null=True, upload_to="")),
                ("header_logo", sorl.thumbnail.fields.ImageField(blank=True, default=None, null=True, upload_to="")),
                ("header_link", models.URLField(blank=True)),
                ("sidebar_elements", models.JSONField(blank=True, default=list, null=True)),
                (
                    "thank_you_redirect",
                    models.URLField(
                        blank=True,
                        help_text="If not using default Thank You page, add link to orgs Thank You page here",
                    ),
                ),
                (
                    "post_thank_you_redirect",
                    models.URLField(
                        blank=True,
                        help_text='Donors can click a link to go "back to the news" after viewing the default thank you page',
                    ),
                ),
                (
                    "elements",
                    models.JSONField(blank=True, default=apps.pages.defaults.get_default_page_elements, null=True),
                ),
                (
                    "slug",
                    models.SlugField(
                        blank=True,
                        error_messages={"unique": "This slug is already in use on this Revenue Program"},
                        help_text="If not entered, it will be built from the Page name",
                        validators=[apps.config.validators.validate_slug_against_denylist],
                    ),
                ),
                ("published_date", models.DateTimeField(blank=True, null=True)),
                (
                    "page_screenshot",
                    sorl.thumbnail.fields.ImageField(
                        blank=True, null=True, upload_to=apps.pages.models._get_screenshot_upload_path
                    ),
                ),
                (
                    "revenue_program",
                    models.ForeignKey(
                        null=True, on_delete=django.db.models.deletion.SET_NULL, to="organizations.revenueprogram"
                    ),
                ),
                (
                    "styles",
                    models.ForeignKey(
                        blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="pages.style"
                    ),
                ),
            ],
            options={
                "unique_together": {("slug", "revenue_program")},
            },
            bases=(models.Model,),
        ),
    ]
