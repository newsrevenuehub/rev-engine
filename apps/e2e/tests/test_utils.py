from io import BytesIO

import pytest
from PIL import Image

from apps.e2e.choices import CommitStatusState
from apps.e2e.utils import E2eTestRunner, load_module


def test_load_module(mocker):
    mocker.patch("importlib.util.spec_from_file_location")
    mocker.patch("importlib.util.module_from_spec")
    load_module("test_module", "test_module.py")


class TestE2eTestRunner:

    @pytest.fixture()
    def image(self):
        img = BytesIO()
        Image.new("RGB", (100, 100)).save(img, "JPEG")
        img.seek(0)
        return img

    def test_when_module_path_not_exist(self, mocker):
        mocker.patch("apps.e2e.utils.Path", return_value=mocker.MagicMock(exists=mocker.Mock(return_value=False)))
        assert E2eTestRunner(name="test", commit_sha="123").run() is None

    def test_when_test_fn_not_found(self, mocker):
        mocker.patch("apps.e2e.utils.Path", return_value=mocker.MagicMock(exists=mocker.Mock(return_value=True)))
        mocker.patch("apps.e2e.utils.inspect.getmembers", return_value=[])
        mocker.patch("apps.e2e.utils.load_module", return_value=mocker.MagicMock())
        assert E2eTestRunner(name="test", commit_sha="123").run() is None

    def test_happy_path(self, mocker, image):
        mocker.patch("apps.e2e.utils.Path", return_value=mocker.MagicMock(exists=mocker.Mock(return_value=True)))
        mocker.patch("apps.e2e.utils.inspect.getmembers", return_value=[("test_e2e", lambda: None)])
        mock_outcome = mocker.MagicMock(
            screenshot=image,
            state=(state := CommitStatusState.SUCCESS),
            details=(details := "details"),
        )
        mocker.patch("apps.e2e.utils.load_module", return_value={"test_e2e": mock_outcome})
        status = E2eTestRunner(name=(name := "test"), commit_sha=(sha := "123")).run()
        assert status.commmit_sha == sha
        assert status.name == name
        assert status.details == details
        assert status.state == state
        assert status.screenshot

    def test_when_exception_raised(self):
        pass
