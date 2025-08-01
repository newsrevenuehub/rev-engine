import logging

from django import forms
from django.conf import settings
from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError

from solo.admin import SingletonModelAdmin
from sorl.thumbnail.admin import AdminImageMixin

from apps.common.admin import RevEngineBaseAdmin
from apps.organizations.models import Organization
from apps.pages import models


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class DonationPageAdminAbstract(RevEngineBaseAdmin, AdminImageMixin):
    fieldsets = (
        (None, {"fields": ("name",)}),
        ("Redirects", {"fields": ("thank_you_redirect", "post_thank_you_redirect")}),
        ("Header", {"fields": ("header_bg_image", "header_logo", "header_logo_alt_text", "header_link")}),
        ("Heading", {"fields": ("heading", "graphic")}),
        ("Styles", {"fields": ("styles",)}),
        ("Content", {"fields": ("elements", "sidebar_elements")}),
    )


class DonationPageAdminForm(forms.ModelForm):
    def clean_thank_you_redirect(
        self,
    ):
        """We raise a validation error if the user is attempting to save a non blank value for thank_you_redirect...

        ...and the page's RP's org's plan does not provide this feature
        """
        if not self.instance.id:
            org = Organization.objects.get(revenueprogram__id=self.data["revenue_program"])
        else:
            org = self.instance.revenue_program.organization
        if self.cleaned_data["thank_you_redirect"] and not org.plan.custom_thank_you_page_enabled:
            raise ValidationError(
                f"The parent org (ID: {org.id} | Name: {org.name}) is on the {org.plan.label} plan, "
                f"which does not get this feature."
            )
        return self.cleaned_data["thank_you_redirect"] or ""

    def validate_page_limit(self):
        org = self.cleaned_data["revenue_program"].organization
        # if we're creating a new page, id won't be assigned yet
        if (
            not self.instance.id
            and models.DonationPage.objects.filter(revenue_program__organization=org).count() >= org.plan.page_limit
        ):
            raise ValidationError(
                f"The parent org (ID: {org.id} | Name: {org.name}) is on the {org.plan.label} plan, "
                f"and is limited to {org.plan.page_limit} "
                f"page{'' if org.plan.page_limit == 1 else 's' }."
            )

    def validate_publish_limit(self):
        org = self.cleaned_data["revenue_program"].organization
        if (
            self.cleaned_data["published_date"] is not None
            and models.DonationPage.objects.filter(
                revenue_program__organization=org, published_date__isnull=False
            ).count()
            >= org.plan.publish_limit
        ):
            raise ValidationError(
                f"The parent org (ID: {org.id} | Name: {org.name}) is on the {org.plan.label} plan, "
                f"and is limited to {org.plan.publish_limit} published "
                f"page{'' if org.plan.publish_limit == 1 else 's'}."
            )

    def clean(self):
        super().clean()
        self.validate_page_limit()
        self.validate_publish_limit()
        return self.cleaned_data


@admin.register(models.DonationPage)
class DonationPageAdmin(DonationPageAdminAbstract):
    form = DonationPageAdminForm
    fieldsets = (
        (None, {"fields": ("revenue_program",)}),
        (None, {"fields": ("published_date",)}),
        (None, {"fields": ("locale",)}),
        (
            None,
            {"fields": ("slug",)},
        ),
        *DonationPageAdminAbstract.fieldsets,
        ("Latest screenshot", {"fields": ("page_screenshot",)}),
    )

    list_display = (
        "organization",
        "revenue_program",
        "name",
        "slug",
        "is_live",
        "published_date",
        "locale",
    )
    list_filter = ("revenue_program", "locale")

    order = (
        "created",
        "-published_date",
    )

    search_fields = (
        "name",
        "heading",
        "revenue_program__name",
    )

    readonly_fields = ["page_screenshot", "locale"]

    actions = ("make_template", "undelete_selected", "duplicate_selected")

    # Overriding this template to add the `admin_limited_select` inclusion tag
    change_form_template = "pages/contributionpage_changeform.html"

    def reversion_register(self, model, **options):
        """Set django-reversion options on registered model...

        We explicitly follow `revenue_program` here in order to ensure that a revenue program's
        `default_donation_page` value is restored from null to a contribution page instance, if that
        contribution page has been deleted but is subsequently restored.
        """
        options["follow"] = ("revenue_program",)
        super().reversion_register(model, **options)

    @admin.action(description="Make templates from selected pages")
    def make_template(self, request, queryset):
        created_template_count = 0
        for page in queryset:
            try:
                page.make_template_from_page(from_admin=True)
                created_template_count += 1
            except IntegrityError as integrity_error:
                if "violates unique constraint" in str(integrity_error):
                    self.message_user(
                        request, f'Template name "{page.name}" already used in organization', messages.ERROR
                    )
                else:
                    raise
        if created_template_count:
            self.message_user(
                request,
                f"{created_template_count} {'template' if created_template_count == 1 else 'templates'} created.",
                messages.SUCCESS,
            )

    @admin.action(description="Duplicate selected pages")
    def duplicate_selected(self, request, queryset):
        duplicated_count = 0
        for page in queryset:
            try:
                page.duplicate()
                duplicated_count += 1
            except ValidationError as error:
                self.message_user(
                    request,
                    f"Could not duplicate page '{page.name}': {error}",
                    messages.ERROR,
                )
        self.message_user(
            request,
            f"{duplicated_count} {'page' if duplicated_count == 1 else 'pages'} duplicated successfully.",
            messages.SUCCESS,
        )


@admin.register(models.Style)
class StyleAdmin(RevEngineBaseAdmin):
    list_display = (
        "name",
        "revenue_program",
    )
    list_filter = (
        "name",
        "revenue_program",
    )
    order = (
        "name",
        "revenue_program__name",
    )
    search_fields = (
        "name",
        "revenue_program__name",
    )


@admin.register(models.Font)
class FontAdmin(RevEngineBaseAdmin):
    list_display = (
        "name",
        "source",
    )
    list_filter = ("source",)
    ordering = (
        "name",
        "source",
    )
    search_fields = ("name",)


@admin.register(models.DefaultPageLogo)
class DefaultPageLogoAdmin(SingletonModelAdmin, AdminImageMixin):
    pass
