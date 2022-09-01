from rest_framework import status

from apps.common.tests.test_resources import AbstractTestCase


class RevEngineApiAbstractTestCase(AbstractTestCase):
    """A set custom test assertions for testing the API, with a view of distinct user types
    and role assignments.

    Note that it's the responsibility of any sub-classing test case to call `super().setUp()` if
    it overrides `.setUp`.

    NB: The test assertions in this class will not work if `set_up_domain_model` has not been run.
    """

    def setUp(self):
        """Set up the domain models"""
        super().setUp()
        self.set_up_domain_model()

    def assert_method(self, method, user, url, data, status=status.HTTP_200_OK, **client_kwargs):
        if user is not None:
            self.client.force_authenticate(user=user)
        kwargs = client_kwargs.copy()
        kwargs.setdefault("format", "json")
        kwargs.setdefault("data", data or {})
        response = getattr(self.client, method.lower())(url, **kwargs)
        assert status == response.status_code, response
        return response

    def assert_response(self, url, status=status.HTTP_401_UNAUTHORIZED, json=None, user=None):
        if user is not None:
            self.client.force_authenticate(user=user)
        response = self.client.get(url)
        assert status == response.status_code, response
        if json is not None:
            assert json == response.json()
        return response

    def assert_unauthed_cannot_get(self, url, status=status.HTTP_401_UNAUTHORIZED):
        return self.assert_response(url, status=status)

    def assert_unauthed_can_get(self, url):
        return self.assert_response(url, status=status.HTTP_200_OK)

    def assert_unauthed_cannot_delete(self, url):
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        return response

    def assert_unauthed_cannot_patch(self, url, data=None):
        data = data or {}
        response = self.client.patch(url, data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        return response

    def assert_unauthed_cannot_put(self, url, data=None):
        data = data or {}
        response = self.client.put(url, data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        return response

    def assert_user_can_get(self, user, url, status=status.HTTP_200_OK):
        return self.assert_response(url, status=status, user=user)

    def assert_user_cannot_get(self, user, url, status=status.HTTP_403_FORBIDDEN):
        return self.assert_response(url, status=status, user=user)

    def assert_user_can_list(
        self, user, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False
    ):
        response = self.assert_user_can_get(user, url)
        results = response.json()["results"] if not results_are_flat else response.json()
        assert expected_count == response.json()["count"] if not results_are_flat else len(response.json())
        if assert_item:
            for item in results:
                assert_item(item)
        if assert_all:
            assert_all(results)
        return response

    def assert_user_can_post(self, user, url, data=None, status=status.HTTP_201_CREATED, **client_kwargs):
        return self.assert_method("post", user, url, data, status, **client_kwargs)

    def assert_user_cannot_post(self, user, url, data=None, status=status.HTTP_403_FORBIDDEN, **client_kwargs):
        return self.assert_method("post", user, url, data, status, **client_kwargs)

    def assert_user_can_patch(self, user, url, data=None, status=status.HTTP_200_OK, **client_kwargs):
        return self.assert_method("patch", user, url, data, status, **client_kwargs)

    def assert_user_cannot_patch(self, user, url, data=None, status=status.HTTP_403_FORBIDDEN, **client_kwargs):
        return self.assert_method("patch", user, url, data, status, **client_kwargs)

    def assert_user_cannot_put(self, user, url, data=None, status=status.HTTP_403_FORBIDDEN, **client_kwargs):
        return self.assert_method("put", user, url, data, status, **client_kwargs)

    def assert_user_can_delete(self, user, url):
        self.client.force_authenticate(user=user)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return response

    def assert_user_cannot_delete(self, user, url, status=status.HTTP_403_FORBIDDEN):
        self.client.force_authenticate(user=user)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status)
        return response

    def assert_user_cannot_post_because_not_implemented(self, url, user, data=None):
        return self.assert_user_cannot_post(user, url, data, status.HTTP_405_METHOD_NOT_ALLOWED)

    def assert_user_cannot_patch_because_not_implemented(self, url, user, data=None):
        return self.assert_user_cannot_patch(user, url, data, status.HTTP_405_METHOD_NOT_ALLOWED)

    def assert_user_cannot_put_because_not_implemented(self, url, user, data=None):
        return self.assert_user_cannot_put(user, url, data, status.HTTP_405_METHOD_NOT_ALLOWED)

    def assert_user_cannot_delete_because_not_implemented(self, url, user):
        return self.assert_user_cannot_delete(user, url, status.HTTP_405_METHOD_NOT_ALLOWED)

    def assert_superuser_can_get(self, url):
        return self.assert_user_can_get(self.superuser, url)

    def assert_superuser_can_list(self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False):
        return self.assert_user_can_list(self.superuser, url, expected_count, assert_item, assert_all, results_are_flat)

    def assert_superuser_can_post(self, url, data=None):
        return self.assert_user_can_post(self.superuser, url, data)

    def assert_superuser_cannot_post(self, url, data=None, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_post(self.superuser, url, data, status)

    def assert_superuser_can_patch(self, url, data):
        return self.assert_user_can_patch(self.superuser, url, data)

    def assert_superuser_cannot_patch(self, url, data, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_can_patch(self.superuser, url, data)

    def assert_superuser_can_delete(self, url):
        return self.assert_user_can_delete(self.superuser, url)

    def assert_superuser_cannot_delete(self, url, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_delete(self.superuser, url, status)

    def assert_hub_admin_can_get(self, url):
        return self.assert_user_can_get(self.hub_user, url)

    def assert_hub_admin_can_list(self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False):
        return self.assert_user_can_list(
            self.hub_user, url, expected_count, assert_item=None, assert_all=None, results_are_flat=results_are_flat
        )

    def assert_hub_admin_can_post(self, url, data):
        return self.assert_user_can_post(self.hub_user, url, data)

    def assert_hub_admin_cannot_post(self, url, data=None, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_post(self.hub_user, url, data, status)

    def assert_hub_admin_can_patch(self, url, data):
        return self.assert_user_can_patch(self.hub_user, url, data)

    def assert_hub_admin_cannot_patch(self, url, data=None, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_patch(self.hub_user, url, data, status)

    def assert_hub_admin_can_delete(self, url):
        return self.assert_user_can_delete(self.hub_user, url)

    def assert_hub_admin_cannot_delete(self, url, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_delete(self.hub_user, url, status)

    def assert_org_admin_can_get(self, url):
        return self.assert_user_can_get(
            self.org_user,
            url,
        )

    def assert_org_admin_cannot_get(self, url, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_get(self.org_user, url, status)

    def assert_org_admin_can_list(self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False):
        return self.assert_user_can_list(self.org_user, url, expected_count, assert_item, assert_all, results_are_flat)

    def assert_org_admin_can_post(self, url, data):
        return self.assert_user_can_post(self.org_user, url, data)

    def assert_org_admin_cannot_post(self, url, data, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_post(self.org_user, url, data, status)

    def assert_org_admin_can_patch(self, url, data):
        return self.assert_user_can_patch(self.org_user, url, data)

    def assert_org_admin_cannot_patch(self, url, data, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_patch(self.org_user, url, data, status)

    def assert_org_admin_can_delete(self, url):
        return self.assert_user_can_delete(self.org_user, url)

    def assert_org_admin_cannot_delete(self, url, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_delete(self.org_user, url, status)

    def assert_rp_user_can_get(self, url):
        return self.assert_user_can_get(self.rp_user, url)

    def assert_rp_user_cannot_get(self, url, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_get(self.rp_user, url, status)

    def assert_rp_user_can_list(self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False):
        return self.assert_user_can_list(
            self.rp_user,
            url,
            expected_count,
            assert_item,
            assert_all,
            results_are_flat,
        )

    def assert_rp_user_can_post(self, url, data):
        return self.assert_user_can_post(self.rp_user, url, data)

    def assert_rp_user_cannot_post(self, url, data, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_post(self.rp_user, url, data, status)

    def assert_rp_user_can_patch(self, url, data):
        return self.assert_user_can_patch(self.rp_user, url, data)

    def assert_rp_user_cannot_patch(self, url, data, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_patch(self.rp_user, url, data, status)

    def assert_rp_user_can_delete(self, url):
        return self.assert_user_can_delete(self.rp_user, url)

    def assert_rp_user_cannot_delete(self, url, status=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_delete(self.rp_user, url, status)

    def assert_contributor_can_get(self, url):
        return self.assert_user_can_get(self.contributor_user, url)

    def assert_contributor_cannot_get(self, url, status=status.HTTP_403_FORBIDDEN):
        return self.assert_user_cannot_get(self.contributor_user, url, status)

    def assert_contributor_user_can_list(
        self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False
    ):
        return self.assert_user_can_list(
            url, self.contributor_user, expected_count, assert_item, assert_all, results_are_flat
        )
