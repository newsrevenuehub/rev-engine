from django.contrib import admin

from waffle.admin import FlagAdmin as WaffleFlagAdmin

from .models import Flag


class FlagAdmin(WaffleFlagAdmin):
    # raw_id_fields = tuple(list(WaffleFlagAdmin.raw_id_fields) + ['companies'])
    fields = (
        "name",
        "superusers",
        "created",
        "modified",
    )
    pass


admin.site.register(Flag, FlagAdmin)
