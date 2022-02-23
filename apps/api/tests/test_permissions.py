# from django.contrib.auth import get_user_model
# from django.test import RequestFactory

from rest_framework.test import APITestCase


# from apps.api import permissions


class ReadOnlyPermTestCase(APITestCase):
    def setUp(self):
        pass

    def test_get_request_allowed(self):
        pass

    def test_non_get_request_not_allowed(self):
        forbidden_methods = ["post", "put", "patch" "delete"]
