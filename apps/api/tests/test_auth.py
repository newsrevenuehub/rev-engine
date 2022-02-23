from django.conf import settings
from django.contrib.auth import get_user_model
from django.middleware import csrf
from django.test import RequestFactory

import jwt
from rest_framework.exceptions import PermissionDenied
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase, force_authenticate
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import AccessToken

from apps.api.authentication import JWTHttpOnlyCookieAuthentication
from apps.api.permissions import ContributorOwnsContribution, IsContributor
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory


user_model = get_user_model()


class JWTCookieAuthenticationTest(APITestCase):
    """
    JWTCookieAuthenticationTest authenticate method returns None if request is invalid
    """

    def setUp(self):
        factory = RequestFactory(enforce_csrf_checks=True)
        self.request = factory.post(reverse("donationpage-detail", kwargs={"pk": 1}))
        self.user = user_model.objects.create_user(email="test@test.com", password="testing")
        self.request.user = self.user
        self.request._dont_enforce_csrf_checks = False

        valid_token_obj = AccessToken().for_user(self.user)
        self.valid_jwt = jwt.encode(valid_token_obj.payload, settings.SECRET_KEY, algorithm="HS256")
        self.invalid_jwt = "notavalidhmac"
        self.csrf_token = csrf._get_new_csrf_token()

    def _add_jwt_to_cookie(self, valid=True):
        self.request.COOKIES[settings.AUTH_COOKIE_KEY] = self.valid_jwt if valid else self.invalid_jwt

    def _add_csrf_to_cookie(self, csrf_token=None):
        self.request.COOKIES[settings.CSRF_COOKIE_NAME] = csrf_token if csrf_token else self.csrf_token

    def _add_csrf_to_headers(self, csrf_token=None):
        self.request.META[settings.CSRF_HEADER_NAME] = csrf_token if csrf_token else self.csrf_token

    def test_request_with_valid_jwt_and_csrf_token_succeeds(self):
        self._add_jwt_to_cookie()
        self._add_csrf_to_cookie()
        self._add_csrf_to_headers()
        self.assertIsNotNone(JWTHttpOnlyCookieAuthentication().authenticate(self.request))

    def test_request_with_missing_jwt_but_valid_csrf_fails(self):
        self._add_csrf_to_cookie()
        self._add_csrf_to_headers()
        self.assertIsNone(JWTHttpOnlyCookieAuthentication().authenticate(self.request))

    def test_request_with_invalid_jwt_but_valid_csrf_fails(self):
        self._add_jwt_to_cookie(valid=False)
        self._add_csrf_to_cookie()
        self._add_csrf_to_headers()
        with self.assertRaises(InvalidToken):
            JWTHttpOnlyCookieAuthentication().authenticate(self.request)

    def test_request_with_valid_jwt_but_missing_csrf_fails(self):
        self._add_jwt_to_cookie()
        with self.assertRaises(PermissionDenied):
            JWTHttpOnlyCookieAuthentication().authenticate(self.request)

    def test_request_with_valid_jwt_but_no_header_csrf_fails(self):
        self._add_jwt_to_cookie()
        self._add_csrf_to_cookie()
        with self.assertRaises(PermissionDenied):
            JWTHttpOnlyCookieAuthentication().authenticate(self.request)

    def test_request_with_valid_jwt_but_no_cookie_csrf_fails(self):
        self._add_jwt_to_cookie()
        self._add_csrf_to_headers()
        with self.assertRaises(PermissionDenied):
            JWTHttpOnlyCookieAuthentication().authenticate(self.request)

    def test_request_with_valid_jwt_but_invalid_csrf_fails(self):
        invalid_csrf_token = "invalidtoken"
        self._add_jwt_to_cookie()
        self._add_csrf_to_cookie(csrf_token=invalid_csrf_token)
        self._add_csrf_to_headers(csrf_token=invalid_csrf_token)
        with self.assertRaises(PermissionDenied):
            JWTHttpOnlyCookieAuthentication().authenticate(self.request)

    def test_request_with_valid_jwt_but_mismatched_csrf_fails(self):
        self._add_jwt_to_cookie()
        self._add_csrf_to_cookie()
        self._add_csrf_to_headers(csrf_token="differenttoken")
        with self.assertRaises(PermissionDenied):
            JWTHttpOnlyCookieAuthentication().authenticate(self.request)


class IsContributorTest(APITestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.url = reverse("contributions-list")
        self.regular_user = user_model.objects.create_user(email="test@test.com", password="testing")
        self.contributor = ContributorFactory()
        self.permission = IsContributor()

    def _create_request(self, user):
        request = self.factory.post(self.url)
        request.user = user
        force_authenticate(request, user=user)
        return request

    def test_success_when_contributor(self):
        request = self._create_request(self.contributor)
        has_permission = self.permission.has_permission(request, {})
        self.assertTrue(has_permission)

    def test_failure_when_not_contributor(self):
        request = self._create_request(self.regular_user)
        has_permission = self.permission.has_permission(request, {})
        self.assertFalse(has_permission)


class ContributorOwnsContributionTest(APITestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = ContributorOwnsContribution()

        self.regular_user = user_model.objects.create_user(email="test@test.com", password="testing")
        self.right_contributor = ContributorFactory(email="right@test.com")
        self.wrong_contributor = ContributorFactory(email="wrong@test.com")

        self.contribution = ContributionFactory(contributor=self.right_contributor)
        self.url = reverse("contributions-cancel-recurring", kwargs={"pk": self.contribution.pk})

    def _create_request(self, user):
        request = self.factory.post(self.url)
        request.user = user
        force_authenticate(request, user=user)
        return request

    def test_success_when_contributor_owns_contribution(self):
        request = self._create_request(self.right_contributor)
        has_permission = self.permission.has_object_permission(request, {}, self.contribution)
        self.assertTrue(has_permission)

    def test_failure_when_contributor_does_not_own_contriubtion(self):
        request = self._create_request(self.wrong_contributor)
        has_permission = self.permission.has_object_permission(request, {}, self.contribution)
        self.assertFalse(has_permission)

    def test_success_when_not_a_contributor(self):
        """
        This permission does not prevent non-contributors from accessing resources.
        """
        request = self._create_request(self.regular_user)
        has_permission = self.permission.has_object_permission(request, {}, self.contribution)
        self.assertTrue(has_permission)
