import pytest
import pytest_cases
from rest_framework.test import APIRequestFactory
from waffle import get_waffle_flag_model

from apps.api.exceptions import ApiConfigurationError
from apps.api.permissions import (
    HasFlaggedAccessToContributionsApiResource,
    HasFlaggedAccessToMailChimp,
)
from apps.common.constants import MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME
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

    def test_when_flag_not_found(self):
        Flag = get_waffle_flag_model()
        assert not Flag.objects.filter(name=MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME).exists()
        with pytest.raises(ApiConfigurationError):
            HasFlaggedAccessToMailChimp()

    def test__str__(self, default_feature_flags):
        assert (
            str(HasFlaggedAccessToMailChimp())
            == f"`HasFlaggedAccessToMailChimp` via {MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME}"
        )
