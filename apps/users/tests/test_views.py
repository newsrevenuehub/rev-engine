from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import Client, TestCase
from django.test.utils import override_settings
from django.urls import reverse
from django.utils import timezone

from faker import Faker
from rest_framework import status
from rest_framework.test import APITestCase

from apps.organizations.tests.factories import OrganizationFactory
from apps.users.serializers import PASSWORD_MAX_LENGTH
from apps.users.tests.utils import create_test_user
from apps.users.views import INVALID_TOKEN, UserViewset


user_model = get_user_model()
fake = Faker()


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


class TestUserViewSet(APITestCase):
    def setUp(self):
        self.url = reverse("user-list")
        # this is the default in Django's MinimumLengthValidator
        self.password_required_min_length = 8
        self.create_data = {
            "email": fake.email(),
            "password": fake.password(length=self.password_required_min_length),
            "accepted_terms_of_service": timezone.now(),
        }

    def test_unauthenticated_user_cannot_list(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_list_returns_authenticated_user(self):
        user = get_user_model().objects.create(email="testing@test.com", password="testing")
        self.client.force_authenticate(user=user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], user.id)

    @patch.object(UserViewset, "validate_password")
    @patch.object(UserViewset, "validate_bad_actor")
    @patch.object(UserViewset, "send_verification_email")
    def test_create_happy_path(self, mock_send_verification_email, mock_validate_bad_actor, mock_validate_password):

        response = self.client.post(self.url, data=self.create_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual((data := response.json())["email"], self.create_data["email"])
        self.assertIsNotNone((user := get_user_model().objects.filter(id=data["id"]).first()))
        self.assertFalse(data["email_verified"])
        self.assertFalse(data["flags"])
        self.assertFalse(data["organizations"])
        self.assertFalse(data["revenue_programs"])
        self.assertIsNone(data["role_type"])
        self.assertEqual(
            data["accepted_terms_of_service"], user.accepted_terms_of_service.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        )
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
        data["password"] = fake.password(length=self.password_required_min_length - 1)
        response = self.client.post(self.url, data=data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json(),
            {
                "password": [
                    f"This password is too short. It must contain at least {self.password_required_min_length} characters."
                ]
            },
        )

    def test_create_when_password_too_long(self):
        data = {**self.create_data}
        data["password"] = fake.password(length=PASSWORD_MAX_LENGTH + 1)
        response = self.client.post(self.url, data=data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json(),
            {"password": [f"Ensure this field has no more than {PASSWORD_MAX_LENGTH} characters."]},
        )

    def test_create_when_password_too_similar_to_user_attributes(self):
        data = {**self.create_data}
        data["password"] = data["email"] + "!123"
        response = self.client.post(self.url, data=data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json(),
            {"password": ["The password is too similar to the email."]},
        )

    def test_create_when_password_is_numeric(self):
        data = {**self.create_data}
        data["password"] = "8788838383123898798723982"
        response = self.client.post(self.url, data=data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json(),
            {"password": ["This password is entirely numeric."]},
        )

    def test_create_when_password_is_too_common(self):
        data = {**self.create_data}
        data["password"] = "passWord!"
        response = self.client.post(self.url, data=data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json(),
            {"password": ["This password is too common."]},
        )

    def test_create_when_bad_actor_threshold_met(self):
        pass

    def test_create_when_bad_actor_api_not_configured(self):
        pass

    def test_create_when_bad_actor_api_error(self):
        pass

    def test_create_when_email_already_taken(self):
        pass

    def test_partial_update_happy_path(self):
        pass

    def test_partial_update_when_not_my_user(self):
        pass

    def test_update_not_implmented(self):
        pass

    def test_delete_not_implemented(self):
        pass

    def test_send_verification_email(self):
        pass
