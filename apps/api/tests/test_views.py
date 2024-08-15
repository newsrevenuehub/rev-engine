import datetime
import uuid
from time import time
from urllib.parse import parse_qs, quote_plus, urlparse
from zoneinfo import ZoneInfo

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.middleware import csrf
from django.test import override_settings

import dateutil.parser
import jwt
import pytest
from bs4 import BeautifulSoup as bs4
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.api.error_messages import GENERIC_BLANK
from apps.api.tests import RevEngineApiAbstractTestCase
from apps.api.tokens import LONG_TOKEN, ContributorRefreshToken
from apps.api.views import RequestContributorTokenEmailView, construct_rp_domain
from apps.contributions.models import Contributor
from apps.contributions.tests.factories import ContributorFactory
from apps.organizations.models import FreePlan, Organization, RevenueProgram
from apps.organizations.tests.factories import (
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
from apps.pages.tests.factories import DonationPageFactory, StyleFactory


user_model = get_user_model()


@pytest.fixture()
def slug():
    return "test-rp-slug"


@pytest.fixture()
def _host_map(settings, slug):
    settings.HOST_MAP = {"custom.example.com": slug}


class Test_construct_rp_domain:
    @pytest.mark.parametrize(
        ("expected", "site_url", "post", "header"),
        [
            (None, "https://example.com", "", ""),  # Not found.
            ("foo.example.com", "https://example.com", "foo", ""),
            (
                "foo.example.com",
                "https://example.com",
                "http://foo.example.com:80",
                "",
            ),  # Post full scheme://host works.
            ("foo.example.com", "https://subdomain.example.com", "foo", ""),  # site_url subdomain is stripped.
            ("foo.b.example.com", "https://subdomain.b.example.com", "foo", ""),  # Only leaf subdomain is stripped.
            ("foo.example.com:80", "https://example.com:80", "foo", ""),  # site_url port is preserved.
            (
                "foo.example.com",
                "https://example.com",
                "foo",
                "https://bar.example.com",
            ),  # Post first, header is fallback.
            ("foo.example.com", "https://example.com", "", "https://foo.bar.example.com:80"),  # From header.
            (None, "https://example.com", "", "https://example.com"),  # Header has no subdomain.
        ],
    )
    def test_construct_rp_domain(self, expected, site_url, post, header, settings):
        settings.SITE_URL = site_url
        assert construct_rp_domain(post, header) == expected

    @pytest.mark.usefixtures("_host_map")
    def test_construct_rp_domain_with_hostmap(self, slug, settings):
        settings.SITE_URL = "https://example.com"
        assert construct_rp_domain(slug, "") == "custom.example.com"

    @pytest.mark.usefixtures("_host_map")
    def test_construct_rp_domain_with_hostmap_but_no_map(self, settings):
        settings.SITE_URL = "https://example.com"
        assert construct_rp_domain("foo", "") == "foo.example.com"


KNOWN_PASSWORD = "myGreatAndSecurePassword7"


@pytest.fixture()
def org_user_with_pw(org_user_free_plan):
    org_user_free_plan.accepted_terms_of_service = datetime.datetime.now(tz=ZoneInfo("UTC"))
    org_user_free_plan.set_password(KNOWN_PASSWORD)
    org_user_free_plan.save()
    return org_user_free_plan


@pytest.fixture()
def hub_user_with_pw(hub_admin_user):
    hub_admin_user.set_password(KNOWN_PASSWORD)
    hub_admin_user.save()
    return hub_admin_user


@pytest.fixture()
def superuser_with_pw(superuser):
    superuser.set_password(KNOWN_PASSWORD)
    superuser.save()
    return superuser


@pytest.fixture()
def user_no_role_assignment_with_pw(user_no_role_assignment):
    user_no_role_assignment.set_password(KNOWN_PASSWORD)
    user_no_role_assignment.save()
    return user_no_role_assignment


@pytest.fixture()
def rp_user_with_pw(rp_user):
    rp_user.set_password(KNOWN_PASSWORD)
    rp_user.accepted_terms_of_service = datetime.datetime.now(tz=ZoneInfo("UTC"))
    rp_user.save()
    return rp_user


@pytest.fixture()
def many_orgs():
    return OrganizationFactory.create_batch(10)


@pytest.fixture()
def many_rps():
    return RevenueProgramFactory.create_batch(10)


@pytest.mark.django_db()
class TestTokenObtainPairCookieView:
    @pytest.fixture(
        params=[
            ("superuser_with_pw", "all"),
            ("hub_user_with_pw", "all"),
            ("org_user_with_pw", "one"),
            ("rp_user_with_pw", "one"),
            ("user_no_role_assignment_with_pw", "none"),
        ]
    )
    def post_case(self, request):
        return request.getfixturevalue(request.param[0]), request.param[1]

    def test_post_happy_path(self, post_case, many_orgs, many_rps, api_client):
        user, expected_orgs = post_case
        response = api_client.post(reverse("token-obtain-pair"), {"email": user.email, "password": KNOWN_PASSWORD})
        assert response.status_code == status.HTTP_200_OK

        assert set(response.json().keys()) == {"detail", "user", "csrftoken"}

        _user = response.json()["user"]

        assert set(_user.keys()) == {
            "email",
            "id",
            "organizations",
            "revenue_programs",
            "flags",
            "accepted_terms_of_service",
            "email_verified",
            "role_type",
        }

        orgs = _user["organizations"]
        rps = _user["revenue_programs"]

        match expected_orgs:
            case "all":
                assert {x["id"] for x in orgs} == set(Organization.objects.all().values_list("id", flat=True))
                assert {x["id"] for x in rps} == set(RevenueProgram.objects.all().values_list("id", flat=True))
            case "one":
                assert len(orgs) == 1
                assert orgs[0]["id"] == user.roleassignment.organization.id
                assert len(rps) == user.roleassignment.revenue_programs.count()
                assert {x["id"] for x in rps} == set(user.roleassignment.revenue_programs.values_list("id", flat=True))
            case "none":
                assert len(orgs) == 0
                assert len(rps) == 0

        assert len(_user["flags"]) == user.active_flags.count()
        assert {x["id"] for x in _user["flags"]} == set(user.active_flags.values_list("id", flat=True))

        assert _user["email"] == user.email
        assert _user["id"] == str(user.id)
        if user.accepted_terms_of_service:
            assert dateutil.parser.isoparse(_user["accepted_terms_of_service"]) == user.accepted_terms_of_service
        else:
            assert _user["accepted_terms_of_service"] is None
        assert _user["email_verified"] == user.email_verified
        role_type = user.role_type
        if role_type:
            assert _user["role_type"] == list(role_type)
        else:
            assert _user["role_type"] is None

        assert response.json()["csrftoken"]
        assert response.cookies[settings.CSRF_COOKIE_NAME]
        assert response.cookies["Authorization"]

    def test_post_when_invalid_password(self, org_user_with_pw, api_client):
        password = "different"
        assert password != KNOWN_PASSWORD
        response = api_client.post(
            reverse("token-obtain-pair"), {"email": org_user_with_pw.email, "password": password}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_post_when_token_error(self, org_user_with_pw, api_client, mocker):
        mocker.patch(
            "rest_framework_simplejwt.tokens.Token.__init__",
            side_effect=TokenError(msg := "ruh roh"),
        )
        response = api_client.post(
            reverse("token-obtain-pair"), {"email": org_user_with_pw.email, "password": KNOWN_PASSWORD}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json() == {"detail": msg, "code": "token_not_valid"}

    def test_delete(self, org_user_with_pw, api_client):
        api_client.force_authenticate(user=org_user_with_pw)
        response = api_client.delete(reverse("token-obtain-pair"))
        assert response.status_code == status.HTTP_200_OK
        assert response.cookies.get("Authorization")._value == ""


@pytest.fixture(params=["free_plan_revenue_program", "core_plan_revenue_program", "plus_plan_revenue_program"])
def revenue_program(request):
    return request.getfixturevalue(request.param)


@pytest.mark.parametrize(
    "next_url",
    [
        None,
        "",
        "https://example.com",
        "https://example.com/next",
        "https://example.com/next?foo=bar",
        "http://example.com/next?foo=bar",
        "//www.example.com/some/path",
        "//www.example.com/some/path?foo=bar",
    ],
)
def test_get_magic_link_invalid_next_url(next_url):
    domain = "mock-domain"
    token = "mock-token"
    email = "mock-email"
    magic_link = RequestContributorTokenEmailView.get_magic_link(
        domain=domain, token=token, email=email, next_url=next_url
    )
    assert magic_link == f"https://{domain}/{settings.CONTRIBUTOR_VERIFY_URL}?token={token}&email={email}"


@pytest.mark.parametrize(
    "next_url",
    [
        "/next-url",
        "/next-url/",
        "/next-url?foo=bar",
        "/next-url/?foo=bar",
        "/next-url/bla/?foo=bar",
    ],
)
def test_get_magic_link_valid_next_url(next_url):
    domain = "mock-domain"
    token = "mock-token"
    email = "mock-email"
    magic_link = RequestContributorTokenEmailView.get_magic_link(
        domain=domain, token=token, email=email, next_url=next_url
    )
    assert (
        magic_link
        == f"https://{domain}/{settings.CONTRIBUTOR_VERIFY_URL}?token={token}&email={email}&redirect={quote_plus(next_url)}"
    )


@pytest.mark.parametrize(
    "has_default_donation_page",
    [False, True],
)
@pytest.mark.django_db()
@override_settings(CELERY_ALWAYS_EAGER=True)
def test_magic_link_custom_email_template(rf, mocker, revenue_program, has_default_donation_page, client):
    email = "vanilla@email.com"

    """This test spans two requests, first requesting magic link, then using data in the magic link to verify contributor token

    Ultimately, it is the SPA's repsonsiblity to correctly handle the data provided in the magic link, but assuming it
    extracts the values for `email` and `token` that are provided in magic link, and posts them in data sent to
    the contributor-verify-token endpoint, this test proves that the resulting response will be a success and will contain
    a JWT with a future expiration for the requesting user.
    """
    from apps.emails import tasks as email_tasks

    spy = mocker.spy(email_tasks, "send_mail")

    if has_default_donation_page:
        style = StyleFactory()
        style.styles = style.styles | {
            "colors": {
                "cstm_mainHeader": "#mock-header-background",
                "cstm_CTAs": "#mock-button-color",
            },
            "font": {"heading": "mock-header-font", "body": "mock-body-font"},
        }
        style.save()
        page = DonationPageFactory(
            revenue_program=revenue_program, styles=style, header_logo="mock-logo", header_logo_alt_text="Mock-Alt-Text"
        )
        revenue_program.default_donation_page = page
        revenue_program.save()

    request = rf.post(
        "/",
        data={
            "email": email,
            "subdomain": revenue_program.slug,
        },
    )
    response = RequestContributorTokenEmailView.as_view()(request)
    assert response.status_code == 200
    assert spy.call_count == 1
    subject, text_body, _, to_email_list = spy.call_args_list[0][0]
    html_body = spy.call_args_list[0][1]["html_message"]
    html_magic_link = bs4(html_body, "html.parser").find("a", {"data-testid": "magic-link"}).attrs["href"]
    assert html_magic_link in text_body
    assert subject == "Manage your contributions"
    assert to_email_list[0] == email
    assert len(to_email_list) == 1

    default_logo = f"{settings.SITE_URL}/static/nre-logo-white.png"
    default_alt_text = "News Revenue Hub"
    custom_logo = 'src="/media/mock-logo"'
    custom_alt_text = 'alt="Mock-Alt-Text"'
    custom_header_background = "background: #mock-header-background !important"
    custom_button_background = "background: #mock-button-color !important"
    white_button_text = "color: #ffffff !important"

    if revenue_program.organization.plan.name == FreePlan.name or not has_default_donation_page:
        expect_present = (default_logo, default_alt_text)
        expect_missing = (
            custom_logo,
            custom_alt_text,
            custom_button_background,
            custom_header_background,
            white_button_text,
        )

    else:
        expect_present = (
            custom_logo,
            custom_alt_text,
            custom_header_background,
            custom_button_background,
            white_button_text,
        )
        expect_missing = (default_logo, default_alt_text)

    for x in expect_present:
        assert x in html_body
    for x in expect_missing:
        assert x not in html_body


@pytest.mark.parametrize(
    "email",
    ["vanilla@email.com", "vanilla+spice@email.com"],
)
@pytest.mark.django_db()
@override_settings(CELERY_ALWAYS_EAGER=True)
def test_request_contributor_token_creates_usable_magic_links(rf, mocker, email, client):
    """Test spans two requests, first requesting magic link, then using data in the magic link to verify contributor token.

    Ultimately, it is the SPA's repsonsiblity to correctly handle the data provided in the magic link, but assuming it
    extracts the values for `email` and `token` that are provided in magic link, and posts them in data sent to
    the contributor-verify-token endpoint, this test proves that the resulting response will be a success and will contain
    a JWT with a future expiration for the requesting user.
    """
    from apps.emails import tasks as email_tasks

    spy = mocker.spy(email_tasks, "send_mail")
    rp = RevenueProgramFactory()
    request = rf.post(
        "/",
        data={
            "email": email,
            "subdomain": rp.slug,
        },
    )
    response = RequestContributorTokenEmailView.as_view()(request)
    assert response.status_code == 200
    assert spy.call_count == 1
    subject, text_body, _, to_email_list = spy.call_args_list[0][0]
    html_body = spy.call_args_list[0][1]["html_message"]
    html_magic_link = bs4(html_body, "html.parser").find("a", {"data-testid": "magic-link"}).attrs["href"]
    assert html_magic_link in text_body
    assert subject == "Manage your contributions"
    assert to_email_list[0] == email
    assert len(to_email_list) == 1
    assert email in html_body
    params = parse_qs(urlparse(html_magic_link).query)
    response = client.post(
        reverse("contributor-verify-token"), {"email": params["email"][0], "token": params["token"][0]}
    )
    assert response.status_code == 200
    assert response.json()["contributor"]["email"] == email
    jwt_data = jwt.decode(response.cookies["Authorization"].value, settings.SECRET_KEY, algorithms="HS256")
    assert jwt_data["token_type"] == "access"
    assert jwt_data["ctx"] == LONG_TOKEN
    assert jwt_data["exp"] > jwt_data["iat"]
    assert jwt_data["exp"] > int(time())
    contributor = Contributor.objects.get(email=email)
    assert jwt_data["contrib_id"] == str(contributor.uuid)


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
        assert Contributor.objects.filter(email=target_email).count() == 0
        response = self.client.post(self.url, {"email": target_email, "subdomain": "rp"})
        # We don't want to indicate in any way whether or not an email is in the system.
        assert response.status_code == 200
        # this view creates a contributor if none exists
        assert Contributor.objects.filter(email=target_email).count() == 1

    def test_validation_when_email_is_invalid(self):
        response = self.client.post(self.url, {"email": "invalid_email"})
        assert response.status_code == 400
        assert str(response.data["email"][0]) == "Enter a valid email address."

    def test_validation_when_email_is_blank(self):
        response = self.client.post(self.url, {"email": ""})
        assert response.status_code == 400
        assert str(response.data["email"][0]) == GENERIC_BLANK

    def test_validation_when_no_subdomain(self):
        target_email = self.contributor.email
        response = self.client.post(self.url, {"email": target_email})
        assert response.data["detail"] == "Missing Revenue Program subdomain"

    def test_validation_with_subdomain_when_rp_not_in_db(self):
        target_email = self.contributor.email
        response = self.client.post(self.url, {"email": target_email, "subdomain": "norp"})
        assert response.status_code == 404

    @override_settings(CELERY_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPOGATES=True, BROKER_BACKEND="memory")
    def test_token_appears_in_outbound_email(self):
        target_email = self.contributor.email
        response = self.client.post(self.url, {"email": target_email, "subdomain": self.rp.slug})
        assert response.status_code == 200
        assert len(self.outbox) == 1
        magic_link = (
            bs4(self.outbox[0].alternatives[0][0], "html.parser").find("a", {"data-testid": "magic-link"}).attrs["href"]
        )
        assert settings.CONTRIBUTOR_VERIFY_URL in magic_link
        assert "token=" in magic_link
        # Assert that something looking like a valid token appears in token param
        token = (magic_link.split("token="))[1].split("&email=")[0]
        assert len(token.split(".")) == 3
        assert f"{target_email}" in self.outbox[0].to[0]

    @override_settings(CELERY_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPOGATES=True, BROKER_BACKEND="memory")
    def test_outbound_email_send_to_requested_address(self):
        target_email = self.contributor.email
        response = self.client.post(self.url, {"email": target_email, "subdomain": self.rp.slug})
        assert response.status_code == 200
        assert len(self.outbox[0].to) == 1
        assert self.outbox[0].to[0] == target_email


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

    @override_settings(CELERY_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPOGATES=True, BROKER_BACKEND="memory")
    def _get_valid_token(self):
        response = self.client.post(
            reverse("contributor-token-request"), {"email": self.contributor.email, "subdomain": self.rp.slug}
        )
        assert response.status_code == 200
        link = bs4(self.outbox[0].alternatives[0][0], "html.parser").find("a", {"data-testid": "magic-link"})
        return (link.attrs["href"].split("token="))[1].split("&email=")[0]

    def test_response_missing_params(self):
        response = self.client.post(self.url)
        assert response.status_code == 403
        assert str(response.data["detail"]) == "Invalid parameters"

    def test_response_when_no_token(self):
        response = self.client.post(self.url, {"email": self.contributor.email, "token": ""})
        assert response.status_code == 403
        assert str(response.data["detail"]) == "Invalid token"

    def test_response_when_short_token_invalid(self):
        response = self.client.post(self.url, {"email": self.contributor.email, "token": "token123"})
        assert response.status_code == 403
        assert str(response.data["detail"]) == "Invalid token"

    def test_response_when_token_type_invalid(self):
        # Generate parent token (refresh token) for contributor
        refresh = ContributorRefreshToken.for_contributor(self.contributor.uuid)
        # Generate long-lived token
        long_lived_token = str(refresh.long_lived_access_token)
        # Here, we expect a short-lived token
        response = self.client.post(self.url, {"email": self.contributor.email, "token": long_lived_token})
        assert response.status_code == 403
        assert str(response.data["detail"]) == "Invalid token type"

    def test_response_when_no_email(self):
        response = self.client.post(self.url, {"email": "", "token": self.valid_token})
        assert response.status_code == 403
        assert str(response.data["detail"]) == "Invalid token"

    def test_response_when_email_token_mismatch(self):
        response = self.client.post(self.url, {"email": "another_test@test.com", "token": self.valid_token})
        assert response.status_code == 403
        assert str(response.data["detail"]) == "Invalid token"

    def test_response_with_valid_token(self):
        response = self.client.post(self.url, {"email": self.contributor.email, "token": self.valid_token})
        assert response.status_code == 200
        assert "csrftoken" in response.data
        assert response.data["detail"] == "success"
        assert response.data["contributor"]["id"] == self.contributor.pk

    def test_response_sets_token_and_csrf_cookies(self):
        response = self.client.post(self.url, {"email": self.contributor.email, "token": self.valid_token})
        assert "Authorization" in response.client.cookies
        assert "csrftoken" in response.client.cookies

    def test_no_such_contributor(self):
        """Here we use a valid email, but the token points to a non-existent contributor."""
        random_uuid = uuid.uuid4()
        assert Contributor.objects.filter(uuid=random_uuid).first() is None

        refresh = ContributorRefreshToken.for_contributor(random_uuid)
        token = str(refresh.short_lived_access_token)
        response = self.client.post(self.url, {"email": self.contributor.email, "token": token})
        assert response.status_code == 403
        assert str(response.data["detail"]) == "Contributor not found"

    def test_response_when_using_noncontributor_token(self):
        """Ensure that token types, from regular users for instance, do not return a valid token from the magic link endpoint."""
        regular_user = user_model.objects.create_user(email="test@test.com", password="testing")
        token = str(AccessToken().for_user(regular_user))
        response = self.client.post(self.url, {"email": self.contributor.email, "token": token})
        assert response.status_code == 403
        assert str(response.data["detail"]) == "Invalid token"
        assert response.data["detail"].code == "missing_claim"


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

        self.client.cookies["csrftoken"] = csrf._get_new_csrf_string()
        return self.client.get(self.contributions_url, data={"rp": self.org1_rp1.slug})

    def test_contributor_request_when_token_valid(self):
        response = self._make_request()
        assert response.status_code == 200

    def test_contributor_request_when_token_missing(self):
        response = self._make_request(token_present=False)
        assert response.status_code == 401
        assert str(response.data["detail"]) == "Authentication credentials were not provided."

    def test_contributor_request_when_token_invalid(self):
        response = self._make_request(token_valid=False)
        assert response.status_code == 401
        assert str(response.data["detail"]) == "Given token not valid for any token type"

    def test_contributor_request_when_token_invalid_type(self):
        response = self._make_request(type_valid=False)
        assert response.status_code == 401
        assert str(response.data["detail"]) == "Authentication credentials were not provided."

    @override_settings(CONTRIBUTOR_LONG_TOKEN_LIFETIME=datetime.timedelta(seconds=0))
    def test_contributor_request_when_token_expired(self):
        response = self._make_request()
        assert response.status_code == 401
        assert str(response.data["detail"]) == "Given token not valid for any token type"
