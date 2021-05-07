from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import RequestFactory

from rest_framework.reverse import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.api.views import TokenObtainPairCookieView


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
