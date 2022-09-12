import imp

from django.test import override_settings

import apps.api.urls


def test_enable_api_browser_branch():
    @override_settings(ENABLE_API_BROWSER=True)
    def debug_true():
        imp.reload(apps.api.urls)
        assert any("^swagger/$" in str(x.pattern) for x in apps.api.urls.urlpatterns)

    @override_settings(ENABLE_API_BROWSER=False)
    def debug_false():
        imp.reload(apps.api.urls)
        assert not any("^swagger/$" in str(x.pattern) for x in apps.api.urls.urlpatterns)

    imp.reload(apps.api.urls)  # Rerun module if statement without test settings.
