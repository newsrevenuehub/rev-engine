import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.middleware import csrf
from django.test import RequestFactory, override_settings
from django.utils.timezone import timedelta

import pytest
from bs4 import BeautifulSoup as bs4
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.api.error_messages import GENERIC_BLANK
from apps.api.tests import RevEngineApiAbstractTestCase
from apps.api.tokens import ContributorRefreshToken
from apps.api.views import TokenObtainPairCookieView, _construct_rp_domain
from apps.contributions.models import Contributor
from apps.contributions.tests.factories import ContributorFactory
from apps.organizations.tests.factories import (
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)


user_model = get_user_model()


@pytest.mark.parametrize(
    "expected, site_url, post, header",
    [
        (None, "https://example.com", "", ""),  # Not found.
        ("foo.example.com", "https://example.com", "foo", ""),
        ("foo.example.com", "https://example.com", "http://foo.example.com:80", ""),  # Post full scheme://host works.
        ("foo.example.com", "https://subdomain.example.com", "foo", ""),  # site_url subdomain is stripped.
        ("foo.b.example.com", "https://subdomain.b.example.com", "foo", ""),  # Only leaf subdomain is stripped.
        ("foo.example.com:80", "https://example.com:80", "foo", ""),  # site_url port is preserved.
        ("foo.example.com", "https://example.com", "foo", "https://bar.example.com"),  # Post first, header is fallback.
        ("foo.example.com", "https://example.com", "", "https://foo.bar.example.com:80"),  # From header.
        (None, "https://example.com", "", "https://example.com"),  # Header has no subdomain.
    ],
)
def test__construct_rp_domain(expected, site_url, post, header):
    with override_settings(SITE_URL=site_url):
        assert expected == _construct_rp_domain(post, header)


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


@override_settings(EMAIL_BACKEND="anymail.backends.test.EmailBackend")
class RequestContributorTokenEmailViewTest(APITestCase):
    def setUp(self):
        self.contributor = ContributorFactory()
        self.org = OrganizationFactory()
        self.payment_provider = PaymentProviderFactory()
        self.rp = RevenueProgramFactory(organization=self.org, payment_provider=self.payment_provider, slug="rp")
        self.url = reverse("contributor-token-request")
        self.outbox = mail.outbox

    def test_normal_response_when_valid_but_unrecognized_email(self):
        target_email = "testing123@testing123.com"
        # Verify that there are no contributors with target email
        self.assertEqual(Contributor.objects.filter(email=target_email).count(), 0)
        response = self.client.post(self.url, {"email": target_email, "subdomain": "rp"})
        # We don't want to indicate in any way whether or not an email is in the system.
        self.assertEqual(response.status_code, 200)
        # this view creates a contributor if none exists
        self.assertEqual(Contributor.objects.filter(email=target_email).count(), 1)

    def test_validation_when_email_is_invalid(self):
        response = self.client.post(self.url, {"email": "invalid_email"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(str(response.data["email"][0]), "Enter a valid email address.")

    def test_validation_when_email_is_blank(self):
        response = self.client.post(self.url, {"email": ""})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(str(response.data["email"][0]), GENERIC_BLANK)

    def test_validation_when_no_subdomain(self):
        target_email = self.contributor.email
        response = self.client.post(self.url, {"email": target_email})
        self.assertEqual(response.data["detail"], "Missing Revenue Program subdomain")

    def test_validation_with_subdomain_when_rp_not_in_db(self):
        target_email = self.contributor.email
        response = self.client.post(self.url, {"email": target_email, "subdomain": "norp"})
        self.assertEqual(response.status_code, 404)

    def test_token_appears_in_outbound_email(self):
        target_email = self.contributor.email
        response = self.client.post(self.url, {"email": target_email, "subdomain": self.rp.slug})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(self.outbox), 1)
        magic_link = (
            bs4(self.outbox[0].alternatives[0][0], "html.parser").find("a", {"data-testid": "magic-link"}).attrs["href"]
        )
        self.assertIn(settings.CONTRIBUTOR_VERIFY_URL, magic_link)
        self.assertIn("token=", magic_link)
        # Assert that something looking like a valid token appears in token param
        token = (magic_link.split("token="))[1].split("&email=")[0]
        self.assertEqual(len(token.split(".")), 3)
        self.assertIn(f"{target_email}", self.outbox[0].to[0])

    def test_outbound_email_send_to_requested_address(self):
        target_email = self.contributor.email
        response = self.client.post(self.url, {"email": target_email, "subdomain": self.rp.slug})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(self.outbox[0].to), 1)
        self.assertEqual(self.outbox[0].to[0], target_email)


@override_settings(EMAIL_BACKEND="anymail.backends.test.EmailBackend")
class VerifyContributorTokenViewTest(APITestCase):
    def setUp(self):
        self.contributor = ContributorFactory()
        self.org = OrganizationFactory()
        self.payment_provider = PaymentProviderFactory()
        self.rp = RevenueProgramFactory(organization=self.org, payment_provider=self.payment_provider, slug="rp")

        self.url = reverse("contributor-verify-token")
        self.outbox = mail.outbox
        self.valid_token = self._get_valid_token()

    def _get_valid_token(self):
        response = self.client.post(
            reverse("contributor-token-request"), {"email": self.contributor.email, "subdomain": self.rp.slug}
        )
        self.assertEqual(response.status_code, 200)
        link = bs4(self.outbox[0].alternatives[0][0], "html.parser").find("a", {"data-testid": "magic-link"})
        return (link.attrs["href"].split("token="))[1].split("&email=")[0]

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


class AuthorizedContributorRequestsTest(RevEngineApiAbstractTestCase):
    def setUp(self):
        # NB: among other things, this call ensures that required feature flags are in place for
        # the endpoint tested
        self.set_up_domain_model()
        self.contributions_url = reverse("contribution-list")

    def _get_token(self, valid=True):
        refresh = ContributorRefreshToken.for_contributor(self.contributor_user.uuid)
        if valid:
            return str(refresh.long_lived_access_token)
        return str(refresh.short_lived_access_token)

    def _make_request(self, token_present=True, type_valid=True, token_valid=True):
        if token_present:
            self.client.cookies["Authorization"] = (
                self._get_token(valid=type_valid) if token_valid else "not-valid-token"
            )

        self.client.cookies["csrftoken"] = csrf._get_new_csrf_token()
        return self.client.get(self.contributions_url, data={"rp": self.org1_rp1.slug})

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
