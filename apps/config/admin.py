from django.contrib import admin

from apps.config.models import DenyListWord


@admin.register(DenyListWord)
class DenyListWordAdmin(admin.ModelAdmin):
    list_display = ("word",)

    ordering = ("word",)

    search_fields = ("word",)
