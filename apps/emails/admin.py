from typing import Any

from django.contrib import admin
from django.http import HttpRequest

from apps.common.admin import RevEngineBaseAdmin
from apps.emails.models import TransactionalEmailRecord


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

    def get_readonly_fields(self, request: HttpRequest, obj: Any = None) -> list[str]:
        return [field.name for field in self.model._meta.fields]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False
