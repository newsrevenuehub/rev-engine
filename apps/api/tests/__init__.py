from rest_framework import status

from apps.common.tests.test_resources import AbstractTestCase


class DomainModelBootstrappedTestCase(AbstractTestCase):

    # NB: The assertion methods in here all assume that AbstractTestCase's
    # .set_up_domain_model() gets called in the calling context before these
    # assertions can run. A nice to do would be to track that state in initialization
    # and provide a warning or raise an exception if it hasn't run.

    def assert_unuauthed_cannot_get(self, url):
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        return response

    def assert_unauthed_cannot_delete(self, url):
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        return response

    def assert_unauthed_cannot_patch(self, url, data=None):
        data = data if data is not None else {}
        response = self.client.patch(url, data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        return response

    def assert_unauthed_cannot_put(self, url, data=None):
        data = data if data is not None else {}
        response = self.client.put(url, data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        return response

    def assert_user_can_get(self, url, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_user_cannot_get(self, url, user, expected_status_code=status.HTTP_403_FORBIDDEN):
        self.client.force_authenticate(user=user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, expected_status_code)
        return response

    def assert_user_can_list(
        self, url, user, expected_count, assert_item=None, assert_all=None, results_are_flat=False
    ):
        response = self.assert_user_can_get(url, user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results_count = response.json()["count"] if not results_are_flat else len(response.json())
        results = response.json()["results"] if not results_are_flat else response.json()
        self.assertEqual(results_count, expected_count)
        if assert_item:
            for item in results:
                assert_item(item)
        if assert_all:
            assert_all(results)
        return response

    def assert_user_can_post(self, url, user, data=None):
        data = data if data is not None else {}
        self.client.force_authenticate(user=user)
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def assert_user_cannot_post(self, url, user, data=None, expected_status_code=status.HTTP_403_FORBIDDEN):
        self.client.force_authenticate(user)
        response = self.client.post(url, data=data, format="json")
        self.assertEqual(response.status_code, expected_status_code)
        return response

    def assert_user_can_patch(self, url, user, data=None):
        data = data if data is not None else {}
        self.client.force_authenticate(user=user)
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_user_cannot_patch(self, url, user, data=None, expected_status_code=status.HTTP_403_FORBIDDEN):
        self.client.force_authenticate(user=user)
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, expected_status_code)
        return response

    def assert_user_cannot_put(self, url, user, data=None, expected_status_code=status.HTTP_403_FORBIDDEN):
        self.client.force_authenticate(user=user)
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, expected_status_code)
        return response

    def assert_user_can_delete(self, url, user):
        self.client.force_authenticate(user=user)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return response

    def assert_user_cannot_delete(self, url, user, expected_status_code=status.HTTP_403_FORBIDDEN):
        self.client.force_authenticate(user=user)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, expected_status_code)
        return response

    def assert_user_cannot_post_because_not_implemented(self, url, user, data=None):
        return self.assert_user_cannot_post(url, user, data, status.HTTP_405_METHOD_NOT_ALLOWED)

    def assert_user_cannot_patch_because_not_implemented(self, url, user, data=None):
        return self.assert_user_cannot_patch(url, user, data, status.HTTP_405_METHOD_NOT_ALLOWED)

    def assert_user_cannot_put_because_not_implemented(self, url, user, data=None):
        return self.assert_user_cannot_put(url, user, data, status.HTTP_405_METHOD_NOT_ALLOWED)

    def assert_user_cannot_delete_because_not_implemented(self, url, user):
        return self.assert_user_cannot_delete(url, user, status.HTTP_405_METHOD_NOT_ALLOWED)

    def assert_superuser_can_get(self, url):
        return self.assert_user_can_get(url, self.superuser)

    def assert_superuser_can_list(self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False):
        return self.assert_user_can_list(url, self.superuser, expected_count, assert_item, assert_all, results_are_flat)

    def assert_superuser_can_post(self, url, data=None):
        data = data if data is not None else {}
        return self.assert_user_can_post(url, self.superuser, data)

    def assert_superuser_cannot_post(self, url, data=None, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_post(url, self.superuser, data, expected_status_code)

    def assert_superuser_can_patch(self, url, data):
        data = data if data is not None else {}
        return self.assert_user_can_patch(url, self.superuser, data)

    def assert_superuser_cannot_patch(self, url, data, expected_status_code=status.HTTP_404_NOT_FOUND):
        data = data if data is not None else {}
        return self.assert_user_can_patch(url, self.superuser, data)

    def assert_superuser_can_delete(self, url):
        return self.assert_user_can_delete(url, self.superuser)

    def assert_superuser_cannot_delete(self, url, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_delete(url, self.superuser, expected_status_code)

    def assert_hub_admin_can_get(self, url):
        return self.assert_user_can_get(url, self.hub_user)

    def assert_hub_admin_can_list(self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False):
        return self.assert_user_can_list(
            url, self.hub_user, expected_count, assert_item=None, assert_all=None, results_are_flat=results_are_flat
        )

    def assert_hub_admin_can_post(self, url, data):
        return self.assert_user_can_post(url, self.hub_user, data)

    def assert_hub_admin_cannot_post(self, url, data=None, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_post(url, self.hub_user, data, expected_status_code)

    def assert_hub_admin_can_patch(self, url, data):
        return self.assert_user_can_patch(url, self.hub_user, data)

    def assert_hub_admin_cannot_patch(self, url, data=None, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_patch(url, self.hub_user, data, expected_status_code)

    def assert_hub_admin_can_delete(self, url):
        return self.assert_user_can_delete(url, self.hub_user)

    def assert_hub_admin_cannot_delete(self, url, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_delete(url, self.hub_user, expected_status_code)

    def assert_org_admin_can_get(self, url):
        return self.assert_user_can_get(
            url,
            self.org_user,
        )

    def assert_org_admin_cannot_get(self, url, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_get(url, self.org_user, expected_status_code)

    def assert_org_admin_can_list(self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False):
        return self.assert_user_can_list(url, self.org_user, expected_count, assert_item, assert_all, results_are_flat)

    def assert_org_admin_can_post(self, url, data):
        return self.assert_user_can_post(url, self.org_user, data)

    def assert_org_admin_cannot_post(self, url, data, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_post(url, self.org_user, data, expected_status_code)

    def assert_org_admin_can_patch(self, url, data):
        return self.assert_user_can_patch(url, self.org_user, data)

    def assert_org_admin_cannot_patch(self, url, data, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_patch(url, self.org_user, data, expected_status_code)

    def assert_org_admin_can_delete(self, url):
        return self.assert_user_can_delete(url, self.org_user)

    def assert_org_admin_cannot_delete(self, url, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_delete(url, self.org_user, expected_status_code)

    def assert_rp_user_can_get(self, url):
        return self.assert_user_can_get(url, self.rp_user)

    def assert_rp_user_cannot_get(self, url, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_get(url, self.rp_user, expected_status_code)

    def assert_rp_user_can_list(self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False):
        return self.assert_user_can_list(
            url,
            self.rp_user,
            expected_count,
            assert_item,
            assert_all,
            results_are_flat,
        )

    def assert_rp_user_can_post(self, url, data):
        return self.assert_user_can_post(url, self.rp_user, data)

    def assert_rp_user_cannot_post(self, url, data, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_post(url, self.rp_user, data, expected_status_code)

    def assert_rp_user_can_patch(self, url, data):
        return self.assert_user_can_patch(url, self.rp_user, data)

    def assert_rp_user_cannot_patch(self, url, data, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_patch(url, self.rp_user, data, expected_status_code)

    def assert_rp_user_can_delete(self, url):
        return self.assert_user_can_delete(url, self.rp_user)

    def assert_rp_user_cannot_delete(self, url, expected_status_code=status.HTTP_404_NOT_FOUND):
        return self.assert_user_cannot_delete(url, self.rp_user, expected_status_code)

    def assert_contributor_can_get(self, url):
        return self.assert_user_can_get(url, self.contributor_user)

    def assert_contributor_cannot_get(self, url, expected_status_code=status.HTTP_403_FORBIDDEN):
        return self.assert_user_cannot_get(url, self.contributor_user, expected_status_code)

    def assert_contributor_user_can_list(
        self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False
    ):
        return self.assert_user_can_list(
            url, self.contributor_user, expected_count, assert_item, assert_all, results_are_flat
        )
