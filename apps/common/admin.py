from django.contrib.admin import ModelAdmin, register
from django.db import models
from django.utils.html import format_html

from django_json_widget.widgets import JSONEditorWidget
from simple_history.admin import SimpleHistoryAdmin

from apps.common.models import RevEngineHistoricalChange
from apps.common.utils import get_changes_from_prev_history_obj


class RevEngineBaseAdmin(ModelAdmin):
    formfield_overrides = {
        models.JSONField: {"widget": JSONEditorWidget},
    }


class RevEngineSimpleHistoryAdmin(RevEngineBaseAdmin, SimpleHistoryAdmin):
    history_list_display = ["changes"]

    def changes(self, obj):
        """Show the changes for this object in relation to the previous history object."""
        changes_list = get_changes_from_prev_history_obj(obj)
        if obj.prev_record and changes_list:
            return format_html(".<br><br>".join(changes_list))
        elif obj.prev_record:
            return "No changes"
        else:
            return "No previous record"


@register(RevEngineHistoricalChange)
class RevEngineHistoricalChangeAdmin(RevEngineSimpleHistoryAdmin):
    list_display = ["object_link", "history_date", "history_type", "history_user", "changes"]
    list_display_links = None
    list_filter = ["history_type"]

    def changes(self, obj):
        return format_html(obj.changes_html)

    def object_link(self, obj):
        """Return HTML with a link to the object's history changelist view."""
        return format_html(f'<a href="{obj.get_object_history_admin_url()}">{obj.model} id {obj.object_id}</a>')
