from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.reverse import reverse

from apps.api.tests import RevEngineApiAbstractTestCase
from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.tests.factories import OrganizationFactory
from apps.users.tests.factories import create_test_user


user_model = get_user_model()


class OrganizationViewSetTest(RevEngineApiAbstractTestCase):
    model_factory = OrganizationFactory
    model = Organization

    def setUp(self):
        super().setUp()
        self.is_authed_user = create_test_user()
        self.post_data = {}
        self.expected_user_types = (
            self.superuser,
            self.hub_user,
            self.org_user,
            self.rp_user,
        )
        self.detail_url = reverse("organization-detail", args=(self.org1.pk,))
        self.list_url = reverse("organization-list")

    def assert_user_can_retrieve_an_org(self, user):
        response = self.assert_user_can_get(self.detail_url, user)
        self.assertEqual(response.json()["id"], self.org1.pk)

    def assert_user_cannot_udpate_an_org(self, user):
        last_modified = self.org1.modified
        self.assert_user_cannot_patch_because_not_implemented(self.detail_url, user)
        self.org1.refresh_from_db()
        self.assertEqual(last_modified, self.org1.modified)

    def assert_user_cannot_create_an_org(self, user):
        before_count = Organization.objects.count()
        self.assert_user_cannot_post_because_not_implemented(self.list_url, user)
        self.assertEqual(before_count, Organization.objects.count())

    def assert_user_cannot_delete_an_org(self, user):
        self.assertGreaterEqual(before_count := Organization.objects.count(), 1)
        self.assert_user_cannot_delete_because_not_implemented(self.detail_url, user)
        self.assertEqual(before_count, Organization.objects.count())

    def test_unauthed_cannot_access(self):
        self.assert_unauthed_cannot_get(self.detail_url)
        self.assert_unauthed_cannot_get(self.list_url)
        self.assert_unauthed_cannot_delete(self.detail_url)
        self.assert_unauthed_cannot_patch(self.detail_url)
        self.assert_unauthed_cannot_put(self.detail_url)

    def test_expected_user_types_can_only_read(self):
        for user in self.expected_user_types:
            self.assert_user_can_retrieve_an_org(user)
            self.assert_user_cannot_create_an_org(user)
            self.assert_user_cannot_udpate_an_org(user)
            self.assert_user_cannot_delete_an_org(user)
        for user, count in [
            (self.superuser, Organization.objects.count()),
            (self.hub_user, Organization.objects.count()),
            (self.org_user, 1),
            (self.rp_user, 1),
        ]:
            self.assert_user_can_list(self.list_url, user, count, results_are_flat=True)

    def test_unexpected_role_type(self):
        novel = create_test_user(role_assignment_data={"role_type": "this-is-new"})
        self.assert_user_cannot_get(
            reverse("organization-list"),
            novel,
            expected_status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class RevenueProgramViewSetTest(RevEngineApiAbstractTestCase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse("revenue-program-list")
        self.detail_url = reverse("revenue-program-detail", args=(RevenueProgram.objects.first().pk,))

    def test_superuser_can_retrieve_an_rp(self):
        return self.assert_superuser_can_get(self.detail_url)

    def test_superuser_can_list_rps(self):
        expected_count = RevenueProgram.objects.count()
        return self.assert_superuser_can_list(self.list_url, expected_count, results_are_flat=True)

    def test_other_cannot_access_resource(self):
        non_superusers = [self.hub_user, self.org_user, self.rp_user, self.contributor_user]
        for user in non_superusers:
            self.assert_user_cannot_get(self.detail_url, user)
            self.assert_user_cannot_get(self.list_url, user)
            self.assert_user_cannot_post(self.list_url, user)
            self.assert_user_cannot_patch(self.detail_url, user)
            self.assert_user_cannot_delete(self.detail_url, user)

    def test_unauthed_cannot_access(self):
        self.assert_unauthed_cannot_get(self.detail_url)
        self.assert_unauthed_cannot_get(self.list_url)
        self.assert_unauthed_cannot_delete(self.detail_url)
        self.assert_unauthed_cannot_patch(self.detail_url)
        self.assert_unauthed_cannot_put(self.detail_url)

    def test_pagination_disabled(self):
        response = self.assert_superuser_can_get(self.list_url)
        self.assertNotIn("count", response.json())
        self.assertNotIn("results", response.json())
