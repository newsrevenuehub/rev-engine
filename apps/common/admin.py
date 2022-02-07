from django.contrib.admin import ModelAdmin
from django.db import models

from django_json_widget.widgets import JSONEditorWidget
from simple_history.admin import SimpleHistoryAdmin


class RevEngineBaseAdmin(ModelAdmin):
    formfield_overrides = {
        models.JSONField: {"widget": JSONEditorWidget},
    }


class RevEngineSimpleHistoryAdmin(RevEngineBaseAdmin, SimpleHistoryAdmin):
    pass
