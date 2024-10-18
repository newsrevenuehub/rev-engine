from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django.urls import reverse

import pytest
from rest_framework.test import APIRequestFactory, force_authenticate
from waffle import get_waffle_flag_model

from apps.api.exceptions import ApiConfigurationError
from apps.api.permissions import (
    HasFlaggedAccessToContributionsApiResource,
    HasFlaggedAccessToMailchimp,
    IsContributor,
    IsSwitchboardAccount,
)
from apps.common.constants import MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME


user_model = get_user_model()


class TestHasFlaggedAccessToContributionsApiResource:
    @pytest.mark.django_db
    @pytest.mark.usefixtures("default_feature_flags")
    def test_basic(self):
        t = HasFlaggedAccessToContributionsApiResource()
        assert isinstance(str(t), str)


@pytest.mark.django_db
class TestHasFlaggedAccessToMailchimp:
    @pytest.mark.parametrize("user_fixture_name", ["superuser", "hub_admin_user", "org_user_free_plan", "rp_user"])
    @pytest.mark.usefixtures("default_feature_flags")
    def test_when_flag_set_to_everyone(self, user_fixture_name, request):
        factory = APIRequestFactory()
        test_request = factory.get("/")
        test_request.user = request.getfixturevalue(user_fixture_name)
        assert HasFlaggedAccessToMailchimp().has_permission(test_request, None) is True

    def test_when_flag_not_found(self):
        Flag = get_waffle_flag_model()
        assert not Flag.objects.filter(name=MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME).exists()
        with pytest.raises(ApiConfigurationError):
            HasFlaggedAccessToMailchimp()

    @pytest.mark.usefixtures("default_feature_flags")
    def test__str__(self):
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


@pytest.mark.django_db
class TestIsContributor:

    @pytest.fixture
    def request_with_not_contributor(self):
        factory = RequestFactory()
        request = factory.post(reverse("contribution-list"))
        request.user = user_model.objects.create_user(email="test@test.com", password="testing")
        force_authenticate(request, user=request.user)
        return request

    @pytest.fixture
    def request_with_contributor(self, contributor_user):
        factory = RequestFactory()
        request = factory.post(reverse("contribution-list"))
        request.user = contributor_user
        force_authenticate(request, user=contributor_user)
        return request

    @pytest.mark.parametrize(
        ("request_fixture_name", "expect"),
        [("request_with_contributor", True), ("request_with_not_contributor", False)],
    )
    def test_permission(self, request_fixture_name, expect, request):
        request_instance = request.getfixturevalue(request_fixture_name)
        assert IsContributor().has_permission(request_instance, {}) is expect
