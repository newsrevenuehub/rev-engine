from django.contrib import admin

from reversion_compare.admin import CompareVersionAdmin

from apps.common.admin import RevEngineBaseAdmin
from apps.config.models import DenyListWord


@admin.register(DenyListWord)
class DenyListWordAdmin(RevEngineBaseAdmin, CompareVersionAdmin):
    list_display = ("word",)

    ordering = ("word",)

    search_fields = ("word",)
