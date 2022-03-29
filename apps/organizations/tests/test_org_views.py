from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.reverse import reverse

from apps.api.tests import DomainModelBootstrappedTestCase
from apps.organizations.models import Feature, Organization, Plan, RevenueProgram
from apps.organizations.tests.factories import FeatureFactory, OrganizationFactory
from apps.users.tests.utils import create_test_user


user_model = get_user_model()


class OrganizationViewSetTest(DomainModelBootstrappedTestCase):
    model_factory = OrganizationFactory
    model = Organization

    def setUp(self):
        super().setUp()
        self.set_up_domain_model()
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
        self.assert_unuauthed_cannot_get(self.detail_url)
        self.assert_unuauthed_cannot_get(self.list_url)
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


class RevenueProgramViewSetTest(DomainModelBootstrappedTestCase):
    def setUp(self):
        super().setUp()
        self.set_up_domain_model()
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
        self.assert_unuauthed_cannot_get(self.detail_url)
        self.assert_unuauthed_cannot_get(self.list_url)
        self.assert_unauthed_cannot_delete(self.detail_url)
        self.assert_unauthed_cannot_patch(self.detail_url)
        self.assert_unauthed_cannot_put(self.detail_url)

    def test_pagination_disabled(self):
        response = self.assert_superuser_can_get(self.list_url)
        self.assertNotIn("count", response.json())
        self.assertNotIn("results", response.json())


class PlanViewSetTest(DomainModelBootstrappedTestCase):
    def setUp(self):
        self.list_url = reverse("plan-list")
        self.set_up_domain_model()
        self.detail_url = reverse("plan-detail", args=(Plan.objects.first(),))

    ########
    # Create

    def test_no_one_can_create(self):
        for user, status_code in [
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.org_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.rp_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
            (self.generic_user, status.HTTP_405_METHOD_NOT_ALLOWED),
        ]:
            self.assert_user_cannot_post(self.list_url, user, {}, status_code)

    #################
    # Read - Retrieve

    def test_superuser_can_retrieve_a_plan(self):
        self.assert_superuser_can_get(reverse("plan-detail", args=(Plan.objects.first().pk,)))

    def test_hub_user_can_retrieve_a_plan(self):
        self.assert_hub_admin_can_get(reverse("plan-detail", args=(Plan.objects.first().pk,)))

    def test_org_admin_can_retrieve_their_orgs_plan(self):
        self.assert_hub_admin_can_get(reverse("plan-detail", args=(Plan.objects.first().pk,)))
        self.assertGreater(expected_count := Plan.objects.count(), 1)
        self.assert_hub_admin_can_list(self.list_url, expected_count, results_are_flat=True)

    def test_org_admin_cannot_retrieve_another_orgs_plan(self):
        detail_url = reverse("plan-detail", args=(self.org2.plan.pk,))
        self.assert_rp_user_cannot_get(detail_url)

    def test_rp_user_can_retrieve_their_orgs_plan(self):
        detail_url = reverse("plan-detail", args=(self.org1.plan.pk,))
        self.assert_rp_user_can_get(detail_url)

    def test_rp_user_cannot_retrieve_another_orgs_plan(self):
        detail_url = reverse("plan-detail", args=(self.org2.plan.pk,))
        self.assert_rp_user_cannot_get(detail_url)

    #############
    # Read - List

    def test_superuser_can_list_plans(self):
        self.assertGreater(expected_count := Plan.objects.count(), 1)
        self.assert_superuser_can_list(self.list_url, expected_count, results_are_flat=True)

    def test_hub_admin_can_list_plans(self):
        self.assertGreater(expected_count := Plan.objects.count(), 1)
        self.assert_hub_admin_can_list(self.list_url, expected_count, results_are_flat=True)

    def test_org_admin_sees_their_plan_in_list(self):
        self.assert_org_admin_can_list(
            self.list_url, 1, assert_item=lambda x: x["id"] == self.org1.plan.pk, results_are_flat=True
        )

    def test_rp_user_sees_their_orgs_plan_in_list(self):
        self.assert_rp_user_can_list(
            self.list_url,
            1,
            assert_item=lambda x: x["id"] == self.rp_user.roleassignment.organization.plan.pk,
            results_are_flat=True,
        )

    ########
    # Update

    def test_no_one_can_update(self):
        for user, status_code in [
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.org_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.rp_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
            (self.generic_user, status.HTTP_405_METHOD_NOT_ALLOWED),
        ]:
            self.assert_user_cannot_patch(self.detail_url, user, {}, expected_status_code=status_code)

    ########
    # Delete

    def test_no_one_can_delete(self):
        for user, status_code in [
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.org_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.rp_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
            (self.generic_user, status.HTTP_405_METHOD_NOT_ALLOWED),
        ]:
            self.assert_user_cannot_delete(self.detail_url, user, expected_status_code=status_code)


class FeatureViewSetTest(DomainModelBootstrappedTestCase):
    def setUp(self):
        super().setUp()
        self.set_up_domain_model()
        self.org1.plan.features.add(FeatureFactory())
        self.org2.plan.features.add(FeatureFactory())

    ########
    # Create

    def test_no_one_can_create(self):
        for user, status_code in [
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_403_FORBIDDEN),
            (self.org_user, status.HTTP_403_FORBIDDEN),
            (self.rp_user, status.HTTP_403_FORBIDDEN),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
            (self.generic_user, status.HTTP_403_FORBIDDEN),
        ]:
            self.assert_user_cannot_post(reverse("feature-list"), user, {}, status_code)

    #################
    # Read - Retrieve

    def test_superuser_can_retrieve_a_feature(self):
        self.assert_superuser_can_get(reverse("feature-detail", args=(Feature.objects.first().pk,)))

    def test_non_superuser_users_cannot_retrieve_a_feature(self):
        for user in [
            self.hub_user,
            self.org_user,
            self.rp_user,
            self.contributor_user,
            self.generic_user,
        ]:
            self.assert_user_cannot_get(
                reverse("feature-detail", args=(Feature.objects.first().pk,)), user, status.HTTP_403_FORBIDDEN
            )

    #############
    # Read - List

    def test_superuser_can_list_features(self):
        self.assert_superuser_can_list(reverse("feature-list"), Feature.objects.count(), results_are_flat=True)

    def test_non_superuser_users_cannot_list_features(self):
        for user in [
            self.hub_user,
            self.org_user,
            self.rp_user,
            self.contributor_user,
            self.generic_user,
        ]:
            self.assert_user_cannot_get(reverse("feature-list"), user, status.HTTP_403_FORBIDDEN)

    ########
    # Update

    def test_no_one_can_update(self):
        for user, status_code in [
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_403_FORBIDDEN),
            (self.org_user, status.HTTP_403_FORBIDDEN),
            (self.rp_user, status.HTTP_403_FORBIDDEN),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
            (self.generic_user, status.HTTP_403_FORBIDDEN),
        ]:
            self.assert_user_cannot_patch(
                reverse("feature-detail", args=(self.org1.plan.features.first().pk,)),
                user,
                {},
                expected_status_code=status_code,
            )

    ########
    # Delete

    def test_no_one_can_delete(self):
        for user, status_code in [
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_403_FORBIDDEN),
            (self.org_user, status.HTTP_403_FORBIDDEN),
            (self.rp_user, status.HTTP_403_FORBIDDEN),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
            (self.generic_user, status.HTTP_403_FORBIDDEN),
        ]:
            self.assert_user_cannot_delete(
                reverse("feature-detail", args=(self.org1.plan.features.first().pk,)),
                user,
                expected_status_code=status_code,
            )
