import pytest
from rest_framework.test import APIRequestFactory
from waffle import get_waffle_flag_model

from apps.api.exceptions import ApiConfigurationError
from apps.api.permissions import (
    HasFlaggedAccessToContributionsApiResource,
    HasFlaggedAccessToMailchimp,
    IsSwitchboardAccount,
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
class TestHasFlaggedAccessToMailchimp:
    @pytest.fixture(params=["superuser", "hub_admin_user", "org_user_free_plan", "rp_user"])
    def test_when_flag_set_to_everyone(self, user, default_feature_flags):
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = user
        assert HasFlaggedAccessToMailchimp().has_permission(request, None) is True

    def test_when_flag_not_found(self):
        Flag = get_waffle_flag_model()
        assert not Flag.objects.filter(name=MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME).exists()
        with pytest.raises(ApiConfigurationError):
            HasFlaggedAccessToMailchimp()

    def test__str__(self, default_feature_flags):
        assert (
            str(HasFlaggedAccessToMailchimp())
            == f"`HasFlaggedAccessToMailchimp` via {MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME}"
        )


@pytest.mark.parametrize(
    ("is_authenticated", "email", "settings_email", "expected"),
    [
        (True, (email := "foo@bar.com"), email, True),
        (False, email, email, False),
        (True, email, "bizz@bang.com", False),
        (True, email, None, False),
        (True, None, None, False),
    ],
)
def test_IsSwitchboardAccount(is_authenticated, email, settings_email, expected, mocker, settings):
    request = mocker.MagicMock()
    request.user.is_authenticated = is_authenticated
    request.user.email = email
    settings.SWITCHBOARD_ACCOUNT_EMAIL = settings_email
    assert IsSwitchboardAccount().has_permission(request, None) is expected
