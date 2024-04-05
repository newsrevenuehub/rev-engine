import json

from django.contrib.admin import ModelAdmin
from django.contrib.admin import register as register_admin
from django.db import models
from django.utils.safestring import mark_safe

from django_json_widget.widgets import JSONEditorWidget
from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import JsonLexer
from reversion.admin import VersionAdmin
from reversion.models import Revision, Version
from reversion_compare.admin import CompareVersionAdmin


class RevEngineBaseAdmin(CompareVersionAdmin, VersionAdmin):
    formfield_overrides = {
        models.JSONField: {"widget": JSONEditorWidget},
    }


# there is an issue with django-reversion-compare package, hence manually adding the admin interface by setting ADD_REVERSION_ADMIN to False
# find issue details here https://github.com/jedie/django-reversion-compare/issues/185
@register_admin(Revision)
class RevisionAdmin(ModelAdmin):
    list_display = ("id", "date_created", "user", "comment")
    list_display_links = ("date_created",)
    list_select_related = ("user",)
    date_hierarchy = "date_created"
    ordering = ("-date_created",)
    list_filter = ("user", "comment")
    search_fields = ("user__email", "comment")
    raw_id_fields = ("user",)


@register_admin(Version)
class VersionAdmin(ModelAdmin):
    def comment(self, obj):
        return obj.revision.comment

    list_display = ("object_repr", "comment", "object_id", "content_type", "format")
    list_display_links = ("object_repr", "object_id")
    list_filter = ("content_type", "format")
    list_select_related = ("revision", "content_type")
    search_fields = ("object_repr", "serialized_data")
    raw_id_fields = ("revision", "content_type")


def prettify_json_field(raw_value, indent=2):  # pragma: no cover
    """Used to prettify read only json fields in model admin

    https://daniel.feldroy.com/posts/pretty-formatting-json-django-admin
    """
    response = json.dumps(raw_value, sort_keys=True, indent=indent)
    formatter = HtmlFormatter(style="default")
    response = highlight(response, JsonLexer(), formatter)
    style = "<style>" + formatter.get_style_defs() + "</style><br>"
    return mark_safe(style + response)
