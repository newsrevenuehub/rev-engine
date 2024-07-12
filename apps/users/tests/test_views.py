import json
import re
import time
from unittest.mock import patch
from urllib.parse import urlparse

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.exceptions import ValidationError as DjangoValidationError
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify

import pytest
from bs4 import BeautifulSoup
from django_rest_passwordreset.models import ResetPasswordToken
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.serializers import ValidationError as DRFValidationError

from apps.contributions.bad_actor import BadActorAPIError
from apps.organizations.models import FiscalStatusChoices
from apps.organizations.tests.factories import OrganizationFactory
from apps.users.choices import Roles
from apps.users.constants import (
    BAD_ACTOR_CLIENT_FACING_VALIDATION_MESSAGE,
    EMAIL_VERIFICATION_EMAIL_SUBJECT,
    INVALID_TOKEN,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    PASSWORD_UNEXPECTED_VALIDATION_MESSAGE_SUBSTITUTE,
    PASSWORD_VALIDATION_EXPECTED_MESSAGES,
)
from apps.users.permissions import (
    UserHasAcceptedTermsOfService,
    UserIsAllowedToUpdate,
    UserOwnsUser,
)
from apps.users.serializers import AuthedUserSerializer
from apps.users.tests.factories import create_test_user
from apps.users.views import AccountVerification, UserViewset


@pytest.fixture()
def valid_customize_account_request_data():
    return {
        "first_name": "Test",
        "last_name": "User",
        "organization_name": "Test Organization",
        "organization_tax_id": "123456789",
        "job_title": "Test Title",
        "fiscal_status": FiscalStatusChoices.FOR_PROFIT,
    }


class MockResponseObject:
    def __init__(self, json_data, status_code=200):
        self.status_code = status_code
        self.json_data = json_data

    def json(self):
        return self.json_data


@pytest.fixture()
def valid_create_request_data(valid_password, valid_email, faker):
    return {
        "email": valid_email,
        "password": valid_password,
        "accepted_terms_of_service": timezone.now(),
    }


@pytest.fixture()
def valid_email():
    return "foo@bar.com"


@pytest.fixture()
def password_too_long(faker):
    return faker.password(length=PASSWORD_MAX_LENGTH + 1)


@pytest.fixture()
def password_too_short(faker):
    return faker.password(length=PASSWORD_MIN_LENGTH - 1)


@pytest.fixture()
def password_too_common():
    return "passWord!"


@pytest.fixture()
def password_too_similar_to_email(valid_email):
    return valid_email


@pytest.fixture()
def password_is_numeric():
    return "19283746501234568686"


@pytest.fixture()
def valid_password(faker):
    return faker.password(length=PASSWORD_MIN_LENGTH + 1)


@pytest.fixture(
    params=[
        "user_with_verified_email_and_tos_accepted",
    ]
)
def user(request):
    return request.getfixturevalue(request.param)


@pytest.fixture()
def create_data_invalid_for_email(valid_create_request_data, valid_password):
    existing = create_test_user(email="bizz@bang.com", password=valid_password, email_verified=True)
    return valid_create_request_data | {"email": existing.email}


@pytest.fixture(
    params=[
        "password_too_long",
        "password_too_short",
        "password_too_common",
        "password_too_similar_to_email",
        "password_is_numeric",
    ]
)
def create_data_invalid_for_password(request, valid_create_request_data):
    return valid_create_request_data | {"password": request.getfixturevalue(request.param)}


@pytest.fixture()
def create_data_invalid_tos_empty(valid_create_request_data):
    return valid_create_request_data | {"accepted_terms_of_service": ""}


@pytest.fixture()
def create_data_invalid_tos_missing(valid_create_request_data):
    return {k: v for k, v in valid_create_request_data.items() if k != "accepted_terms_of_service"}


@pytest.fixture(params=["create_data_invalid_tos_empty", "create_data_invalid_tos_missing"])
def create_data_invalid_for_tos(request):
    return request.getfixturevalue(request.param)


@pytest.fixture()
def create_data_invalid_no_email_field(valid_create_request_data):
    return {k: v for k, v in valid_create_request_data.items() if k != "email"}


@pytest.fixture()
def create_data_invalid_email_random_string(valid_create_request_data):
    return valid_create_request_data | {"email": "cats"}


@pytest.fixture()
def create_data_invalid_empty_string(valid_create_request_data):
    return valid_create_request_data | {"email": ""}


@pytest.fixture()
def create_data_invalid_email_case_insensitive_same(valid_create_request_data):
    create_test_user(email=(email := valid_create_request_data["email"].lower()))
    return valid_create_request_data | {"email": email.upper()}


@pytest.fixture(
    params=[
        "create_data_invalid_no_email_field",
        "create_data_invalid_empty_string",
        "create_data_invalid_email_random_string",
        "create_data_invalid_email_case_insensitive_same",
    ]
)
def invalid_create_data_for_email(request):
    return request.getfixturevalue(request.param)


@pytest.fixture()
def valid_update_data(faker):
    return {
        "email": faker.email(),
        "password": faker.password(),
    }


@pytest.fixture(
    params=[
        "password_too_long",
        "password_too_short",
        "password_too_common",
        "password_too_similar_to_email",
        "password_is_numeric",
    ]
)
def invalid_update_data_for_password(request):
    return {"password": request.getfixturevalue(request.param)}


@pytest.fixture()
def invalid_email_already_taken(faker):
    email = faker.email()
    create_test_user(email=email, email_verified=True)
    return {"email": email}


@pytest.fixture()
def invalid_email_none():
    return {"email": None}


@pytest.fixture()
def invalid_email_random_string():
    return {"email": "cats"}


@pytest.fixture(
    params=[
        "invalid_email_already_taken",
        "invalid_email_random_string",
    ]
)
def invalid_update_data_for_email(request):
    return request.getfixturevalue(request.param)


@pytest.fixture()
def org_user(org_user_free_plan, valid_password):
    org_user_free_plan.email_verified = True
    org_user_free_plan.accepted_terms_of_service = timezone.now()
    org_user_free_plan.set_password(valid_password)
    org_user_free_plan.save()
    return org_user_free_plan


@pytest.fixture()
def staff_user(hub_admin_user, valid_password):
    hub_admin_user.is_staff = True
    hub_admin_user.email_verified = True
    hub_admin_user.accepted_terms_of_service = timezone.now()
    hub_admin_user.set_password(valid_password)
    hub_admin_user.save()
    return hub_admin_user


@pytest.fixture(params=["org_user", "staff_user"])
def custom_password_reset_view_user(request):
    return request.getfixturevalue(request.param)


@pytest.mark.django_db()
class TestAccountVerificationClass:
    @pytest.mark.django_db()
    def test_validation_happy_path(self):
        user = create_test_user(is_active=True, email_verified=False)
        t = AccountVerification()
        t.max_age = None
        email, token = t.generate_token(user.email)
        assert user == t.validate(email, token)

    @pytest.mark.django_db()
    def test_validation_happy_path_with_expiry(self):
        user = create_test_user(is_active=True, email_verified=False)
        t = AccountVerification()
        t.max_age = 100
        encoded_email, token = t.generate_token(user.email)
        assert user == t.validate(encoded_email, token)

    @pytest.mark.django_db()
    def test_inactive_validation(self):
        user = create_test_user(is_active=False)
        t = AccountVerification()
        t.max_age = None
        encoded_email, token = t.generate_token(user.email)
        assert not t.validate(encoded_email, token)
        assert t.fail_reason == "inactive"

    @pytest.mark.django_db()
    def test_unknown_validation(self):
        t = AccountVerification()
        t.max_age = None
        encoded_email, token = t.generate_token("somenonexistentemail")
        assert not t.validate(encoded_email, token)
        assert t.fail_reason == "unknown"

    @pytest.mark.parametrize(
        ("expected", "encoded_email", "encoded_token"),
        [
            ("Malformed", "", ""),
            ("Malformed", "what", "ever"),
            ("Malformed", AccountVerification.encode(""), AccountVerification.encode("")),
            ("Invalid", AccountVerification.encode("what"), AccountVerification.encode("evar")),
            (
                "Invalid",
                AccountVerification().generate_token("miss")[0],
                AccountVerification().generate_token("match")[1],
            ),
        ],
    )
    @patch("apps.users.views.logger.info")
    def test_failed_validation(self, info, expected, encoded_email, encoded_token):
        t = AccountVerification()
        t.max_age = None
        assert not t.validate(encoded_email, encoded_token)
        assert t.fail_reason == "failed"
        assert expected in info.call_args.args[0]

    @patch("apps.users.views.logger.warning")
    def test_expired_link(self, warning):
        t = AccountVerification()
        t.max_age = 0.1  # Gotta be quick!
        encoded_email, token = t.generate_token("bobjohnny@example.com")
        time.sleep(0.1)  # Lame, but I'll pay .1s to not mock.
        assert not t.validate(encoded_email, token)
        assert t.fail_reason == "expired"
        assert "Expired" in warning.call_args.args[0]

    @patch("apps.users.views.logger.info")
    def test_signature_fail(self, warning):
        t = AccountVerification()
        t.max_age = 100
        encoded_email, _ = t.generate_token("bobjohnny@example.com")
        token = t.encode("garbage")
        assert not t.validate(encoded_email, token)
        assert t.fail_reason == "failed"
        assert "Bad Signature" in warning.call_args.args[0]

    @pytest.mark.parametrize(
        "plaintext",
        [
            "oatmeal@example.com",
            "unsafe@:/=?$#%^",
            "   ",
            None,
            1,
        ],
    )
    def test_encoding_decoding(self, plaintext):
        t = AccountVerification()
        encoded = t.encode(plaintext)
        decoded = t.decode(encoded)
        assert str(plaintext) != encoded
        assert str(plaintext) == decoded
        # Ensure encoded string contains only RFC-3986 URL Safe characters plus equalsign, "=". Because base64 lib uses
        # equalsigns inviolation of RFC.
        assert re.match(r"^[=a-zA-Z0-9._~-]*$", encoded)


@pytest.mark.django_db()
@pytest.mark.parametrize("is_valid", [True, False])
def test_account_verification(is_valid, api_client, mocker, valid_email):
    """For testing apps.users.views.account_verification, not to be confused with.

    apps.users.views.AccountVerification or apps.users.UserViewSet.request_account_verification
    """
    mocker.patch("apps.users.views.AccountVerification.validate", return_value=is_valid)
    encoded_email, token = AccountVerification().generate_token("bobjohnny@example.com")

    user = create_test_user(email=valid_email, email_verified=False)
    mock_verifier = mocker.Mock()
    mock_verifier.validate.return_value = False if not is_valid else user
    mock_verifier.fail_reason = "some-reason"
    mocker.patch("apps.users.views.AccountVerification", return_value=mock_verifier)
    response = api_client.get(reverse("account_verification", args=(encoded_email, token)))
    assert response.status_code == status.HTTP_302_FOUND
    if is_valid:
        assert response.url == reverse("spa_account_verification")
        user.refresh_from_db()
        assert user.email_verified is True
    else:
        assert response.url == reverse("spa_account_verification_fail", args=(mock_verifier.fail_reason,))


@pytest.mark.django_db()
class TestCustomPasswordResetView:
    def test_password_reset_email(self, settings, custom_password_reset_view_user, client):
        """When org admin trigger p/w reset via custom org admin password reset.

        The email is with p/w reset instructions contains link to custom org admin pw reset flow.
        """
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        settings.CELERY_ALWAYS_EAGER = True
        assert len(mail.outbox) == 0
        client.post(reverse("orgadmin_password_reset"), {"email": custom_password_reset_view_user.email})
        assert len(mail.outbox) == 1
        uidb64, token = mail.outbox[0].body.split("reset/")[1].split("/")[0:2]
        url = (
            "password_reset_confirm" if custom_password_reset_view_user.is_staff else "orgadmin_password_reset_confirm"
        )
        expect = reverse(url, kwargs={"uidb64": uidb64, "token": token})
        assert expect in mail.outbox[0].body


@pytest.mark.django_db()
class TestCustomPasswordResetConfirm:
    def test_happy_path(self, org_user, client, valid_password, settings):
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        client.post(reverse("orgadmin_password_reset"), {"email": org_user.email}, follow=True)
        uidb64, token = mail.outbox[0].body.split("reset/")[1].split("/")[0:2]
        data = {
            "new_password1": valid_password,
            "new_password2": valid_password,
        }
        response = client.post(
            reverse("orgadmin_password_reset_confirm", kwargs={"uidb64": uidb64, "token": token}), follow=True
        )
        assert response.status_code == 200
        response = client.post(response.request["PATH_INFO"], data, follow=True)
        assert response.status_code == 200
        assert response.client.cookies["Authorization"].value == INVALID_TOKEN
        assert response.request["PATH_INFO"] == reverse("orgadmin_password_reset_complete")
        org_user.refresh_from_db()
        assert org_user.check_password(valid_password)


@pytest.mark.django_db()
class TestAPIRequestPasswordResetEmail:
    def test_happy_path(self, org_user, api_client, settings):
        """Show that we get a 200, and that email containing link with reset token gets sent."""
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        assert len(mail.outbox) == 0
        response = api_client.post(reverse("password_reset:reset-password-request"), {"email": org_user.email})
        assert response.status_code == status.HTTP_200_OK
        assert len(mail.outbox) == 1
        token = ResetPasswordToken.objects.get(user=org_user)
        # we get the html version of the email
        link = BeautifulSoup(mail.outbox[0].alternatives[0][0], "html.parser").a
        assert link is not None
        assert token.key in link.attrs["href"]

    def test_when_user_not_exist(self, api_client):
        """Show that when no user with email, still get 200, but no email sent."""
        email = "yo@yo.com"
        assert not get_user_model().objects.filter(email=email).exists()
        response = api_client.post(reverse("password_reset:reset-password-request"), {"email": email})
        assert response.status_code == status.HTTP_200_OK
        assert len(mail.outbox) == 0


@pytest.mark.django_db()
class TestUserViewSet:
    @pytest.fixture(autouse=True)
    def _setup_and_teardown(self, settings):
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        settings.CELERY_ALWAYS_EAGER = True
        return

    def test_send_verification_email(self, org_user_free_plan, mocker):
        org_user_free_plan.email_verified = False
        org_user_free_plan.save()
        assert len(mail.outbox) == 0
        viewset = UserViewset()

        mock_request = mocker.Mock()
        mock_request.build_absolute_uri.return_value = "http://example.com"
        viewset.request = mock_request
        assert viewset.send_verification_email(org_user_free_plan) is None

        assert len(mail.outbox) == 1
        assert mail.outbox[0].to[0] == org_user_free_plan.email
        assert mail.outbox[0].subject == EMAIL_VERIFICATION_EMAIL_SUBJECT
        assert mock_request.build_absolute_uri.return_value in mail.outbox[0].body

    @pytest.mark.parametrize(
        ("action", "expected_permissions"),
        [
            ("list", [IsAuthenticated]),
            ("create", [AllowAny]),
            (
                "partial_update",
                [
                    UserOwnsUser,
                    UserIsAllowedToUpdate,
                ],
            ),
            (
                "customize_account",
                [UserOwnsUser, IsAuthenticated, UserIsAllowedToUpdate, UserHasAcceptedTermsOfService],
            ),
            ("request_account_verification", [IsAuthenticated]),
        ],
    )
    def test_has_expected_permissions(self, action, expected_permissions):
        viewset = UserViewset()
        viewset.action = action
        actual_permissions = viewset.get_permissions()
        for i, permission in enumerate(actual_permissions):
            assert isinstance(permission, expected_permissions[i])

    def test_list(self, hub_admin_user, api_client):
        api_client.force_authenticate(hub_admin_user)
        response = api_client.get(reverse("user-list"))
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == json.loads(json.dumps(AuthedUserSerializer(hub_admin_user).data))

    def test_list_when_unauthenticated(self, api_client):
        response = api_client.get(reverse("user-list"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_customize_account_happy_path_when_org_with_name_not_exist(
        self,
        user_with_verified_email_and_tos_accepted,
        api_client,
        valid_customize_account_request_data,
    ):
        api_client.force_authenticate(user_with_verified_email_and_tos_accepted)
        response = api_client.patch(
            reverse("user-customize-account", args=(user_with_verified_email_and_tos_accepted.pk,)),
            data=valid_customize_account_request_data,
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        user_with_verified_email_and_tos_accepted.refresh_from_db()
        for x in ["first_name", "last_name", "job_title"]:
            assert getattr(user_with_verified_email_and_tos_accepted, x) == valid_customize_account_request_data[x]
        assert (
            user_with_verified_email_and_tos_accepted.first_name == valid_customize_account_request_data["first_name"]
        )
        ra = user_with_verified_email_and_tos_accepted.roleassignment
        org = ra.organization
        rp = org.revenueprogram_set.first()
        assert org.name == valid_customize_account_request_data["organization_name"]
        assert org.slug == slugify(valid_customize_account_request_data["organization_name"])
        assert rp.payment_provider is not None
        assert rp.name == org.name
        assert rp.organization == org
        assert rp.slug == slugify(org.name)
        assert rp.fiscal_status == valid_customize_account_request_data["fiscal_status"]
        assert rp.fiscal_sponsor_name == valid_customize_account_request_data.get("fiscal_sponsor_name")
        assert rp.tax_id == valid_customize_account_request_data["organization_tax_id"]
        assert ra.user == user_with_verified_email_and_tos_accepted
        assert ra.role_type == Roles.ORG_ADMIN
        assert ra.organization == org
        assert ra.revenue_programs.count() == 1
        assert ra.revenue_programs.first() == rp

    def test_customize_account_happy_path_when_org_with_name_already_exists(
        self,
        user_with_verified_email_and_tos_accepted,
        api_client,
        valid_customize_account_request_data,
    ):
        OrganizationFactory(name=valid_customize_account_request_data["organization_name"])
        api_client.force_authenticate(user_with_verified_email_and_tos_accepted)
        expected_name = f"{valid_customize_account_request_data['organization_name']}-1"
        response = api_client.patch(
            reverse("user-customize-account", args=(user_with_verified_email_and_tos_accepted.pk,)),
            data=valid_customize_account_request_data,
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        user_with_verified_email_and_tos_accepted.refresh_from_db()
        ra = user_with_verified_email_and_tos_accepted.roleassignment
        org = ra.organization
        rp = org.revenueprogram_set.first()
        assert org.name == expected_name
        assert org.slug == slugify(expected_name)
        assert rp.name == expected_name
        assert rp.slug == slugify(expected_name)
        assert ra.revenue_programs.count() == 1
        assert ra.revenue_programs.first() == rp

    def test_customize_account_when_serializer_errors(
        self,
        user_with_verified_email_and_tos_accepted,
        api_client,
        valid_customize_account_request_data,
    ):
        api_client.force_authenticate(user_with_verified_email_and_tos_accepted)
        data = valid_customize_account_request_data.copy()
        del data["organization_name"]
        response = api_client.patch(
            reverse("user-customize-account", args=(user_with_verified_email_and_tos_accepted.pk,)),
            data=data,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "organization_name" in response.json()

    def test_customize_account_permissions(self):
        """Test that customize account permissions uses expected permissions.

        This allows us to unit test the permissions separately and not have to test via API layer, which is much slower.
        """
        view = UserViewset()
        view.action = "customize_account"
        permissions = view.get_permissions()
        assert isinstance(permissions[0], UserOwnsUser)
        assert isinstance(permissions[1], IsAuthenticated)
        assert isinstance(permissions[2], UserIsAllowedToUpdate)
        assert isinstance(permissions[3], UserHasAcceptedTermsOfService)

    def test_customize_account_when_missing_required_fields(
        self, user_with_verified_email_and_tos_accepted, api_client
    ):
        api_client.force_authenticate(user_with_verified_email_and_tos_accepted)
        response = api_client.patch(
            reverse("user-customize-account", args=(user_with_verified_email_and_tos_accepted.pk,)),
            data={},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        for x in ["fiscal_status", "first_name", "last_name", "organization_name"]:
            assert response.json()[x] == ["This field is required."]

    def test_customize_account_when_tos_not_accepted(self, api_client, user_no_role_assignment):
        assert not user_no_role_assignment.accepted_terms_of_service
        api_client.force_authenticate(user_no_role_assignment)
        response = api_client.patch(reverse("user-customize-account", args=(user_no_role_assignment.pk,)), data={})
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json() == {"detail": UserHasAcceptedTermsOfService.message}

    def test_customize_account_when_email_unverified(self, api_client, user_no_role_assignment):
        assert not user_no_role_assignment.email_verified
        user_no_role_assignment.accepted_terms_of_service = timezone.now()
        user_no_role_assignment.save()
        api_client.force_authenticate(user_no_role_assignment)
        response = api_client.patch(
            reverse("user-customize-account", args=(user_no_role_assignment.pk,)), data={"organization_name": "foo"}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json() == {"detail": UserIsAllowedToUpdate.message}

    def test_customize_account_when_conflicting_org_name(
        self, organization, api_client, user_with_verified_email_and_tos_accepted
    ):
        api_client.force_authenticate(user_with_verified_email_and_tos_accepted)
        data = {
            "first_name": "Test",
            "last_name": "User",
            "organization_name": organization.name,
            "organization_tax_id": "123456789",
            "job_title": "Test Title",
            "fiscal_status": FiscalStatusChoices.FOR_PROFIT,
        }
        response = api_client.patch(
            reverse("user-customize-account", args=(user_with_verified_email_and_tos_accepted.pk,)),
            data=data,
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        user_with_verified_email_and_tos_accepted.refresh_from_db()
        assert user_with_verified_email_and_tos_accepted.roleassignment.organization.name == f"{organization.name}-1"

    def test_create_happy_path(self, mocker, api_client, valid_create_request_data):
        mock_bad_actor_request = mocker.patch(
            "apps.users.views.make_bad_actor_request", return_value=MockResponseObject({"overall_judgment": 0})
        )
        mock_send_verification_email = mocker.patch("apps.users.views.UserViewset.send_verification_email")
        user_count = (User := get_user_model()).objects.count()
        response = api_client.post(reverse("user-list"), data=valid_create_request_data)
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.count() == user_count + 1
        result = response.json()
        user = User.objects.get(id=result["id"])
        assert user.is_active
        assert user.email_verified is False
        assert user.email == result["email"] == valid_create_request_data["email"]
        assert user.check_password(valid_create_request_data["password"])
        assert user.accepted_terms_of_service == valid_create_request_data["accepted_terms_of_service"]
        assert not result["email_verified"]
        assert not result["flags"]
        assert not result["organizations"]
        assert not result["revenue_programs"]
        assert result["role_type"] is None

        mock_send_verification_email.assert_called_once_with(user)

        mock_bad_actor_request.assert_called_once()

    def test_create_when_invalid_data_for_email(self, invalid_create_data_for_email, api_client):
        response = api_client.post(reverse("user-list"), data=invalid_create_data_for_email)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.json()

    def test_create_when_invalid_data_for_password(self, create_data_invalid_for_password, api_client):
        response = api_client.post(reverse("user-list"), data=create_data_invalid_for_password)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.json()

    def test_create_when_invalid_data_for_tos(self, create_data_invalid_for_tos, api_client):
        response = api_client.post(reverse("user-list"), data=create_data_invalid_for_tos)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "accepted_terms_of_service" in response.json()

    def test_create_when_bad_actor_threshold_met(self, mocker, api_client, valid_create_request_data):
        mocker.patch(
            "apps.users.views.make_bad_actor_request",
            return_value=MockResponseObject({"overall_judgment": settings.BAD_ACTOR_REJECT_SCORE_FOR_ORG_USERS}),
        )
        response = api_client.post(reverse("user-list"), data=valid_create_request_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == [BAD_ACTOR_CLIENT_FACING_VALIDATION_MESSAGE]

    def test_create_when_bad_actor_api_not_configured(self, mocker, api_client, valid_create_request_data, settings):
        settings.BAD_ACTOR_API_KEY = None
        settings.BAD_ACTOR_API_URL = None
        response = api_client.post(reverse("user-list"), data=valid_create_request_data)
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_when_bad_actor_request_has_error(self, mocker, api_client, valid_create_request_data):
        logger_spy = mocker.patch("apps.users.views.logger.warning")
        mocker.patch("apps.contributions.bad_actor.make_bad_actor_request", side_effect=BadActorAPIError("error"))
        response = api_client.post(reverse("user-list"), data=valid_create_request_data)
        assert response.status_code == status.HTTP_201_CREATED
        logger_spy.assert_called_once_with("Something went wrong with BadActorAPI", exc_info=True)

    def test_update_happy_path(self, org_user_free_plan, api_client, valid_update_data):
        org_user_free_plan.email_verified = True
        org_user_free_plan.accepted_terms_of_service = timezone.now()
        org_user_free_plan.save()
        api_client.force_authenticate(user=org_user_free_plan)
        response = api_client.patch(reverse("user-detail", args=(org_user_free_plan.pk,)), data=valid_update_data)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["email"] == valid_update_data["email"]
        org_user_free_plan.refresh_from_db()
        assert org_user_free_plan.email == valid_update_data["email"]
        assert org_user_free_plan.check_password(valid_update_data["password"])
        assert org_user_free_plan.email_verified is False

    def test_cant_update_accepted_terms_of_service(self, api_client, hub_admin_user):
        hub_admin_user.email_verified = True
        hub_admin_user.accepted_terms_of_service = (old_tos := timezone.now())
        hub_admin_user.save()
        api_client.force_authenticate(user=hub_admin_user)
        response = api_client.patch(
            reverse("user-detail", args=(hub_admin_user.pk,)), data={"accepted_terms_of_service": timezone.now()}
        )
        assert response.status_code == status.HTTP_200_OK
        hub_admin_user.refresh_from_db()
        assert hub_admin_user.accepted_terms_of_service == old_tos

    def test_update_when_invalid_data_for_password(
        self, api_client, org_user_free_plan, invalid_update_data_for_password, valid_email
    ):
        org_user_free_plan.email = valid_email
        org_user_free_plan.email_verified = True
        org_user_free_plan.accepted_terms_of_service = timezone.now()
        org_user_free_plan.save()
        api_client.force_authenticate(user=org_user_free_plan)
        response = api_client.patch(
            reverse("user-detail", args=(org_user_free_plan.pk,)), data=invalid_update_data_for_password
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.json()

    def test_update_when_invalid_data_for_email(self, api_client, org_user_free_plan, invalid_update_data_for_email):
        org_user_free_plan.email_verified = True
        org_user_free_plan.accepted_terms_of_service = timezone.now()
        org_user_free_plan.save()
        api_client.force_authenticate(user=org_user_free_plan)
        response = api_client.patch(
            reverse("user-detail", args=(org_user_free_plan.pk,)),
            data=invalid_update_data_for_email,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.json()

    def test_update_when_not_my_user(self, user, api_client, faker):
        another_user = create_test_user(email=faker.email(), email_verified=True)
        api_client.force_authenticate(user=user)
        response = api_client.patch(reverse("user-detail", args=(another_user.pk,)), data={"email": user.email})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_if_email_unverified(self, user, api_client, faker):
        user.email_verified = False
        user.save()
        api_client.force_authenticate(user=user)
        response = api_client.patch(reverse("user-detail", args=(user.pk,)), data={"email": faker.email()})
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json() == {"detail": UserIsAllowedToUpdate.message}

    def test_can_update_password_when_email_not_verified(self, org_user_free_plan, api_client, faker):
        org_user_free_plan.email_verified = False
        org_user_free_plan.save()
        api_client.force_authenticate(user=org_user_free_plan)
        response = api_client.patch(
            reverse("user-detail", args=(org_user_free_plan.pk,)), data={"password": (password := faker.password())}
        )
        assert response.status_code == status.HTTP_200_OK
        org_user_free_plan.refresh_from_db()
        assert org_user_free_plan.check_password(password)

    def test_request_account_verification_happy_path(self, api_client, mocker):
        mock_send_verification_email = mocker.patch("apps.users.views.UserViewset.send_verification_email")
        user = create_test_user(email_verified=False)
        api_client.force_authenticate(user=user)
        response = api_client.get(reverse("user-request-account-verification"))
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"detail": "Success"}
        mock_send_verification_email.assert_called_once_with(user)

    def test_request_account_verification_when_already_verified(self, api_client):
        user = create_test_user(email_verified=True)
        api_client.force_authenticate(user=user)
        response = api_client.get(reverse("user-request-account-verification"))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Account already verified"}

    def test_request_account_verification_when_user_inactive(self, api_client):
        user = create_test_user(email_verified=False, is_active=False)
        api_client.force_authenticate(user=user)
        response = api_client.get(reverse("user-request-account-verification"))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Account inactive"}

    def test_request_account_verification_when_unauthed(self, api_client):
        response = api_client.get(reverse("user-request-account-verification"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.parametrize(
        ("initial_message", "expected_message"),
        (
            [(x, x) for x in PASSWORD_VALIDATION_EXPECTED_MESSAGES]
            + [("uh-oh", PASSWORD_UNEXPECTED_VALIDATION_MESSAGE_SUBSTITUTE)]
        ),
    )
    def test_validate_password_sanitizes_some_errors(
        self,
        initial_message,
        expected_message,
        mocker,
        valid_email,
        valid_password,
    ):
        mocker.patch(
            "apps.users.views.validate_password",
            side_effect=DjangoValidationError(initial_message),
        )
        with pytest.raises(DRFValidationError, match=expected_message):
            UserViewset().validate_password(valid_email, valid_password)


@pytest.mark.django_db()
class TestAccountVerificationFlow:
    """Test is meant to span the full user flow.

    From GET request to .request_account_verification, to sent verification email, to clicking link in email, to GET
    request to .verify_account.
    """

    @pytest.fixture(autouse=True)
    def _setup_and_teardown(self, settings):
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        settings.CELERY_ALWAYS_EAGER = True
        return

    def test_happy_path(self, api_client):
        user = create_test_user(email_verified=False)
        api_client.force_authenticate(user=user)
        # Request verification email.
        response = api_client.get(reverse("user-request-account-verification"))
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"detail": "Success"}
        # Email sent.
        assert len(mail.outbox) == 1
        email = mail.outbox[0]
        assert user.email in email.to
        # no curly braces in email body, which may be evidence of template string not being rendered.
        assert not any(x in email.body for x in "{}")
        # Email includes logo url
        logo_url = BeautifulSoup(email.alternatives[0][0], "html.parser").img.attrs["src"]
        assert logo_url == f"{settings.SITE_URL}/static/nre_logo_black_yellow.png"
        # Email includes valid link, Bug DEV-2340.
        verification_link = BeautifulSoup(email.alternatives[0][0], "html.parser").a.attrs["href"]
        parsed = urlparse(verification_link)
        email, _ = parsed.path.rstrip("/").split("/")[-2:]  # Are last two elements of path.
        # Go to link in email.
        response = api_client.get(parsed.path)
        assert response.status_code == status.HTTP_302_FOUND
        assert response.url == reverse("spa_account_verification")
        # in production this should match URL that request is made to, i.e. SITE_URL.
        assert parsed.netloc == "testserver"
        assert parsed.scheme == "http"
