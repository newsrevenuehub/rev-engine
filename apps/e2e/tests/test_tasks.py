import pytest


@pytest.mark.parametrize("result_return_code", [0, 1])
@pytest.mark.parametrize("raises_exception", [True, False])
@pytest.mark.parametrize("report_results", [True, False])
@pytest.mark.parametrize("commit_sha", ["1234", None])
def test_do_ci_e2e_flow_run(commit_sha, report_results, raises_exception, result_return_code, mocker):
    mocker.patch("apps.e2e.tasks.report_results_to_github")
