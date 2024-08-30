from django.core.management import call_command

import pytest

from apps.e2e.models import CommitStatus


@pytest.mark.django_db
class Test_trigger_e2e_check:

    def test_happy_path(self, commit_status: CommitStatus, mocker):
        mock_run_task = mocker.patch("apps.e2e.tasks.do_ci_e2e_flow_run")
        call_command(
            "trigger_e2e_check",
            commit_sha=commit_status.commit_sha,
            module=commit_status.name,
        )
        mock_run_task.assert_called_once_with(
            name=commit_status.name,
            report_results=False,
            commit_sha=commit_status.commit_sha,
        )
