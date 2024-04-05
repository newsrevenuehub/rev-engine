from django.contrib import admin

from apps.common.admin import RevEngineBaseAdmin
from apps.config.models import DenyListWord


@admin.register(DenyListWord)
class DenyListWordAdmin(RevEngineBaseAdmin):
    list_display = ("word",)

    ordering = ("word",)

    search_fields = ("word",)
