import logging
from typing import Any

from django.conf import settings
from django.contrib import admin
from django.db.models import Model
from django.http import HttpRequest
from django.urls import NoReverseMatch, reverse
from django.utils.html import format_html
from django.utils.text import Truncator

from apps.activity_log.models import ActivityLog


LINKED_OBJECT_CLASSNAME = "activity-log-linked-object"
LINKED_ACTOR_CLASSNAME = "activity-log-linked-actor"


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    """Admin interface for ActivityLog model.

    This modeladmin only provides a list view, without the ability to add, delete, or change activity logs.

    The actor and object fields in list view link back to the underlying object model admin, if any.
    """

    list_display = ("linked_actor_object", "action", "linked_object_object", "get_on")
    actions = None

    def changelist_view(self, request: HttpRequest, extra_context: dict[Any, Any] | None = None):
        extra_context = extra_context or {}
        extra_context["title"] = "Activity logs"
        return super().changelist_view(request, extra_context)

    def has_change_permission(self, request: HttpRequest, obj: Model | None = None) -> bool:
        """Override change permission for all users, setting to false.

        There's no need for a detail view on this model.
        """
        return False

    def has_add_permission(self, request: HttpRequest) -> bool:
        """Override add permission for all users, setting to false.

        We don't want arbitrary activity logs to be added from admin.
        """
        return False

    def _get_admin_url_for_linked_object(self, obj: Model) -> str | None:
        """Generate the admin URL for the linked object."""
        app_label = obj._meta.app_label
        model_name = obj._meta.model_name
        url_name = f"admin:{app_label}_{model_name}_change"
        try:
            return reverse(url_name, args=[obj.pk])
        except NoReverseMatch:
            logger.info(
                "No reverse match for url name `%s` detail view for %s with pk %s",
                url_name,
                model_name,
                obj.pk,
            )
            return None

    def linked_actor_object(self, obj: "ActivityLogAdmin") -> str:
        related_obj = obj.actor_content_object
        if related_obj:
            obj_text = Truncator(str(related_obj)).chars(70)
            url = self._get_admin_url_for_linked_object(related_obj)
            if url:
                return format_html(f"<a href='{url}' class='{LINKED_ACTOR_CLASSNAME}'>{obj_text}</a>")
        return "-"

    def linked_object_object(self, obj: "ActivityLogAdmin") -> str:
        related_obj = obj.activity_object_content_object
        obj_text = f"{related_obj.__class__.__name__} #{related_obj.pk}"
        url = self._get_admin_url_for_linked_object(related_obj)
        if url:
            return format_html(f"<a href='{url}' class='{LINKED_OBJECT_CLASSNAME}'>{obj_text}</a>")
        return "-"

    linked_actor_object.short_description = "Actor"
    linked_object_object.short_description = "Object"

    def get_on(self, obj: "ActivityLogAdmin") -> str:
        """Return the created date of the activity log."""
        return obj.created.strftime("%Y-%m-%d at %H:%M")

    get_on.short_description = "On"
    get_on.admin_order_field = "-created"
