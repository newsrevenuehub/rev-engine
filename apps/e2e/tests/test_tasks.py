import pytest

from apps.e2e import TESTS
from apps.e2e.tasks import E2ETest, do_ci_e2e_flow_run, slightly_safer_subprocess_call


def test_E2ETest_when_unsupported_test():
    assert (test := "foobar") not in TESTS
    with pytest.raises(ValueError, match=f"Test {test} not found in available tests"):
        E2ETest(test)


@pytest.mark.parametrize("result_return_code", [0, 1])
@pytest.mark.parametrize("raises_exception", [True, False])
@pytest.mark.parametrize("report_results", [True, False])
@pytest.mark.parametrize("commit_sha", ["1234", None])
def test_do_ci_e2e_flow_run(commit_sha, report_results, raises_exception, result_return_code, mocker):
    mocker.patch("apps.e2e.tasks.report_results_to_github")
    mock_subprocess_call = mocker.patch("apps.e2e.tasks.slightly_safer_subprocess_call")
    if raises_exception:
        mock_subprocess_call.side_effect = Exception("foo")
    else:
        mock_subprocess_call.return_value.returncode = result_return_code
    if report_results and not commit_sha:
        with pytest.raises(ValueError, match="commit_sha must be provided when report_results is True"):
            do_ci_e2e_flow_run([TESTS.keys()[0]], commit_sha=commit_sha, report_results=report_results)
    else:
        results = do_ci_e2e_flow_run([TESTS.keys()[0]], commit_sha=commit_sha, report_results=report_results)
        assert results.keys() == [TESTS.keys()[0]]
        assert results[TESTS.keys()[0]] == result_return_code


class Test_slightly_safer_subprocess_call:
    def test_when_command_not_allowed(self):
        with pytest.raises(ValueError, match="Command foobar not allowed"):
            slightly_safer_subprocess_call("foobar", ["test"])

    def test_when_args_not_found_in_available_tests(self):
        with pytest.raises(ValueError, match="Arguments ['test'] not found in available tests"):
            slightly_safer_subprocess_call("pytest", ["test"])

    def test_when_command_not_found(self, mocker):
        mocker.patch("shutil.which", return_value=None)
        with pytest.raises(ValueError, match="Command pytest not found"):
            slightly_safer_subprocess_call("pytest", ["test"])

    def test_happy_path(self, mocker):
        pass
