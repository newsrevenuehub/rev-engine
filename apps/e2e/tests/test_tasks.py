import pytest

from apps.e2e.models import CommitStatus
from apps.e2e.tasks import _report_results, do_ci_e2e_flow_run


@pytest.mark.parametrize("report_results", [True, False])
def test_do_ci_e2e_flow_run(report_results, mocker):
    reporter = mocker.patch("apps.e2e.tasks._report_results", return_value=mocker.Mock(github_id="123"))
    runner = mocker.patch("apps.e2e.tasks.E2eTestRunner")
    runner.return_value.run.return_value = (mock_commit_status := mocker.Mock())
    do_ci_e2e_flow_run(name=(name := "test"), commit_sha=(sha := "123"), report_results=report_results)
    runner.assert_called_once_with(name=name, commit_sha=sha)
    if report_results:
        reporter.assert_called_once_with(mock_commit_status)
        mock_commit_status.save.assert_called_once()


@pytest.mark.django_db()
def test__report_results(mocker, commit_status: CommitStatus, settings):
    settings.GITHUB_REPO = "repo"
    mock_get_github_client = mocker.patch("apps.e2e.tasks.get_github_client")
    mock_get_github_client.return_value.get_repo.return_value.get_commit.return_value.create_status.return_value = (
        gh_status := mocker.Mock()
    )
    assert _report_results(commit_status) == gh_status
