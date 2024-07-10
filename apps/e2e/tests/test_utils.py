from apps.e2e.utils import E2eTestRunner, load_module


def test_load_module(mocker):
    mocker.patch("importlib.util.spec_from_file_location")
    mocker.patch("importlib.util.module_from_spec")
    load_module("test_module", "test_module.py")


class TestE2eTestRunner:

    def test_when_module_path_not_exist(self, mocker):
        mocker.patch("apps.e2e.utils.Path.exists", return_value=False)
        runner = E2eTestRunner(name="test", commit_sha="123")
        assert runner.run() is None

    def test_when_test_fn_not_found(self):
        pass

    def test_happy_path(self):
        pass

    def test_when_exception_raised(self):
        pass
