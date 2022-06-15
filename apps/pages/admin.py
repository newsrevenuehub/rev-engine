import logging

from django.conf import settings
from django.contrib import admin, messages
from django.db.utils import IntegrityError
from django.http import HttpResponseRedirect
from django.urls import reverse

from reversion.admin import VersionAdmin
from solo.admin import SingletonModelAdmin
from sorl.thumbnail.admin import AdminImageMixin

from apps.common.admin import RevEngineBaseAdmin
from apps.pages import models


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class DonationPageAdminAbstract(RevEngineBaseAdmin, VersionAdmin, AdminImageMixin):
    fieldsets = (
        (None, {"fields": ("name",)}),
        ("Redirects", {"fields": ("thank_you_redirect", "post_thank_you_redirect")}),
        ("Header", {"fields": ("header_bg_image", "header_logo", "header_link")}),
        ("Heading", {"fields": ("heading", "graphic")}),
        ("Styles", {"fields": ("styles",)}),
        ("Content", {"fields": ("elements", "sidebar_elements")}),
    )


@admin.register(models.Template)
class TemplateAdmin(DonationPageAdminAbstract):
    list_display = (
        "name",
        "heading",
    )
    list_filter = (
        "name",
        "heading",
        "revenue_program",
    )
    ordering = (
        "name",
        "revenue_program__name",
    )
    search_fields = (
        "name",
        "heading",
        "revenue_program__name",
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
            except IntegrityError as integrity_error:
                if "violates unique constraint" in str(integrity_error):
                    self.message_user(
                        request,
                        f'Donation Page name "{obj.name}" already used in organization. Did you forget to update the name of a previous page created from this template?',
                        messages.ERROR,
                    )
                    return HttpResponseRedirect(reverse("admin:pages_template_change", kwargs={"object_id": obj.id}))
            return HttpResponseRedirect(reverse("admin:pages_donationpage_change", kwargs={"object_id": new_page.id}))
        return super().response_change(request, obj)


@admin.register(models.DonationPage)
class DonationPageAdmin(DonationPageAdminAbstract):
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
        + (("Latest screenshot", {"fields": ("page_screenshot",)}),)
    )

    list_display = (
        "organization",
        "revenue_program",
        "slug",
        "is_live",
        "published_date",
    )
    list_filter = ("revenue_program",)

    order = (
        "created",
        "-published_date",
    )

    search_fields = (
        "name",
        "heading",
        "revenue_program__name",
    )

    readonly_fields = [
        "page_screenshot",
    ]

    actions = ("make_template", "undelete_selected")

    # Overriding this template to add the `admin_limited_select` inclusion tag
    change_form_template = "pages/donationpage_changeform.html"

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

        if created_template_count:
            self.message_user(
                request,
                f"{created_template_count} {'template' if created_template_count == 1 else 'templates'} created.",
                messages.SUCCESS,
            )

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields["styles"].widget.can_add_related = False
        form.base_fields["styles"].widget.can_change_related = False
        form.base_fields["styles"].widget.can_delete_related = False
        return form


@admin.register(models.Style)
class StyleAdmin(VersionAdmin):
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
class FontAdmin(VersionAdmin):
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
