import logging

from django.conf import settings
from django.contrib import admin, messages
from django.http import HttpResponseRedirect
from django.urls import reverse

from sorl.thumbnail.admin import AdminImageMixin

from apps.pages.models import Benefit, BenefitTier, DonationPage, DonorBenefit, Style, Template


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class DonationPageAdminAbstract(AdminImageMixin, admin.ModelAdmin):
    fieldsets = (
        (None, {"fields": ("name",)}),
        (
            None,
            {
                "fields": ("organization",),
            },
        ),
        ("Redirects", {"fields": ("thank_you_redirect", "post_thank_you_redirect")}),
        (
            "Benefits",
            {"fields": ("donor_benefits",)},
        ),
        ("Header", {"fields": ("header_bg_image", "header_logo", "header_link")}),
        ("Heading", {"fields": ("heading", "graphic")}),
        ("Styles", {"fields": ("styles",)}),
        ("Content", {"fields": ("elements",)}),
    )


@admin.register(Template)
class TemplateAdmin(DonationPageAdminAbstract):
    list_display = (
        "name",
        "heading",
        "organization",
    )
    list_filter = (
        "name",
        "heading",
        "organization",
    )
    ordering = (
        "name",
        "organization__name",
    )
    search_fields = (
        "name",
        "heading",
        "organization__name",
    )

    change_form_template = "pages/templates_changeform.html"

    def has_add_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        return [x for x in obj.field_names()]

    def response_change(self, request, obj):
        if "_page-from-template" in request.POST:
            try:
                new_page = obj.make_page_from_template()
            except Template.TemplateError as e:
                logger.error(e)
                self.message_user(
                    request,
                    "Something went wrong. The page this template was created from cannot be found.",
                    messages.ERROR,
                )
                return HttpResponseRedirect(reverse("admin:pages_template_change", kwargs={"object_id": obj.id}))
            return HttpResponseRedirect(reverse("admin:pages_donationpage_change", kwargs={"object_id": new_page.id}))
        return super().response_change(request, obj)


@admin.register(DonationPage)
class DonationPageAdmin(DonationPageAdminAbstract):
    fieldsets = (
        (
            (None, {"fields": ("revenue_program",)}),
            (None, {"fields": ("published_date",)}),
            (
                None,
                {
                    "fields": (
                        "slug",
                        "derived_slug",
                    )
                },
            ),
        )
        + DonationPageAdminAbstract.fieldsets
        + (("Email Templates", {"fields": ("email_templates",)}),)
    )

    list_display = (
        "name",
        "heading",
        "organization",
        "revenue_program",
        "slug",
        "derived_slug",
        "is_live",
        "published_date",
    )
    list_filter = ("name", "heading", "organization", "revenue_program", "slug", "published_date")
    order = (
        "published_date",
        "organization__name",
    )
    search_fields = (
        "name",
        "heading",
        "organization__name",
        "revenue_program__name",
    )

    readonly_fields = ["derived_slug", "email_templates"]

    actions = ("make_template",)

    @admin.action(description="Make templates from selected pages")
    def make_template(self, request, queryset):
        updated = 0
        duplicated = 0
        for page in queryset:
            _, created = page.save_as_template()
            if created:
                updated += 1
            else:
                duplicated += 1

        if updated:
            self.message_user(
                request,
                f"{updated} {'template' if updated == 1 else 'templates'} created.",
                messages.SUCCESS,
            )

        if duplicated:
            self.message_user(
                request,
                f"{duplicated} {'template' if duplicated == 1 else 'templates'} already {'exists' if duplicated == 1 else 'exist'}",
                messages.WARNING,
            )


@admin.register(Style)
class StyleAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "organization",
    )
    list_filter = (
        "name",
        "organization",
    )
    order = (
        "name",
        "organization__name",
    )
    search_fields = (
        "name",
        "organization__name",
    )


@admin.register(Benefit)
class BenefitAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "organization",
    )
    list_filter = (
        "name",
        "organization",
    )
    order = (
        "name",
        "organization__name",
    )
    search_fields = (
        "name",
        "organization__name",
    )


@admin.register(BenefitTier)
class BenefitTierAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "organization",
    )
    list_filter = (
        "name",
        "organization",
    )
    order = (
        "name",
        "organization__name",
    )
    search_fields = (
        "name",
        "organization__name",
    )


@admin.register(DonorBenefit)
class DonorBenefitAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "organization",
    )
    list_filter = (
        "name",
        "organization",
    )
    order = (
        "name",
        "organization__name",
    )
    search_fields = (
        "name",
        "organization__name",
    )
