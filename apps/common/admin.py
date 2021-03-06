from django.contrib.admin import ModelAdmin
from django.db import models

from django_json_widget.widgets import JSONEditorWidget


class RevEngineBaseAdmin(ModelAdmin):
    formfield_overrides = {
        models.JSONField: {"widget": JSONEditorWidget},
    }
