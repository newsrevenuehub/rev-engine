import imp
import os

import pytest

import revengine.urls


@pytest.mark.parametrize(
    "debug",
    [
        True,
        False,
    ],
)
def test_debug_branch(debug, settings):
    settings.DEBUG = debug
    imp.reload(revengine.urls)
    if debug:
        assert any("__debug__/" in str(x.pattern) for x in revengine.urls.urlpatterns)
    else:
        assert not any("__debug__/" in str(x.pattern) for x in revengine.urls.urlpatterns)


def test_dummy500(mocker):
    # Urlpattern is not present if using deplpy settings.
    mocker.patch.dict(os.environ, {"DJANGO_SETTINGS_MODULE": "deploy"})
    imp.reload(revengine.urls)  # Rerun module if statement with above setting.
    assert not any("dummy-500-error" in str(x.pattern) for x in revengine.urls.urlpatterns)
    # Urlpattern is not present if using deplpy settings.
    mocker.patch.dict(os.environ, {"DJANGO_SETTINGS_MODULE": "whatever"})
    imp.reload(revengine.urls)  # Rerun module if statement with above setting.
    assert any("dummy-500-error" in str(x.pattern) for x in revengine.urls.urlpatterns)
    imp.reload(revengine.urls)  # Rerun module if statement without test settings.
