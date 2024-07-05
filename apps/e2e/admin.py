from functools import partial
from pathlib import Path

from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.forms import ModelForm
from django.urls import reverse
from django.utils.safestring import mark_safe

from rest_framework.serializers import ValidationError as DRFValidationError
from sorl.thumbnail.admin import AdminImageMixin

from apps.common.admin import RevEngineBaseAdmin
from apps.e2e.models import CommitStatus


@admin.register(CommitStatus)
class CommitStatusAdmin(RevEngineBaseAdmin):
    fields = "__all__"
    list_display = [
        "name",
        "commit_sha",
        "github_id",
        "id",
        "created",
        "modified",
    ]
    list_filter = [
        "name",
    ]
    readonly_fields = "__all__"
    search_fields = [
        "commit_sha",
    ]
