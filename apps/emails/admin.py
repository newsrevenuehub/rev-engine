from typing import Any

from django.contrib import admin
from django.http import HttpRequest

from apps.common.admin import RevEngineBaseAdmin
from apps.emails.models import EmailCustomization, TransactionalEmailRecord


@admin.register(EmailCustomization)
class EmailCustomizationAdmin(RevEngineBaseAdmin):
    list_display = ("get_revenue_program_name", "email_type", "email_block")

    @admin.display(description="Revenue Program Name", ordering="revenue_program__name")
    def get_revenue_program_name(self, obj: EmailCustomization) -> str:
        return obj.revenue_program.name


@admin.register(TransactionalEmailRecord)
class TransactionalEmailRecordAdmin(RevEngineBaseAdmin):
    list_display = (
        "id",
        "name",
        "sent_on",
        "contribution",
    )
    list_filter = ("name",)
    ordering = ("pk",)
    search_fields = ("contribution__contributor__email",)
    readonly_fields = ("contribution", "name", "sent_on")

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: Any | None = ...) -> bool:
        return False
