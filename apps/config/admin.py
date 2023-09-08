from django.contrib import admin

from reversion_compare.admin import CompareVersionAdmin
from waffle.admin import FlagAdmin as WaffleFlagAdmin

from apps.common.admin import RevEngineBaseAdmin
from apps.config.models import DenyListWord, Flag


@admin.register(DenyListWord)
class DenyListWordAdmin(RevEngineBaseAdmin, CompareVersionAdmin):
    list_display = ("word",)

    ordering = ("word",)

    search_fields = ("word",)


@admin.register(Flag)
class FlagAdmin(WaffleFlagAdmin):
    raw_id_fields = tuple(list(WaffleFlagAdmin.raw_id_fields) + ["organizations"])
