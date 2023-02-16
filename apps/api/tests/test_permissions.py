import pytest

from apps.api.permissions import HasFlaggedAccessToContributionsApiResource
from apps.common.tests.test_resources import AbstractTestCase


class TestHasFlaggedAccessToContributionsApiResource(AbstractTestCase):
    @pytest.mark.django_db
    def test_basic(self):
        self._set_up_default_feature_flags()
        t = HasFlaggedAccessToContributionsApiResource()
        assert isinstance(str(t), str)
