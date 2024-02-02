from django.middleware import csrf

import pytest
import pytest_cases
from rest_framework.test import APIRequestFactory
from waffle import get_waffle_flag_model

from apps.api.exceptions import ApiConfigurationError
from apps.api.permissions import (
    DoubleSubmitCsrfPermission,
    HasFlaggedAccessToContributionsApiResource,
    HasFlaggedAccessToMailchimp,
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


CSRF_TOKEN_1 = csrf._get_new_csrf_token()
CSRF_TOKEN_2 = csrf._get_new_csrf_token()


class TestDoubleSubmitCsrfPermission:
    @pytest.mark.parametrize(
        "cookie_token, header_token, expected",
        (
            (CSRF_TOKEN_1, CSRF_TOKEN_1, True),
            (CSRF_TOKEN_1, CSRF_TOKEN_2, False),
            (CSRF_TOKEN_1, None, False),
            (CSRF_TOKEN_1, "", False),
            (CSRF_TOKEN_1, 0, False),
            (CSRF_TOKEN_1, None, False),
            (None, None, False),
            ("", "", False),
            (False, False, False),
            # etc. -- no need to be pedantic here
        ),
    )
    def test_has_permission(self, cookie_token, header_token, expected, settings):
        factory = APIRequestFactory()
        request = factory.get("/")
        request.COOKIES[settings.CSRF_COOKIE_NAME] = cookie_token
        request.META["HTTP_X_CSRFTOKEN"] = header_token

        assert DoubleSubmitCsrfPermission().has_permission(request, None) == expected
