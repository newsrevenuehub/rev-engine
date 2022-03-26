from rest_framework import status

from apps.common.tests.test_resources import AbstractTestCase


class DomainModelBootstrappedTestCase(AbstractTestCase):

    # NB: The assertion methods in here all assume that AbstractTestCase's
    # .set_up_domain_model() gets called in the calling context before these
    # assertions can run. A nice to do would be to track that state in initialization
    # and provide a warning or raise an exception if it hasn't run.
    def assert_superuser_can_get(self, url):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_superuser_can_list(self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False):
        response = self.assert_superuser_can_get(url)
        results_count = response.json()["count"] if not results_are_flat else len(response.json())
        results = response.json()["results"] if not results_are_flat else response.json()
        self.assertEqual(results_count, expected_count)
        if assert_item:
            for item in results:
                assert_item(item)
        if assert_all:
            assert_all(results)
        return response

    def assert_superuser_can_post(self, url, data):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def assert_superuser_can_patch(self, url, data):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_superuser_can_delete(self, url):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def assert_hub_admin_can_get(self, url):
        self.client.force_authenticate(user=self.hub_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_hub_admin_can_list(self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False):
        response = self.assert_superuser_can_get(url)
        results_count = response.json()["count"] if not results_are_flat else len(response.json())
        results = response.json()["results"] if not results_are_flat else response.json()
        self.assertEqual(results_count, expected_count)
        if assert_item:
            for item in results:
                assert_item(item)
        if assert_all:
            assert_all(results)
        return response

    def assert_hub_admin_can_post(self, url, data):
        self.client.force_authenticate(user=self.hub_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def assert_hub_admin_can_patch(self, url, data):
        self.client.force_authenticate(user=self.hub_user)
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_hub_admin_can_delete(self, url):
        self.client.force_authenticate(user=self.hub_user)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return response

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

    def assert_org_admin_can_list(self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False):
        response = self.assert_org_admin_can_get(url)
        results_count = response.json()["count"] if not results_are_flat else len(response.json())
        results = response.json()["results"] if not results_are_flat else response.json()
        self.assertEqual(results_count, expected_count)
        if assert_item:
            for item in results:
                assert_item(item)
        if assert_all:
            assert_all(results)
        return response

    def assert_org_admin_can_post(self, url, data):
        self.client.force_authenticate(user=self.org_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def assert_org_admin_cannot_post(self, url, data):
        self.client.force_authenticate(user=self.org_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def assert_org_admin_can_patch(self, url, data):
        self.client.force_authenticate(user=self.org_user)
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_org_admin_cannot_patch(self, url, data):
        self.client.force_authenticate(user=self.org_user)
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        return response

    def assert_org_admin_can_delete(self, url):
        self.client.force_authenticate(user=self.org_user)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return response

    def assert_org_admin_cannot_delete(self, url):
        self.client.force_authenticate(user=self.org_user)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        return response

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

    def assert_rp_user_can_list(self, url, expected_count, assert_item=None, assert_all=None, results_are_flat=False):
        response = self.assert_rp_user_can_get(url)
        results_count = response.json()["count"] if not results_are_flat else len(response.json())
        results = response.json()["results"] if not results_are_flat else response.json()
        self.assertEqual(results_count, expected_count)
        if assert_item:
            for item in results:
                assert_item(item)
        if assert_all:
            assert_all(results)
        return response

    def assert_rp_user_can_post(self, url, data):
        self.client.force_authenticate(user=self.rp_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def assert_rp_user_cannot_post(self, url, data):
        self.client.force_authenticate(user=self.rp_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        return response

    def assert_rp_user_can_patch(self, url, data):
        self.client.force_authenticate(user=self.rp_user)
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def assert_rp_user_cannot_patch(self, url, data):
        self.client.force_authenticate(user=self.rp_user)
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        return response

    def assert_rp_user_can_delete(self, url):
        self.client.force_authenticate(user=self.rp_user)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return response

    def assert_rp_user_cannot_delete(self, url):
        self.client.force_authenticate(user=self.rp_user)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        return response

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
