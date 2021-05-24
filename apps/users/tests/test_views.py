from django.contrib.auth import get_user_model
from django.core import mail
from django.test import Client, TestCase
from django.test.utils import override_settings
from django.urls import reverse

from rest_framework.test import APITestCase

from apps.organizations.tests.factories import OrganizationFactory
from apps.users.views import INVALID_TOKEN


user_model = get_user_model()


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class TestCustomPasswordResetView(TestCase):
    def setUp(self):
        self.client = Client()
        self.mailbox = mail.outbox
        secure_password = "sEcUrEpA55w0rD"
        self.staff_user = user_model.objects.create_user(
            email="staff@test.com", password=secure_password, is_staff=True
        )
        organization = OrganizationFactory()
        self.org_admin_user = user_model.objects.create_user(
            email="test@test.com", password=secure_password, is_staff=False
        )
        self.org_admin_user.organizations.add(organization)

    def test_password_reset_email_when_is_staff(self):
        self.client.post(reverse("orgadmin_password_reset"), {"email": self.org_admin_user.email})
        self.assertEqual(len(self.mailbox), 1)
        uidb64, token = self.mailbox[0].body.split("reset/")[1].split("/")[0:2]
        self.assertIn(
            reverse("orgadmin_password_reset_confirm", kwargs=dict(uidb64=uidb64, token=token)), self.mailbox[0].body
        )

    def test_password_reset_email_when_org_admin(self):
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
        self.user = user_model.objects.create_user(email="test@test.com", password=self.old_password)
        self.assertNotEqual(self.old_password, self.new_password)
        organization = OrganizationFactory()
        self.user.organizations.add(organization)

    def request_password_reset(self):
        response = self.client.post(reverse("orgadmin_password_reset"), {"email": self.user.email}, follow=True)
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


class RetrieveUserTest(APITestCase):
    def setUp(self):
        self.url = reverse("user-retrieve")

    def test_unauthenticated_user_denied(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_gets_self(self):
        user = get_user_model().objects.create(email="testing@test.com", password="testing")
        self.client.force_authenticate(user=user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], user.id)
