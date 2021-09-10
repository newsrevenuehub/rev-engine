import logging

from django.conf import settings
from django.contrib import admin, messages
from django.http import HttpResponseRedirect
from django.urls import reverse

from safedelete.admin import SafeDeleteAdmin, highlight_deleted
from sorl.thumbnail.admin import AdminImageMixin

from apps.common.admin import RevEngineBaseAdmin
from apps.pages.models import DonationPage, Style, Template


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class DonationPageAdminAbstract(AdminImageMixin, RevEngineBaseAdmin):
    fieldsets = (
        (None, {"fields": ("name",)}),
        (
            None,
            {
                "fields": ("organization",),
            },
        ),
        ("Redirects", {"fields": ("thank_you_redirect", "post_thank_you_redirect")}),
        ("Header", {"fields": ("header_bg_image", "header_logo", "header_link")}),
        ("Heading", {"fields": ("heading", "graphic")}),
        ("Styles", {"fields": ("styles",)}),
        ("Content", {"fields": ("elements", "sidebar_elements")}),
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
class DonationPageAdmin(DonationPageAdminAbstract, SafeDeleteAdmin):
    fieldsets = (
        (
            (None, {"fields": ("revenue_program",)}),
            (None, {"fields": ("published_date",)}),
            (
                None,
                {"fields": ("slug",)},
            ),
        )
        + DonationPageAdminAbstract.fieldsets
        + (
            ("Latest screenshot", {"fields": ("page_screenshot",)}),
            ("Email Templates", {"fields": ("email_templates",)}),
        )
    )

    list_display = (
        highlight_deleted,
        "organization",
        "revenue_program",
        "slug",
        "is_live",
        "published_date",
    ) + SafeDeleteAdmin.list_display

    list_filter = (
        "organization__name",
        "revenue_program",
    ) + SafeDeleteAdmin.list_filter

    order = (
        "created",
        "-published_date",
    )

    search_fields = (
        "name",
        "heading",
        "organization__name",
        "revenue_program__name",
    )

    readonly_fields = ["email_templates", "page_screenshot"]

    actions = ("make_template", "undelete_selected")

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
class StyleAdmin(RevEngineBaseAdmin):
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
