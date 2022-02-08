from django.contrib.admin import ModelAdmin, register
from django.db import models
from django.utils.html import format_html

from django_json_widget.widgets import JSONEditorWidget
from simple_history.admin import SimpleHistoryAdmin

from apps.common.models import RevEngineHistoricalChange


class RevEngineBaseAdmin(ModelAdmin):
    formfield_overrides = {
        models.JSONField: {"widget": JSONEditorWidget},
    }


class RevEngineSimpleHistoryAdmin(RevEngineBaseAdmin, SimpleHistoryAdmin):
    history_list_display = ["changes"]

    def changes(self, obj):
        """Return the changes for a particular historical record."""
        if obj.prev_record:
            delta = obj.diff_against(obj.prev_record)
            changes_list = []
            for change in delta.changes:
                field = obj._meta.get_field(change.field)
                field_verbose_name = field.verbose_name
                # Write the changed data to changes_list. If the field is a JSONField,
                # then just write the field name to changes_list, since the data
                # will be very long.
                if field.get_internal_type() in ["JSONField"]:
                    changes_list.append(f"'{field_verbose_name}' changed")
                else:
                    changes_list.append(f"'{field_verbose_name}' changed from '{change.old}' to '{change.new}'")
            return format_html(".<br><br>".join(changes_list))
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
