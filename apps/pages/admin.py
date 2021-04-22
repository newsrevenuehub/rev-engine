from django.contrib import admin, messages
from django.http import HttpResponseRedirect
from django.urls import reverse

from apps.pages.models import Benefit, BenefitTier, DonationPage, DonorBenefit, Style, Template


class DonationPageAdminAbstract(admin.ModelAdmin):
    fieldsets = (
        (None, {"fields": ("name",)}),
        (
            None,
            {
                "fields": ("organization",),
            },
        ),
        ("Header", {"fields": ("header_bg_image", "header_logo", "header_link")}),
        ("Title", {"fields": ("title",)}),
        (None, {"fields": ("elements",)}),
        (
            "Benefits",
            {
                "fields": (
                    "show_benefits",
                    "donor_benefits",
                )
            },
        ),
    )


@admin.register(Template)
class TemplateAdmin(DonationPageAdminAbstract):
    change_form_template = "pages/templates_changeform.html"

    def response_change(self, request, obj):
        if "_page-from-template" in request.POST:
            new_page = obj.make_page_from_template()
            return HttpResponseRedirect(
                reverse("admin:pages_donationpage_change", kwargs={"object_id": new_page.id})
            )
        return super().response_change(request, obj)


@admin.register(DonationPage)
class DonationPageAdmin(DonationPageAdminAbstract):
    fieldsets = (
        (None, {"fields": ("revenue_program",)}),
        (None, {"fields": ("published_date",)}),
        (None, {"fields": ("slug",)}),
    ) + DonationPageAdminAbstract.fieldsets

    actions = ["make_template"]

    @admin.action(description="Copy selected pages as templates")
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
    pass


@admin.register(Benefit)
class BenefitInline(admin.ModelAdmin):
    pass


@admin.register(BenefitTier)
class BenefitTierInline(admin.ModelAdmin):
    pass


@admin.register(DonorBenefit)
class DonorBenefitAdmin(admin.ModelAdmin):
    pass
