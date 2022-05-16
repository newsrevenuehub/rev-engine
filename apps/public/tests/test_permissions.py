from unittest.mock import MagicMock

from django.contrib.auth import get_user_model

from rest_framework.test import APITestCase

from apps.public.permissions import IsActiveSuperUser


user_model = get_user_model()


class IsActiveSuperUserPermissionTest(APITestCase):
    def setUp(self):
        self.regular_user = user_model.objects.create_user(email="regularuser@test.com", password="testing")
        self.superuser = user_model.objects.create_superuser(email="superuser@test.com", password="testing")

    def _create_request_for_user(self, user):
        request = MagicMock()
        request.user = user
        return request

    def test_permission_granted_when_active_superuser(self):
        request = self._create_request_for_user(self.superuser)
        has_permission = IsActiveSuperUser().has_permission(request)
        self.assertTrue(has_permission)

    def test_permission_denied_when_inactive_superuser(self):
        self.superuser.is_active = False
        self.superuser.save()
        self.superuser.refresh_from_db()
        request = self._create_request_for_user(self.superuser)
        has_permission = IsActiveSuperUser().has_permission(request)
        self.assertFalse(has_permission)

    def test_permission_denied_when_regular_user(self):
        request = self._create_request_for_user(self.regular_user)
        has_permission = IsActiveSuperUser().has_permission(request)
        self.assertFalse(has_permission)
