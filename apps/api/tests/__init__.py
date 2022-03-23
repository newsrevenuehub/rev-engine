from urllib.request import Request

from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory

from rest_framework import status

from apps.api import permissions
from apps.common.tests.test_resources import AbstractTestCase
from apps.public.permissions import IsSuperUser


class HasRoleAssignmentAbstractTestCase(AbstractTestCase):

    # NB: The assertion methods in here all assume that AbstractTestCase's
    # .set_up_domain_model() gets called in the calling context before these
    # assertions can run. A nice to do would be to track that state in initialization
    # and provide a warning or raise an exception if it hasn't run.

    def assert_anonymous_does_not_have_get_permission(self, url):
        request = RequestFactory().get(url)
        request.user = AnonymousUser()
        self.assertFalse(permissions.HasRoleAssignment().has_permission(request, {}))

    def assert_superuser_has_get_permission(self, url):
        request = RequestFactory().get(url)
        request.user = self.superuser
        self.assertTrue(IsSuperUser().has_permission(request, {}))

    def assert_superuser_can_get(self, url):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_superuser_can_list(self, url, expected_count, assert_item=None, assert_all=None):
        response = self.assert_superuser_can_get(url)
        self.assertEqual(response.json()["count"], expected_count)
        if assert_item:
            for item in response.json()["results"]:
                assert_item
        if assert_all:
            assert_all(response.json()["results"])

    def assert_superuser_has_post_permission(self, url, content_type="application/json"):
        request = RequestFactory().post(url, {}, content_type=content_type)
        request.user = self.superuser
        self.assertTrue(IsSuperUser().has_permission(request, {}))

    def assert_superuser_can_post(self, url, data):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def assert_hub_admin_has_get_permission(self, url):
        request = RequestFactory().get(url)
        request.user = self.hub_user
        self.assertTrue(permissions.HasRoleAssignment().has_permission(request, {}))

    def assert_hub_admin_can_get(self, url):
        self.client.force_authenticate(user=self.hub_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_hub_admin_can_list(self, url, expected_count, assert_item=None, assert_all=None):
        response = self.assert_hub_admin_can_get(url)
        self.assertEqual(response.json()["count"], expected_count)
        if assert_item:
            for item in response.json()["results"]:
                assert_item(item)
        if assert_all:
            assert_all(response.json()["results"])
        return response

    def assert_hub_admin_has_post_permission(self, url, content_type="application/json"):
        request = RequestFactory().post(url, {}, content_type=content_type)
        request.user = self.hub_user
        self.assertTrue(permissions.HasRoleAssignment().has_permission(request, {}))

    def assert_hub_admin_can_post(self, url, data):
        self.client.force_authenticate(user=self.hub_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def assert_org_admin_has_get_permission(self, url):
        request = RequestFactory().get(url)
        request.user = self.org_user
        self.assertTrue(permissions.HasRoleAssignment().has_permission(request, {}))

    def assert_org_admin_can_get(self, url):
        self.client.force_authenticate(user=self.org_user)
        response = self.client.get(url, HTTP_ACCEPT="application/json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_org_admin_cannot_get(self, url):
        self.client.force_authenticate(user=self.org_user)
        response = self.client.get(url, HTTP_ACCEPT="application/json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        return response

    def assert_org_admin_can_list(self, url, expected_count, assert_item=None, assert_all=None):
        response = self.assert_org_admin_can_get(url)
        self.assertEqual(response.json()["count"], expected_count)
        if assert_item:
            for item in response.json()["results"]:
                assert_item(item)
        if assert_all:
            assert_all(response.json()["results"])
        return response

    def assert_org_admin_has_post_permission(self, url):
        request = RequestFactory().get(url)
        request.user = self.org_user
        self.assertTrue(permissions.HasRoleAssignment().has_permission(request, {}))

    def assert_org_admin_can_post(self, url, data):
        self.client.force_authenticate(user=self.org_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def assert_org_admin_cannot_post(self, url, data):
        self.client.force_authenticate(user=self.org_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def assert_rp_user_has_get_permission(self, url):
        request = RequestFactory().get(url)
        request.user = self.rp_user
        self.assertTrue(permissions.HasRoleAssignment().has_permission(request, {}))

    def assert_rp_user_can_get(self, url):
        self.client.force_authenticate(user=self.rp_user)
        response = self.client.get(url, HTTP_ACCEPT="application/json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_rp_user_cannot_get(self, url):
        self.client.force_authenticate(user=self.rp_user)
        response = self.client.get(url, HTTP_ACCEPT="application/json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        return response

    def assert_rp_user_can_list(self, url, expected_count, assert_item=None, assert_all=None):
        response = self.assert_rp_user_can_get(url)
        self.assertEqual(response.json()["count"], expected_count)
        if assert_item:
            for item in response.json()["results"]:
                assert_item(item)
        if assert_all:
            assert_all(response.json()["results"])
        return response

    def assert_rp_user_has_permission_to_post(self, url):
        request = RequestFactory().post(url)
        request.user = self.rp_user
        self.assertTrue(permissions.HasRoleAssignment().has_permission(request, {}))

    def assert_rp_user_can_post(self, url, data):
        self.client.force_authenticate(user=self.rp_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def assert_rp_user_cannot_post(self, url, data):
        self.client.force_authenticate(user=self.rp_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def assert_contributor_user_has_get_permission(self, url):
        request = RequestFactory().get(url)
        request.user = self.contributor_user
        self.assertTrue(permissions.IsContributor().has_permission(request, {}))

    def assert_contributor_user_does_not_have_get_permission(self, url):
        request = RequestFactory().get(url)
        request.user = self.contributor_user
        self.assertFalse(permissions.HasRoleAssignment().has_permission(request, {}))

    def assert_contributor_can_get(self, url):
        self.client.force_authenticate(user=self.contributor_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_contributor_cannot_get(self, url):
        self.client.force_authenticate(user=self.contributor_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        return response

    def assert_contributor_user_can_list(self, url, expected_count, assert_item=None, assert_all=None):
        response = self.assert_contributor_can_get(url)
        self.assertEqual(response.json()["count"], expected_count)
        if assert_item:
            for item in response.json()["results"]:
                assert_item(item)
        if assert_all:
            assert_all(response.json()["results"])
        return response
