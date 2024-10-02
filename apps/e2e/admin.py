from django.contrib import admin

from apps.common.admin import RevEngineBaseAdmin
from apps.e2e.models import CommitStatus


@admin.register(CommitStatus)
class CommitStatusAdmin(RevEngineBaseAdmin):
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
    search_fields = [
        "commit_sha",
    ]

    def has_change_permission(self, request, obj=None):
        """Ensure read-only."""
        return False
