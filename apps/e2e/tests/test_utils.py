from io import BytesIO

import pytest

from apps.e2e.choices import CommitStatusState
from apps.e2e.utils import E2eOutcome, E2eTestRunner, load_module


def test_load_module(mocker):
    mocker.patch("importlib.util.spec_from_file_location")
    mocker.patch("importlib.util.module_from_spec")
    load_module("test_module", "test_module.py")


@pytest.mark.django_db()
class TestE2eTestRunner:

    @pytest.fixture()
    def image(self):
        from PIL import Image

        image = Image.new("RGB", (100, 100), color="red")
        img_byte_arr = BytesIO()
        image.save(img_byte_arr, format="PNG")
        return img_byte_arr.getvalue()

    @pytest.fixture()
    def outcome(self, image):
        return E2eOutcome(
            screenshot=image,
            state=CommitStatusState.SUCCESS,
            details="details",
        )

    def test_when_module_path_not_exist(self, mocker):
        mocker.patch("apps.e2e.utils.Path", return_value=mocker.MagicMock(exists=mocker.Mock(return_value=False)))
        assert E2eTestRunner(name="test", commit_sha="123").run() is None

    def test_when_test_fn_not_found(self, mocker):
        mocker.patch("apps.e2e.utils.Path", return_value=mocker.MagicMock(exists=mocker.Mock(return_value=True)))
        mocker.patch("apps.e2e.utils.inspect.getmembers", return_value=[])
        mocker.patch("apps.e2e.utils.load_module", return_value=mocker.MagicMock())
        assert E2eTestRunner(name="test", commit_sha="123").run() is None

    def test_happy_path(self, mocker, image, outcome):
        mocker.patch("apps.e2e.utils.Path", return_value=mocker.MagicMock(exists=mocker.Mock(return_value=True)))
        mocker.patch("apps.e2e.utils.load_module")
        mocker.patch(
            "apps.e2e.utils.inspect.getmembers",
            return_value=[
                ("test_e2e", lambda: outcome),
            ],
        )
        status = E2eTestRunner(name=(name := "my-test"), commit_sha=(sha := "123")).run()
        assert status.commit_sha == sha
        assert status.name == name
        assert status.details == outcome.details
        assert status.state == outcome.state
        assert status.screenshot

    def test_when_exception_raised(self, mocker):
        mocker.patch("apps.e2e.utils.Path", return_value=mocker.MagicMock(exists=mocker.Mock(return_value=True)))
        mocker.patch("apps.e2e.utils.load_module")

        class MyError(Exception):
            pass

        def my_func():
            raise MyError("error")

        mocker.patch(
            "apps.e2e.utils.inspect.getmembers",
            return_value=[("test_e2e", my_func)],
        )

        status = E2eTestRunner(name="my-test", commit_sha="123").run()
        assert status.state == CommitStatusState.FAILURE
