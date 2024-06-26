import datetime

import pytest

from apps.users.permissions import (
    UserHasAcceptedTermsOfService,
    UserIsAllowedToUpdate,
    UserOwnsUser,
    update_keys_dont_require_email_verification,
    user_email_is_verified,
)
from apps.users.tests.factories import UserFactory


@pytest.fixture()
def user():
    return UserFactory()


@pytest.mark.django_db()
class TestUserHasAcceptedTermsOfService:
    def test_has_permission_when_no_request_user(self, rf):
        request = rf.get("/")
        request.user = None
        permission = UserHasAcceptedTermsOfService()
        assert permission.has_permission(request, None) is False

    def test_has_permission_when_user_has_accepted_terms_of_service(self, user, rf):
        user.accepted_terms_of_service = datetime.datetime.now(datetime.timezone.utc)
        user.save()
        request = rf.get("/")
        request.user = user
        permission = UserHasAcceptedTermsOfService()
        assert permission.has_permission(request, None) is True

    def test_has_permission_when_user_has_not_accepted_terms_of_service(self, user, rf):
        assert user.accepted_terms_of_service is None
        request = rf.get("/")
        request.user = user
        permission = UserHasAcceptedTermsOfService()
        assert permission.has_permission(request, None) is False


@pytest.mark.parametrize(
    ("fn_1_ret_value", "fn_2_ret_value", "expect"),
    [
        (True, True, True),
        (True, False, True),
        (False, True, True),
        (False, False, False),
    ],
)
def testUserIsAllowedToUpdate(fn_1_ret_value, fn_2_ret_value, expect, mocker, rf):
    request = rf.get("/")
    mock_update_keys_dont_require_email_verification = mocker.patch(
        "apps.users.permissions.update_keys_dont_require_email_verification",
        return_value=fn_1_ret_value,
    )
    mock_user_email_is_verified = mocker.patch(
        "apps.users.permissions.user_email_is_verified",
        return_value=fn_2_ret_value,
    )
    assert UserIsAllowedToUpdate().has_permission(request, None) is expect
    mock_update_keys_dont_require_email_verification.assert_called_once_with(request)
    mock_user_email_is_verified.assert_called_once_with(request)


@pytest.mark.django_db()
class TestUserOwnsUser:
    @pytest.mark.parametrize("is_authenticated", [True, False])
    def test_has_permission_when_user_is_authenticated(self, is_authenticated, user, rf, mocker):
        request = rf.get("/")
        mocker.patch(
            "django.contrib.auth.models.AbstractBaseUser.is_authenticated",
            new_callable=mocker.PropertyMock,
            return_value=is_authenticated,
        )
        request.user = user
        permission = UserOwnsUser()
        assert permission.has_permission(request, None) is is_authenticated

    def test_has_permission_when_no_request_user(self, rf):
        request = rf.get("/")
        request.user = None
        permission = UserOwnsUser()
        assert permission.has_permission(request, None) is False

    def test_has_object_permission_when_user_is_owner(self, user, rf):
        request = rf.get("/")
        request.user = user
        permission = UserOwnsUser()
        assert permission.has_object_permission(request, None, user) is True

    def test_has_object_permission_when_user_is_not_owner(self, user, rf):
        request = rf.get("/")
        request.user = user
        permission = UserOwnsUser()
        assert permission.has_object_permission(request, None, UserFactory()) is False


@pytest.mark.parametrize(
    ("request_method", "request_data", "expected"),
    [
        ("patch", {"password": "password"}, True),
        ("patch", {"something": "else"}, False),
        ("post", {"password": "password"}, False),
        ("post", {"something": "else"}, False),
    ],
)
def test_update_keys_dont_require_email_verification(request_method, request_data, expected, rf):
    request = getattr(rf, request_method)("/")
    request.data = request_data
    assert update_keys_dont_require_email_verification(request) is expected


@pytest.fixture(params=[("user", True, True), ("user", False, False), (None, False, False)])
def user_email_is_verified_case(request):
    user = request.getfixturevalue(request.param[0]) if request.param[0] else None
    return user, request.param[1], request.param[2]


@pytest.mark.django_db()
def test_user_email_is_verified(rf, user_email_is_verified_case):
    user, email_verified, expect = user_email_is_verified_case
    request = rf.get("/")
    if user is not None:
        user.email_verified = email_verified
        user.save()
    request.user = user
    assert user_email_is_verified(request) is expect
