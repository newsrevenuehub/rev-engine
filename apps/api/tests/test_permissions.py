from unittest import mock

import pytest

from apps.api.permissions import (
    ApiConfigurationError,
    HasDeletePrivilegesViaRole,
    HasFlaggedAccessToContributionsApiResource,
)
from apps.common.tests.test_resources import AbstractTestCase
from apps.pages.views import PageViewSet


class TestHasDeletePrivilegesViaRole:
    def test___init__config_error(self):
        class Newp:
            model = mock.Mock

        with pytest.raises(ApiConfigurationError):
            HasDeletePrivilegesViaRole(Newp)

    @pytest.mark.django_db
    def test_has_permission(self):
        # View really shouldn't be mocked, need to figure out what/how it's created.
        view = PageViewSet()
        view.kwargs = {"pk": 0}
        t = HasDeletePrivilegesViaRole(PageViewSet())
        request = None
        assert not t.has_permission(request, view)


class TestHasFlaggedAccessToContributionsApiResource(AbstractTestCase):
    @pytest.mark.django_db
    def test_basic(self):
        self._set_up_default_feature_flags()
        t = HasFlaggedAccessToContributionsApiResource()
        assert isinstance(str(t), str)
