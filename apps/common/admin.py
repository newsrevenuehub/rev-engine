import json

from django.contrib.admin import ModelAdmin
from django.db import models
from django.utils.safestring import mark_safe

from django_json_widget.widgets import JSONEditorWidget
from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import JsonLexer


class RevEngineBaseAdmin(ModelAdmin):
    formfield_overrides = {
        models.JSONField: {"widget": JSONEditorWidget},
    }


def prettify_json_field(raw_value, indent=2):  # pragma: no cover
    """Used to prettify read only json fields in model admin

    https://daniel.feldroy.com/posts/pretty-formatting-json-django-admin
    """
    response = json.dumps(raw_value, sort_keys=True, indent=indent)
    formatter = HtmlFormatter(style="default")
    response = highlight(response, JsonLexer(), formatter)
    style = "<style>" + formatter.get_style_defs() + "</style><br>"
    return mark_safe(style + response)
