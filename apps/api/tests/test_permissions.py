import pytest
import pytest_cases
from rest_framework.test import APIRequestFactory

from apps.api.permissions import (
    HasFlaggedAccessToContributionsApiResource,
    HasFlaggedAccessToMailChimp,
)
from apps.common.tests.test_resources import AbstractTestCase


class TestHasFlaggedAccessToContributionsApiResource(AbstractTestCase):
    @pytest.mark.django_db
    def test_basic(self):
        self._set_up_default_feature_flags()
        t = HasFlaggedAccessToContributionsApiResource()
        assert isinstance(str(t), str)


@pytest.mark.django_db
class TestHasFlaggedAccessToMailChimp:
    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_when_flag_set_to_everyone(self, user, default_feature_flags):
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = user
        assert HasFlaggedAccessToMailChimp().has_permission(request, None) is True
