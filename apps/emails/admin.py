from django.contrib import admin

from apps.common.admin import RevEngineBaseAdmin
from apps.emails.models import EmailCustomization


@admin.register(EmailCustomization)
class EmailCustomizationAdmin(RevEngineBaseAdmin):
    list_display = ("get_revenue_program_name", "email_type", "email_block")

    @admin.display(description="Revenue Program Name", ordering="revenue_program__name")
    def get_revenue_program_name(self, obj):
        return obj.revenue_program.name
