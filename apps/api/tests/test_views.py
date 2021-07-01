import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.middleware import csrf
from django.test import RequestFactory, override_settings
from django.utils.timezone import timedelta

from rest_framework.reverse import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.api.tokens import ContributorRefreshToken
from apps.api.views import TokenObtainPairCookieView
from apps.contributions.models import Contributor
from apps.contributions.tests.factories import ContributorFactory


user_model = get_user_model()


class TokenObtainPairCookieViewTest(APITestCase):
    def setUp(self):
        self.url = reverse("token-obtain-pair")
        self.email = "test@test.com"
        self.password = "testing"
        self.user = user_model.objects.create_user(email=self.email, password=self.password)

    def test_post_valid_credentials_returns_user(self):
        response = self.client.post(self.url, {"email": self.email, "password": self.password})
        data = response.json()
        self.assertIn("user", data)
        self.assertEqual(self.email, data["user"]["email"])

    def test_post_valid_credentials_returns_csrf(self):
        response = self.client.post(self.url, {"email": self.email, "password": self.password})
        data = response.json()
        # csrf token should be in body
        self.assertIn(settings.CSRF_COOKIE_NAME, data)
        # csrf token should be in cookies
        self.assertIn(settings.CSRF_COOKIE_NAME, response.cookies)

    def test_post_valid_credentials_set_jwt_cookie(self):
        response = self.client.post(self.url, {"email": self.email, "password": self.password})
        self.assertIn("Authorization", response.cookies)

    def test_post_invalid_credentials_fails(self):
        response = self.client.post(self.url, {"email": self.email, "password": "wrong"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "No active account found with the given credentials")

    def test_delete_removes_auth_cookie(self):
        factory = RequestFactory(enforce_csrf_checks=True)
        self.request = factory.delete(self.url)
        self.request.COOKIES[settings.AUTH_COOKIE_KEY] = AccessToken().for_user(self.user)
        response = TokenObtainPairCookieView().delete(self.request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.cookies.get("Authorization")._value, "")


class RequestContributorTokenEmailViewTest(APITestCase):
    def setUp(self):
        self.contributor = ContributorFactory()
        self.url = reverse("contributor-token-request")
        self.outbox = mail.outbox

    def test_normal_response_when_valid_but_unrecognized_email(self):
        target_email = "testing123@testing123.com"
        # Verify that there are no contributors with target email
        self.assertEqual(Contributor.objects.filter(email=target_email).count(), 0)
        response = self.client.post(self.url, {"email": target_email})
        # We don't want to indicate in any way whether or not an email is in the system.
        self.assertEqual(response.status_code, 200)

    def test_validation_when_email_is_invalid(self):
        response = self.client.post(self.url, {"email": "invalid_email"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(str(response.data["email"][0]), "Enter a valid email address.")

    def test_validation_when_email_is_blank(self):
        response = self.client.post(self.url, {"email": ""})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(str(response.data["email"][0]), "This field may not be blank.")

    def test_token_appears_in_outbound_email(self):
        target_email = self.contributor.email
        response = self.client.post(self.url, {"email": target_email})
        self.assertEqual(response.status_code, 200)

        self.assertEqual(len(self.outbox), 1)
        self.assertIn(settings.CONTRIBUTOR_VERIFY_URL, self.outbox[0].body)
        self.assertIn("token=", self.outbox[0].body)
        # Assert that something looking like a valid token appears in token param
        token = (self.outbox[0].body.split("token="))[1].split("&email=")[0]
        self.assertEqual(len(token.split(".")), 3)
        self.assertIn(f"email={target_email}", self.outbox[0].body)

    def test_outbound_email_send_to_requested_address(self):
        target_email = self.contributor.email
        response = self.client.post(self.url, {"email": target_email})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(self.outbox[0].to), 1)
        self.assertEqual(self.outbox[0].to[0], target_email)


class VerifyContributorTokenViewTest(APITestCase):
    def setUp(self):
        self.contributor = ContributorFactory()
        self.url = reverse("contributor-verify-token")
        self.outbox = mail.outbox
        self.valid_token = self._get_valid_token()

    def _get_valid_token(self):
        response = self.client.post(reverse("contributor-token-request"), {"email": self.contributor.email})
        self.assertEqual(response.status_code, 200)

        email_body = self.outbox[0].body
        return (email_body.split("token="))[1].split("&email=")[0]

    def test_response_missing_params(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(str(response.data["detail"]), "Invalid parameters")

    def test_response_when_no_token(self):
        response = self.client.post(self.url, {"email": self.contributor.email, "token": ""})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(str(response.data["detail"]), "Invalid token")

    def test_response_when_short_token_invalid(self):
        response = self.client.post(self.url, {"email": self.contributor.email, "token": "token123"})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(str(response.data["detail"]), "Invalid token")

    def test_response_when_token_type_invalid(self):
        # Generate parent token (refresh token) for contributor
        refresh = ContributorRefreshToken.for_contributor(self.contributor.uuid)
        # Generate long-lived token
        long_lived_token = str(refresh.long_lived_access_token)
        # Here, we expect a short-lived token
        response = self.client.post(self.url, {"email": self.contributor.email, "token": long_lived_token})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(str(response.data["detail"]), "Invalid token type")

    def test_response_when_no_email(self):
        response = self.client.post(self.url, {"email": "", "token": self.valid_token})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(str(response.data["detail"]), "Invalid token")

    def test_response_when_email_token_mismatch(self):
        response = self.client.post(self.url, {"email": "another_test@test.com", "token": self.valid_token})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(str(response.data["detail"]), "Invalid token")

    def test_response_with_valid_token(self):
        response = self.client.post(self.url, {"email": self.contributor.email, "token": self.valid_token})
        self.assertEqual(response.status_code, 200)
        self.assertIn("csrftoken", response.data)
        self.assertEqual(response.data["detail"], "success")
        self.assertEqual(response.data["contributor"]["id"], self.contributor.pk)

    def test_response_sets_token_and_csrf_cookies(self):
        response = self.client.post(self.url, {"email": self.contributor.email, "token": self.valid_token})
        self.assertIn("Authorization", response.client.cookies)
        self.assertIn("csrftoken", response.client.cookies)

    def test_no_such_contributor(self):
        """
        Here we use a valid email, but the token points to a non-existent contributor
        """
        random_uuid = uuid.uuid4()
        self.assertIsNone(Contributor.objects.filter(uuid=random_uuid).first())

        refresh = ContributorRefreshToken.for_contributor(random_uuid)
        token = str(refresh.short_lived_access_token)
        response = self.client.post(self.url, {"email": self.contributor.email, "token": token})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(str(response.data["detail"]), "Contributor not found")

    def test_response_when_using_noncontributor_token(self):
        """
        Ensure that token types, from regular users for instance, do not return a valid token
        from the magic link endpoint
        """
        regular_user = user_model.objects.create_user(email="test@test.com", password="testing")
        token = str(AccessToken().for_user(regular_user))
        response = self.client.post(self.url, {"email": self.contributor.email, "token": token})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(str(response.data["detail"]), "Invalid token")
        self.assertEqual(response.data["detail"].code, "missing_claim")


class AuthorizedContributorRequestsTest(APITestCase):
    def setUp(self):
        self.contributor = ContributorFactory()
        self.contributions_url = reverse("contributions")

    def _get_token(self, valid=True):
        refresh = ContributorRefreshToken.for_contributor(self.contributor.uuid)
        if valid:
            return str(refresh.long_lived_access_token)
        return str(refresh.short_lived_access_token)

    def _make_request(self, token_present=True, type_valid=True, token_valid=True):
        if token_present:
            self.client.cookies["Authorization"] = (
                self._get_token(valid=type_valid) if token_valid else "not-valid-token"
            )

        self.client.cookies["csrftoken"] = csrf._get_new_csrf_token()
        return self.client.get(self.contributions_url)

    def test_contributor_request_when_token_valid(self):
        response = self._make_request()
        self.assertEqual(response.status_code, 200)

    def test_contributor_request_when_token_missing(self):
        response = self._make_request(token_present=False)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(str(response.data["detail"]), "Authentication credentials were not provided.")

    def test_contributor_request_when_token_invalid(self):
        response = self._make_request(token_valid=False)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(str(response.data["detail"]), "Given token not valid for any token type")

    def test_contributor_request_when_token_invalid_type(self):
        response = self._make_request(type_valid=False)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(str(response.data["detail"]), "Authentication credentials were not provided.")

    @override_settings(CONTRIBUTOR_LONG_TOKEN_LIFETIME=timedelta(seconds=0))
    def test_contributor_request_when_token_expired(self):
        response = self._make_request()
        self.assertEqual(response.status_code, 401)
        self.assertEqual(str(response.data["detail"]), "Given token not valid for any token type")
