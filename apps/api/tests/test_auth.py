from django.conf import settings
from django.contrib.auth import get_user_model
from django.middleware import csrf
from django.test import RequestFactory

import jwt
import pytest
from rest_framework.exceptions import PermissionDenied
from rest_framework.reverse import reverse
from rest_framework_simplejwt.tokens import AccessToken

from apps.api.authentication import JWTHttpOnlyCookieAuthentication


user_model = get_user_model()


class TestJwtCookieAuthentication:
    """JWTCookieAuthenticationTest authenticate method returns None if request is invalid."""

    @pytest.fixture
    def user(self):
        return user_model.objects.create_user(email="test@test.com", password="testing")

    @pytest.fixture
    def auth_request(self, user):
        factory = RequestFactory(enforce_csrf_checks=True)
        request = factory.post(reverse("donationpage-detail", kwargs={"pk": 1}))
        request.user = user
        request._dont_enforce_csrf_checks = False
        return request

    @pytest.fixture
    def valid_access_token(self, user):
        return AccessToken().for_user(user)

    @pytest.fixture
    def valid_jwt(self, valid_access_token):
        return jwt.encode(valid_access_token.payload, settings.SECRET_KEY, algorithm="HS256")

    @pytest.fixture
    def invalid_jwt(self):
        return "notavalidhmac"

    @pytest.fixture
    def csrf_token(self):
        # This is an undocumented method, but we need some way of getting a token.
        return csrf._get_new_csrf_string()


class TestJWTCookieAuthentication:

    @pytest.fixture
    def valid_jwt(self):
        return jwt.encode({"email": ""}, settings.SECRET_KEY, algorithm="HS256")

    @pytest.fixture
    def valid_request(self, valid_jwt):
        factory = RequestFactory(enforce_csrf_checks=True)
        request = factory.post(reverse("donationpage-detail", kwargs={"pk": 1}))
        request.COOKIES[settings.AUTH_COOKIE_KEY] = valid_jwt
        request._dont_enforce_csrf_checks = False
        return request

    @pytest.fixture
    def invalid_for_missing_jwt(self):
        factory = RequestFactory(enforce_csrf_checks=True)
        request = factory.post(reverse("donationpage-detail", kwargs={"pk": 1}))
        request._dont_enforce_csrf_checks = False
        return request

    @pytest.fixture
    def invalid_for_invalid_jwt(self):
        factory = RequestFactory(enforce_csrf_checks=True)
        request = factory.post(reverse("donationpage-detail", kwargs={"pk": 1}))
        request.COOKIES[settings.AUTH_COOKIE_KEY] = "invalid"
        request._dont_enforce_csrf_checks = False
        return request

    @pytest.fixture
    def invalid_for_csrf_header(self):
        factory = RequestFactory(enforce_csrf_checks=True)
        request = factory.post(reverse("donationpage-detail", kwargs={"pk": 1}))
        request.COOKIES[settings.AUTH_COOKIE_KEY] = self.valid_jwt
        request._dont_enforce_csrf_checks = False
        return request

    @pytest.fixture
    def invalid_for_csrf_cookie(self):
        factory = RequestFactory(enforce_csrf_checks=True)
        request = factory.post(reverse("donationpage-detail", kwargs={"pk": 1}))
        request.COOKIES[settings.AUTH_COOKIE_KEY] = self.valid_jwt
        request._dont_enforce_csrf_checks = False
        return request

    # def _add_jwt_to_cookie(self, valid=True):
    #     self.request.COOKIES[settings.AUTH_COOKIE_KEY] = self.valid_jwt if valid else self.invalid_jwt

    # def _add_csrf_to_cookie(self, csrf_token=None):
    #     self.request.COOKIES[settings.CSRF_COOKIE_NAME] = csrf_token if csrf_token else self.csrf_token

    # def _add_csrf_to_headers(self, csrf_token=None):
    #     self.request.META[settings.CSRF_HEADER_NAME] = csrf_token if csrf_token else self.csrf_token

    @pytest.mark.parametrize(
        ("request_fixture_name", "expect"),
        [
            ("valid_request", True),
            ("invalid_for_missing_jwt", False),
            ("invalid_for_invalid_jwt", False),
            ("invalid_for_invalid_csrf_header", False),
            ("invalid_for_invalid_csrf_cookie", False),
            ("invalid_for_missing_csrf_header", False),
            ("invalid_for_missing_csrf_cookie", False),
            ("invalid_for_mismatched_csrf", False),
        ],
    )
    def test_authenticate(self, request_fixture_name, expect, request):

        if expect:
            assert (
                JWTHttpOnlyCookieAuthentication().authenticate(request.getfixturevalue(request_fixture_name))
                is not None
            )
        else:
            with pytest.raises(PermissionDenied):
                JWTHttpOnlyCookieAuthentication().authenticate(request.getfixturevalue(request_fixture_name))
