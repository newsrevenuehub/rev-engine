from django.contrib import admin

from apps.common.admin import RevEngineSimpleHistoryAdmin
from apps.config.models import DenyListWord


@admin.register(DenyListWord)
class DenyListWordAdmin(RevEngineSimpleHistoryAdmin):
    list_display = ("word",)

    ordering = ("word",)

    search_fields = ("word",)
