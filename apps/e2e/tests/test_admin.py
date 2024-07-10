from django.contrib.admin.sites import AdminSite

from apps.e2e.admin import CommitStatusAdmin
from apps.e2e.models import CommitStatus


class TestCommitStatusAdmin:
    def test_has_change_permission(self):
        admin = CommitStatusAdmin(model=CommitStatus, admin_site=AdminSite())
        assert admin.has_change_permission(None) is False
