from django.contrib import admin, messages
from django.http import HttpResponseRedirect
from django.urls import reverse

from sorl.thumbnail.admin import AdminImageMixin

from apps.pages.models import Benefit, BenefitTier, DonationPage, DonorBenefit, Style, Template


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
            {
                "fields": (
                    "show_benefits",
                    "donor_benefits",
                )
            },
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

    def response_change(self, request, obj):
        if "_page-from-template" in request.POST:
            new_page = obj.make_page_from_template()
            return HttpResponseRedirect(reverse("admin:pages_donationpage_change", kwargs={"object_id": new_page.id}))
        return super().response_change(request, obj)


@admin.register(DonationPage)
class DonationPageAdmin(DonationPageAdminAbstract):
    fieldsets = (
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
    ) + DonationPageAdminAbstract.fieldsets

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

    readonly_fields = ["derived_slug"]

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
