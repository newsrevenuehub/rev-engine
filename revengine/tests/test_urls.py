import imp
import os
from unittest import mock

from django.test import override_settings

import revengine.urls


def test_debug_branch():
    @override_settings(DEBUG=True)
    def debug_true():
        imp.reload(revengine.urls)
        assert any("__debug__/" in str(x.pattern) for x in revengine.urls.urlpatterns)

    @override_settings(DEBUG=False)
    def debug_false():
        imp.reload(revengine.urls)
        assert not any("__debug__/" in str(x.pattern) for x in revengine.urls.urlpatterns)

    imp.reload(revengine.urls)  # Rerun module if statement without test settings.


def test_dummy500():
    # Urlpattern is not present if using deplpy settings.
    with mock.patch.dict(os.environ, {"DJANGO_SETTINGS_MODULE": "deploy"}):
        imp.reload(revengine.urls)  # Rerun module if statement with above setting.
        assert not any("dummy-500-error" in str(x.pattern) for x in revengine.urls.urlpatterns)

    # Urlpattern is not present if using deplpy settings.
    with mock.patch.dict(os.environ, {"DJANGO_SETTINGS_MODULE": "whatever"}):
        imp.reload(revengine.urls)  # Rerun module if statement with above setting.
        assert any("dummy-500-error" in str(x.pattern) for x in revengine.urls.urlpatterns)

    imp.reload(revengine.urls)  # Rerun module if statement without test settings.
