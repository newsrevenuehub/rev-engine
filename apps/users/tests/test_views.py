import re
import time
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import Client, TestCase
from django.test.utils import override_settings
from django.urls import reverse
from django.utils import timezone

import pytest
from bs4 import BeautifulSoup
from faker import Faker
from rest_framework import status
from rest_framework.test import APITestCase

from apps.organizations.tests.factories import OrganizationFactory
from apps.users.constants import (
    BAD_ACTOR_CLIENT_FACING_VALIDATION_MESSAGE,
    INVALID_TOKEN,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    PASSWORD_NUMERIC_VALIDATION_MESSAGE,
    PASSWORD_TOO_COMMON_VALIDATION_MESSAGE,
    PASSWORD_TOO_LONG_VALIDATION_MESSAGE,
    PASSWORD_TOO_SHORT_VALIDATION_MESSAGE,
    PASSWORD_TOO_SIMILAR_TO_EMAIL_VALIDATION_MESSAGE,
)
from apps.users.permissions import UserIsAllowedToUpdate, UserOwnsUser
from apps.users.tests.factories import create_test_user
from apps.users.views import AccountVerification, UserViewset


user_model = get_user_model()
fake = Faker()


class TestAccountVerificationEndpoint(TestCase):
    @override_settings(ACCOUNT_VERIFICATION_LINK_EXPIRY=None)
    def test_happy_path_no_expiry(self):
        user = create_test_user(is_active=True, email_verified=False)
        email, token = AccountVerification().generate_token(user.email)
        response = self.client.get(reverse("account_verification", kwargs={"email": email, "token": token}))
        self.assertRedirects(response, reverse("spa_account_verification"))
        assert get_user_model().objects.get(pk=user.id).email_verified

    @override_settings(ACCOUNT_VERIFICATION_LINK_EXPIRY=1)
    def test_happy_path_with_expiry(self):
        user = create_test_user(is_active=True, email_verified=False)
        email, token = AccountVerification().generate_token(user.email)
        response = self.client.get(reverse("account_verification", kwargs={"email": email, "token": token}))
        self.assertRedirects(response, reverse("spa_account_verification"))
        assert get_user_model().objects.get(pk=user.id).email_verified

    # Expiry is tested below in TestAccountVerification, is hard to replicate here, and adds no coverage.
    # def test_expired_token(self):

    def test_failed_bad_token(self):
        user = create_test_user(is_active=False, email_verified=False)
        email, _ = AccountVerification().generate_token(user.email)
        _, token = AccountVerification().generate_token("thewrongtoken@example.com")
        response = self.client.get(reverse("account_verification", kwargs={"email": email, "token": token}))
        self.assertRedirects(response, reverse("spa_account_verification_fail", kwargs={"failure": "failed"}))

    def test_inactive_user(self):
        user = create_test_user(is_active=False, email_verified=False)
        email, token = AccountVerification().generate_token(user.email)
        response = self.client.get(reverse("account_verification", kwargs={"email": email, "token": token}))
        self.assertRedirects(response, reverse("spa_account_verification_fail", kwargs={"failure": "inactive"}))

    def test_unknown_user(self):
        email, token = AccountVerification().generate_token("bobjohnny@example.com")
        response = self.client.get(reverse("account_verification", kwargs={"email": email, "token": token}))
        self.assertRedirects(response, reverse("spa_account_verification_fail", kwargs={"failure": "unknown"}))


class TestAccountVerification:
    @pytest.mark.django_db
    def test_validation_happy_path(self):
        user = create_test_user(is_active=True, email_verified=False)
        t = AccountVerification()
        t.max_age = None
        email, token = t.generate_token(user.email)
        assert user == t.validate(email, token)

    @pytest.mark.django_db
    def test_validation_happy_path_with_expiry(self):
        user = create_test_user(is_active=True, email_verified=False)
        t = AccountVerification()
        t.max_age = 100
        encoded_email, token = t.generate_token(user.email)
        assert user == t.validate(encoded_email, token)

    @pytest.mark.django_db
    def test_inactive_validation(self):
        user = create_test_user(is_active=False)
        t = AccountVerification()
        t.max_age = None
        encoded_email, token = t.generate_token(user.email)
        assert not t.validate(encoded_email, token)
        assert "inactive" == t.fail_reason

    @pytest.mark.django_db
    def test_unknown_validation(self):
        t = AccountVerification()
        t.max_age = None
        encoded_email, token = t.generate_token("somenonexistentemail")
        assert not t.validate(encoded_email, token)
        assert "unknown" == t.fail_reason

    @pytest.mark.parametrize(
        "expected, encoded_email, encoded_token",
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
        assert "failed" == t.fail_reason
        assert expected in info.call_args.args[0]

    @patch("apps.users.views.logger.warning")
    def test_expired_link(self, warning):
        t = AccountVerification()
        t.max_age = 0.1  # Gotta be quick!
        encoded_email, token = t.generate_token("bobjohnny@example.com")
        time.sleep(0.1)  # Lame, but I'll pay .1s to not mock.
        assert not t.validate(encoded_email, token)
        assert "expired" == t.fail_reason
        assert "Expired" in warning.call_args.args[0]

    @patch("apps.users.views.logger.info")
    def test_signature_fail(self, warning):
        t = AccountVerification()
        t.max_age = 100
        encoded_email, _ = t.generate_token("bobjohnny@example.com")
        token = t.encode("garbage")
        assert not t.validate(encoded_email, token)
        assert "failed" == t.fail_reason
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
        assert re.match(
            r"^[=a-zA-Z0-9._~-]*$", encoded
        )  # Ensure encoded string contains only RFC-3986 URL Safe characters plus equalsign, "=". Because base64 lib uses equalsigns inviolation of RFC.


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class TestCustomPasswordResetView(TestCase):
    def setUp(self):
        self.client = Client()
        self.mailbox = mail.outbox
        self.staff_user = user_model.objects.create_superuser(email="test_superuser@test.com", password="testing")
        organization = OrganizationFactory()
        self.org_admin_user = create_test_user()
        self.org_admin_user.organizations.add(organization)

    def test_password_reset_email_when_org_admin_user(self):
        """When org admin trigger p/w reset via custom org admin password reset, the email is

        with p/w reset instructions contains link to custom org admin pw reset flow
        """
        self.client.post(reverse("orgadmin_password_reset"), {"email": self.org_admin_user.email})
        self.assertEqual(len(self.mailbox), 1)
        uidb64, token = self.mailbox[0].body.split("reset/")[1].split("/")[0:2]
        self.assertIn(
            reverse("orgadmin_password_reset_confirm", kwargs=dict(uidb64=uidb64, token=token)), self.mailbox[0].body
        )

    def test_password_reset_email_when_is_staff(self):
        """
        When staff trigger p/w reset via custom org admin password reset, the email is

        with p/w reset instructions contains link to default pw reset flow
        """
        self.client.post(reverse("orgadmin_password_reset"), {"email": self.staff_user.email})
        self.assertEqual(len(self.mailbox), 1)
        uidb64, token = self.mailbox[0].body.split("reset/")[1].split("/")[0:2]
        self.assertIn(reverse("password_reset_confirm", kwargs=dict(uidb64=uidb64, token=token)), self.mailbox[0].body)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class TestCustomPasswordResetConfirm(TestCase):
    def setUp(self):
        self.client = Client()
        self.mailbox = mail.outbox
        self.old_password = "tHiSiSaNoLdPw1337"
        self.new_password = "tHiSiSaNnEwPw1337"
        self.user = create_test_user()
        self.assertNotEqual(self.old_password, self.new_password)
        organization = OrganizationFactory()
        self.user.organizations.add(organization)

    def request_password_reset(self):
        self.client.post(reverse("orgadmin_password_reset"), {"email": self.user.email}, follow=True)
        self.assertEqual(len(self.mailbox), 1)
        uidb64, token = self.mailbox[0].body.split("reset/")[1].split("/")[0:2]
        return uidb64, token

    def test_happy_path(self):
        """Show that when OrgAdmin successfully resets p/w, they get a special view/URL

        Additionally, the Auth cookie token should be set to a non-sense value, to force
        login back at SPA
        """
        self.assertEqual(self.user.organizations.count(), 1)
        uidb64, token = self.request_password_reset()
        url = reverse("orgadmin_password_reset_confirm", kwargs=dict(uidb64=uidb64, token=token))
        data = dict(new_password1=self.new_password, new_password2=self.new_password)
        # We have to go to this link twice because of how PasswordResetConfirmView is
        # set up. See https://stackoverflow.com/a/67591447/1264950 and
        # https://github.com/django/django/blob/a24fed399ced6be2e9dce4cf28db00c3ee21a21c/django/contrib/auth/views.py#L284
        response = self.client.post(url, data, follow=True)
        self.assertEqual(response.status_code, 200)
        response = self.client.post(response.request["PATH_INFO"], data, follow=True)

        self.assertEqual(response.client.cookies["Authorization"].value, INVALID_TOKEN)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(reverse("orgadmin_password_reset_complete"), response.request["PATH_INFO"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.new_password))


class MockResponseObject:
    def __init__(self, json_data, status_code=200):
        self.status_code = status_code
        self.json_data = json_data

    def json(self):
        return self.json_data


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class TestUserViewSet(APITestCase):
    def setUp(self):
        self.url = reverse("user-list")
        self.create_data = {
            "email": fake.email(),
            "password": fake.password(length=PASSWORD_MIN_LENGTH),
            "accepted_terms_of_service": timezone.now(),
        }

    def get_too_short_password(self):
        return fake.password(length=PASSWORD_MIN_LENGTH - 1)

    def get_too_long_password(self):
        return fake.password(length=PASSWORD_MAX_LENGTH + 1)

    def get_too_common_password(self):
        return "passWord!"

    def get_too_similar_to_email_password(self, email):
        return f"{email}!123456"

    def get_numeric_password(self):
        return "8788838383123898798723982"

    def assert_password_too_short_validation(self, response):
        return self.assert_password_validation(response, PASSWORD_TOO_SHORT_VALIDATION_MESSAGE)

    def assert_password_too_long_validation(self, response):
        return self.assert_password_validation(response, PASSWORD_TOO_LONG_VALIDATION_MESSAGE)

    def assert_password_too_similar_to_email_validation(self, response):
        return self.assert_password_validation(response, PASSWORD_TOO_SIMILAR_TO_EMAIL_VALIDATION_MESSAGE)

    def assert_password_too_common_validation(self, response):
        return self.assert_password_validation(response, PASSWORD_TOO_COMMON_VALIDATION_MESSAGE)

    def assert_password_numeric_validation(self, response):
        return self.assert_password_validation(response, PASSWORD_NUMERIC_VALIDATION_MESSAGE)

    def assert_password_validation(
        self, response, expected_validation_message, expected_status_code=status.HTTP_400_BAD_REQUEST
    ):
        self.assertEqual(response.status_code, expected_status_code)
        self.assertEqual(
            response.json(),
            {"password": [expected_validation_message]},
        )

    def assert_serialized_data(self, response, instance):
        keys_by_instance_lookup = {
            "email": lambda instance: instance.email,
            "id": lambda instance: instance.id,
            "email_verified": lambda instance: instance.email_verified,
            "accepted_terms_of_service": lambda instance: instance.accepted_terms_of_service.strftime(
                "%Y-%m-%dT%H:%M:%S.%fZ"
            )
            if instance.accepted_terms_of_service
            else None,
            "flags": lambda instance: (instance.get_role_assignment() or {}).get("flags", []),
            "organizations": lambda instance: (instance.get_role_assignment() or {}).get("organizations", []),
            "revenue_programs": lambda instance: (instance.get_role_assignment() or {}).get("revenue_programs", []),
            "role_type": lambda instance: instance.get_role_type(),
        }
        self.assertEqual(set(keys_by_instance_lookup.keys()), set(response.json().keys()))
        for key, fn in keys_by_instance_lookup.items():
            self.assertEqual(fn(instance), response.json()[key])

    def test_unauthenticated_user_cannot_list(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_list_returns_authenticated_user(self):
        user = get_user_model().objects.create(email="testing@test.com", password="testing")
        self.client.force_authenticate(user=user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assert_serialized_data(response, user)

    @patch.object(UserViewset, "validate_password")
    @patch.object(UserViewset, "validate_bad_actor")
    @patch.object(UserViewset, "send_verification_email")
    def test_create_happy_path(self, mock_send_verification_email, mock_validate_bad_actor, mock_validate_password):
        user_count = get_user_model().objects.count()
        response = self.client.post(self.url, data=self.create_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(get_user_model().objects.count(), user_count + 1)
        self.assertEqual((data := response.json())["email"], self.create_data["email"])
        self.assertIsNotNone((user := get_user_model().objects.filter(id=data["id"]).first()))
        self.assertFalse(user.is_active)
        self.assertFalse(user.email_verified)
        self.assertEqual(user.email, self.create_data["email"])
        self.assertTrue(user.check_password(self.create_data["password"]))
        self.assertFalse(data["email_verified"])
        self.assertFalse(data["flags"])
        self.assertFalse(data["organizations"])
        self.assertFalse(data["revenue_programs"])
        self.assertIsNone(data["role_type"])
        self.assert_serialized_data(response, user)
        mock_validate_bad_actor.assert_called_once()
        mock_validate_password.assert_called_once()
        mock_send_verification_email.assert_called_once_with(user)

    def test_create_when_not_include_accepted_terms_of_service(self):
        data = {**self.create_data}
        del data["accepted_terms_of_service"]
        response = self.client.post(self.url, data=data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {"accepted_terms_of_service": ["This field is required."]})

    def test_create_when_not_accepted_terms_of_service_is_empty(self):
        data = {**self.create_data}
        data["accepted_terms_of_service"] = ""
        response = self.client.post(self.url, data=data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("accepted_terms_of_service", response.json().keys())
        self.assertIn("Datetime has wrong format", response.json()["accepted_terms_of_service"][0])

    def test_create_when_no_password(self):
        data = {**self.create_data}
        del data["password"]
        response = self.client.post(self.url, data=data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {"password": ["This field is required."]})

    def test_create_when_password_not_long_enough(self):
        data = {**self.create_data}
        data["password"] = self.get_too_short_password()
        response = self.client.post(self.url, data=data)
        self.assert_password_too_short_validation(response)

    def test_create_when_password_too_long(self):
        data = {**self.create_data}
        data["password"] = self.get_too_long_password()
        response = self.client.post(self.url, data=data)
        self.assert_password_too_long_validation(response)

    def test_create_when_password_too_similar_to_user_attributes(self):
        data = {**self.create_data}
        data["password"] = self.get_too_similar_to_email_password(data["email"])
        response = self.client.post(self.url, data=data)
        self.assert_password_too_similar_to_email_validation(response)

    def test_create_when_password_is_numeric(self):
        data = {**self.create_data}
        data["password"] = self.get_numeric_password()
        response = self.client.post(self.url, data=data)
        self.assert_password_numeric_validation(response)

    def test_create_when_password_is_too_common(self):
        data = {**self.create_data}
        data["password"] = self.get_too_common_password()
        response = self.client.post(self.url, data=data)
        self.assert_password_too_common_validation(response)

    @patch(
        "apps.users.views.make_bad_actor_request",
        return_value=MockResponseObject(json_data={"overall_judgment": settings.BAD_ACTOR_FAIL_ABOVE_FOR_ORG_USERS}),
    )
    def test_create_when_bad_actor_threshold_met(self, mock_bad_actor_request):
        response = self.client.post(self.url, data=self.create_data)
        mock_bad_actor_request.assert_called_once()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), [BAD_ACTOR_CLIENT_FACING_VALIDATION_MESSAGE])

    @patch.object(UserViewset, "send_verification_email")
    @patch("apps.users.views.logger.warning")
    @override_settings(BAD_ACTOR_API_KEY=None, BAD_ACTOR_API_URL=None)
    def test_create_when_bad_actor_api_not_configured(self, mock_logger_warning, mock_send_verification_email):
        user_count = get_user_model().objects.count()
        response = self.client.post(self.url, data=self.create_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(get_user_model().objects.count(), user_count + 1)
        self.assert_serialized_data(response, get_user_model().objects.get(pk=response.json()["id"]))
        mock_logger_warning.assert_called_once_with("Something went wrong with BadActorAPI", exc_info=True)
        mock_send_verification_email.assert_called_once()

    @patch.object(UserViewset, "send_verification_email")
    @patch(
        "apps.contributions.bad_actor.requests.post",
        return_value=MockResponseObject(json_data={"message": "Something went wrong"}, status_code=500),
    )
    @patch("apps.users.views.logger.warning")
    def test_create_when_bad_actor_api_not_2xx_code(
        self, mock_logger_warning, mock_bad_actor_response, mock_send_verification_email
    ):
        user_count = get_user_model().objects.count()
        response = self.client.post(self.url, data=self.create_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(get_user_model().objects.count(), user_count + 1)
        self.assert_serialized_data(response, get_user_model().objects.get(pk=response.json()["id"]))
        mock_logger_warning.assert_called_once_with("Something went wrong with BadActorAPI", exc_info=True)
        mock_send_verification_email.assert_called_once()

    def test_create_when_email_already_taken(self):
        get_user_model().objects.create(**self.create_data)
        user_count = get_user_model().objects.count()
        response = self.client.post(self.url, data=self.create_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {"email": ["This field must be unique."]})
        self.assertEqual(get_user_model().objects.count(), user_count)

    def test_partial_update_happy_path(self):
        user = get_user_model()(email=self.create_data["email"], email_verified=True)
        user.set_password(self.create_data["password"])
        user.save()
        new_email = fake.email()
        self.assertNotEqual(new_email, user.email)
        raw_updated_password = self.create_data["password"][::-1]
        update_data = {"password": raw_updated_password, "email": new_email}
        self.client.force_authenticate(user=user)
        response = self.client.patch(reverse("user-detail", args=(user.pk,)), data=update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["email"], new_email)
        user.refresh_from_db()
        self.assertEqual(user.email, new_email)
        self.assertTrue(user.check_password(raw_updated_password))
        self.assert_serialized_data(response, user)

    def test_update_email_when_email_already_taken(self):
        User = get_user_model()
        my_user = User.objects.create(**(self.create_data | {"email_verified": True}))
        taken_email = User.objects.create(**(self.create_data | {"email": fake.email()})).email
        self.client.force_authenticate(user=my_user)
        response = self.client.patch(reverse("user-detail", args=(my_user.pk,)), data={"email": taken_email})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {"email": ["This field must be unique."]})

    def test_update_password_when_pw_too_short(self):
        User = get_user_model()
        my_user = User.objects.create(**(self.create_data | {"email_verified": True}))
        self.client.force_authenticate(user=my_user)
        response = self.client.patch(
            reverse("user-detail", args=(my_user.pk,)), data={"password": self.get_too_short_password()}
        )
        self.assert_password_too_short_validation(response)

    def test_update_password_when_pw_too_long(self):
        User = get_user_model()
        my_user = User.objects.create(**(self.create_data | {"email_verified": True}))
        self.client.force_authenticate(user=my_user)
        response = self.client.patch(
            reverse("user-detail", args=(my_user.pk,)), data={"password": self.get_too_long_password()}
        )
        self.assert_password_too_long_validation(response)

    def test_update_password_when_pw_too_common(self):
        User = get_user_model()
        my_user = User.objects.create(**(self.create_data | {"email_verified": True}))
        self.client.force_authenticate(user=my_user)
        response = self.client.patch(
            reverse("user-detail", args=(my_user.pk,)), data={"password": self.get_too_common_password()}
        )
        self.assert_password_too_common_validation(response)

    def test_update_password_when_pw_too_similar_to_email(self):
        User = get_user_model()
        my_user = User.objects.create(**(self.create_data | {"email_verified": True}))
        self.client.force_authenticate(user=my_user)
        response = self.client.patch(
            reverse("user-detail", args=(my_user.pk,)),
            data={"password": self.get_too_similar_to_email_password(my_user.email)},
        )
        self.assert_password_too_similar_to_email_validation(response)

    def test_update_password_when_numeric(self):
        User = get_user_model()
        my_user = User.objects.create(**(self.create_data | {"email_verified": True}))
        self.client.force_authenticate(user=my_user)
        response = self.client.patch(
            reverse("user-detail", args=(my_user.pk,)), data={"password": self.get_numeric_password()}
        )
        self.assert_password_numeric_validation(response)

    def test_partial_update_when_not_my_user(self):
        my_user = get_user_model().objects.create(email="my_user@example.com", email_verified=True)
        another_user = get_user_model().objects.create(email="another_user@example.com")
        self.client.force_authenticate(user=my_user)
        update_email = "updated@example.com"
        response = self.client.patch(reverse("user-detail", args=(another_user.pk,)), data={"email": update_email})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json(), {"detail": UserOwnsUser.message})
        another_user.refresh_from_db()
        self.assertNotEqual(another_user.email, update_email)

    def test_cannot_partial_update_when_email_not_verified(self):
        user = get_user_model().objects.create(email=self.create_data["email"], email_verified=False)
        update_data = {"email": fake.email()}
        self.client.force_authenticate(user=user)
        response = self.client.patch(reverse("user-detail", args=(user.pk,)), data=update_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json(), {"detail": UserIsAllowedToUpdate.message})

    def test_can_update_password_when_email_not_verified(self):
        user = get_user_model().objects.create(email=self.create_data["email"], email_verified=False)
        update_data = {"password": "thisIstheNewPassword3939393!"}
        self.client.force_authenticate(user=user)
        response = self.client.patch(reverse("user-detail", args=(user.pk,)), data=update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password(update_data["password"]))
        self.assert_serialized_data(response, user)

    def test_sets_email_verified_to_false_when_email_updated(self):
        user = get_user_model().objects.create(email=self.create_data["email"], email_verified=True)
        update_data = {"email": "new@email.com"}
        self.client.force_authenticate(user=user)
        response = self.client.patch(reverse("user-detail", args=(user.pk,)), data=update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertFalse(user.email_verified)
        self.assert_serialized_data(response, user)

    def test_put_not_implemented(self):
        my_user = get_user_model().objects.create_user(**self.create_data)
        self.client.force_authenticate(user=my_user)
        response = self.client.put(reverse("user-detail", args=(my_user.pk,)), data={})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_not_implemented(self):
        my_user = get_user_model().objects.create_user(**self.create_data)
        self.client.force_authenticate(user=my_user)
        response = self.client.delete(reverse("user-detail", args=(my_user.pk,)))
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_request_account_verification_happy_path(self):
        user = create_test_user(email_verified=False)
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("user-request-account-verification"))
        assert status.HTTP_200_OK == response.status_code
        assert {"detail": "Success"} == response.json()

    def test_request_account_verification_already_verified(self):
        user = create_test_user(email_verified=True)
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("user-request-account-verification"))
        assert status.HTTP_404_NOT_FOUND == response.status_code
        assert {"detail": "Account already verified"} == response.json()

    def test_request_account_verification_inactive(self):
        user = create_test_user(email_verified=False, is_active=False)
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("user-request-account-verification"))
        assert status.HTTP_404_NOT_FOUND == response.status_code
        assert {"detail": "Account inactive"} == response.json()

    def test_request_account_verification_requires_auth(self):
        response = self.client.get(reverse("user-request-account-verification"))
        self.assertEqual(response.status_code, 401)

    @override_settings(CELERY_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPOGATES=True, BROKER_BACKEND="memory")
    def test_send_verification_email_happy_path(self):
        user = create_test_user(is_active=True, email_verified=False)
        UserViewset.send_verification_email(user)
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        assert user.email in email.to
        assert not any(x in email.body for x in "{}")
        assert not any(x in email.alternatives[0][0] for x in "{}")
        link = BeautifulSoup(email.alternatives[0][0], "html.parser").a
        encoded_email, token = AccountVerification().generate_token(user.email)
        assert reverse("account_verification", kwargs={"email": encoded_email, "token": token}) in link.attrs["href"]

    def test_send_verification_email_no_address(self):
        user = create_test_user(is_active=True, email_verified=False, email="")
        UserViewset.send_verification_email(user)
        self.assertEqual(len(mail.outbox), 0)
