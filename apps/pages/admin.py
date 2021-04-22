from django.contrib import admin, messages

from apps.pages.models import Benefit, BenefitTier, DonorBenefit, Page, Style, Template


class PageAdminAbstract(admin.ModelAdmin):
    fieldsets = (
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
class TemplateAdmin(PageAdminAbstract):
    fieldsets = ((None, {"fields": ("name",)}),) + PageAdminAbstract.fieldsets


@admin.register(Page)
class PageAdmin(PageAdminAbstract):
    fieldsets = (
        (None, {"fields": ("revenue_program",)}),
        (None, {"fields": ("published_date",)}),
        (None, {"fields": ("slug",)}),
    ) + PageAdminAbstract.fieldsets

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
