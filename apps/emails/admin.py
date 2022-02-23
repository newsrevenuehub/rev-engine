from django.contrib import admin

from apps.common.admin import RevEngineSimpleHistoryAdmin
from apps.emails.models import PageEmailTemplate


@admin.register(PageEmailTemplate)
class PageEmailAdmin(RevEngineSimpleHistoryAdmin):
    fieldsets = (
        ("Template Identifier", {"fields": ("identifier",)}),
        ("Contact Type", {"fields": ("template_type",)}),
        ("Tag Schema", {"fields": ("schema",)}),
    )

    list_display = (
        "identifier",
        "template_type",
    )
