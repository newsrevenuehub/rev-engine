from django.test import RequestFactory
from django.urls import reverse

from rest_framework.test import APITestCase

from apps.api import permissions
from apps.pages.tests.factories import DonationPageFactory


class ReadOnlyPermTestCase(APITestCase):
    def setUp(self):
        self.page = DonationPageFactory()

    def _get_url_for_method(self, method):
        if method in ["GET", "POST"]:
            return reverse("donationpage-list")

        if method in ["PUT", "PATCH", "DELETE"]:
            return reverse("donationpage-list", args=[self.page.pk])

    def test_get_request_allowed(self):
        request = RequestFactory().get(self._get_url_for_method("GET"))
        self.assertTrue(permissions.ReadOnly().has_object_permission(request, {}))

    def test_non_get_request_not_allowed(self):
        forbidden_methods = ["POST", "PUT", "PATCH", "DELETE"]
        request_factory = RequestFactory()
        for method in forbidden_methods:
            request = getattr(request_factory, method.lower())(self._get_url_for_method(method))
            self.assertFalse(permissions.ReadOnly().has_object_permission(request, {}))
