from typing import Any

from django.contrib import admin
from django.db.models import Model
from django.http import HttpRequest
from django.urls import reverse
from django.utils.html import format_html
from django.utils.text import Truncator

from apps.activity_log.models import ActivityLog
from apps.common.admin import RevEngineBaseAdmin


@admin.register(ActivityLog)
class ActivityLogAdmin(RevEngineBaseAdmin):
    """Admin interface for ActivityLog model."""

    list_display = ("linked_actor_object", "action", "linked_object_object", "created")
    ordering = ("-created",)
    actions = None

    # Add a description text below the title
    def changelist_view(self, request: HttpRequest, extra_context: dict[Any, Any] | None = None):
        extra_context = extra_context or {}
        extra_context["title"] = "Activity logs"
        return super().changelist_view(request, extra_context)

    def has_change_permission(self, request: HttpRequest, obj: Model | None = None) -> bool:
        """Override to allow change permission for all users, setting to false.

        There's no need for a detail view on this model.
        """
        return False

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def _get_admin_url_for_linked_object(self, obj: Model) -> str:
        """Generate the admin URL for the linked object."""
        # Get the content type of the linked object
        # Get app label and model name from the object
        app_label = obj._meta.app_label
        model_name = obj._meta.model_name
        # Construct the URL pattern name
        url_name = f"admin:{app_label}_{model_name}_change"
        return reverse(url_name, args=[obj.pk])

    def linked_actor_object(self, obj: "ActivityLogAdmin") -> str:
        related_obj = obj.actor_content_object
        if related_obj:
            obj_text = Truncator(str(related_obj)).chars(70)
            url = self._get_admin_url_for_linked_object(related_obj)
            return format_html(f"<a href='{url}'>{obj_text}</a>")
        return "-"

    def linked_object_object(self, obj: "ActivityLogAdmin") -> str:
        related_obj = obj.activity_object_content_object
        if related_obj:
            obj_text = f"{related_obj.__class__.__name__} #{related_obj.pk}"
            url = self._get_admin_url_for_linked_object(related_obj)
            return format_html(f"<a href='{url}'>{obj_text}</a>")
        return "-"

    linked_actor_object.short_description = "Actor"
    linked_object_object.short_description = "Object"

    # activity_log | actor | object | created
    # method to generate actor link
    # method to generate activity_object link
    # method to generate
