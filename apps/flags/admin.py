from django.contrib import admin

from waffle.admin import FlagAdmin as WaffleFlagAdmin

from .models import Flag


class FlagAdmin(WaffleFlagAdmin):
    fields = ("name", "superusers", "everyone", "authenticated", "users", "created", "modified", "note")


admin.site.register(Flag, FlagAdmin)
