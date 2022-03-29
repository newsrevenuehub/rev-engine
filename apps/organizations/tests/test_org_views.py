import django.db.utils
from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from apps.api.tests import DomainModelBootstrappedTestCase
from apps.organizations.models import Feature, Organization, Plan, RevenueProgram
from apps.organizations.tests.factories import (
    FeatureFactory,
    OrganizationFactory,
    PlanFactory,
    RevenueProgramFactory,
)
from apps.pages.tests.factories import DonationPageFactory
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

    def assert_user_can_list_orgs(self, user):
        org_count = Organization.objects.count()
        self.assert_user_can_list(self.list_url, user, org_count, results_are_flat=True)

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
            self.assert_user_can_list_orgs(user)
            self.assert_user_cannot_create_an_org(user)
            self.assert_user_cannot_udpate_an_org(user)
            self.assert_user_cannot_delete_an_org(user)


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

    def test_superuser_can_read(self):
        self.assert_superuser_can_get(reverse("plan-detail", args=(Plan.objects.first().pk,)))
        self.assertGreater(expected_count := Plan.objects.count())
        self.assert_superuser_can_list(self.list_url, expected_count)

    def test_hub_user_can_read(self):
        self.assert_hub_admin_can_get(reverse("plan-detail", args=(Plan.objects.first().pk,)))
        self.assertGreater(expected_count := Plan.objects.count(), 1)
        self.assert_hub_admin_can_list(self.list_url, expected_count, results_are_flat=True)

    def assert_user_cannot_modify_or_create(self, user, detail_url, list_url, expected_status_code):
        self.assert_user_cannot_delete(detail_url, user, expected_status_code=expected_status_code)
        self.assert_user_cannot_patch(detail_url, user, expected_status_code=expected_status_code)
        self.assert_user_cannot_post(list_url, user, expected_status_code=expected_status_code)

    def test_org_user_can_retrieve_their_plan(self):
        detail_url = reverse("plan-detail", args=(self.org1.plan,))
        self.assert_org_admin_can_get(detail_url)

    def test_org_user_cannot_retrieve_a_plan_they_do_not_own(self):
        detail_url = reverse("plan-detail", args=(self.org2.plan,))
        self.assert_org_admin_cannot_get(detail_url)

    def test_org_user_can_list_their_plans(self):
        return self.assert_org_admin_can_list(
            self.list_url, 1, assert_item=lambda x: x["id"] == self.org1.pk, results_are_flat=True
        )

    def test_rp_user_can_retrieve_their_orgs_plan(self):
        detail_url = reverse("plan-detail", args=(self.org1.plan,))
        self.assert_rp_user_can_get(detail_url)

    def test_rp_user_cannot_retrieve_another_orgs_plan(self):
        detail_url = reverse("plan-detail", args=(self.org2.plan,))
        self.assert_rp_user_cannot_get(detail_url)

    def test_rp_user_can_list_their_orgs_plans(self):
        return self.assert_rp_user_can_list(
            self.list_url, 1, assert_item=lambda x: x["id"] == self.org1.pk, results_are_flat=True
        )

    def test_no_users_can_modify_or_create(self):
        detail_url = reverse("plan-detail", args=(Plan.objects.first().pk,))
        for pairing in (
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.org_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.rp_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
        ):
            user, code = pairing
            self.assert_user_cannot_modify_or_create(user, detail_url, self.list_url, code)


class FeatureViewSetTest(APITestCase):
    def setUp(self):
        self.limit_feature = FeatureFactory()
        self.list_url = reverse("feature-list")
        self.detail_url = "/api/v1/features"
        self.user = user_model.objects.create_superuser(email="superuser@test.com", password="testing")
        self.client.force_authenticate(user=self.user)

    def test_non_superuser_cannot_access(self):
        non_superuser = user_model.objects.create_user(email="test@test.com", password="testing")
        self.client.force_authenticate(user=non_superuser)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 403)

    def test_reverse_works(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)

    def test_list_returns_expected_count(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(len(response.json()), 0)
        self.assertEqual(len(response.json()), Feature.objects.count())

    def test_unique_value(self):
        with self.assertRaises(django.db.utils.IntegrityError):
            FeatureFactory(feature_value=self.limit_feature.feature_value)

    def test_feature_limits_page_creation(self):
        self.limit_feature.feature_value = "3"
        self.limit_feature.save()
        plan = PlanFactory()
        plan.features.add(self.limit_feature)
        plan.save()
        org = OrganizationFactory(plan=plan)
        rev_program = RevenueProgramFactory(organization=org)
        for i in range(3):
            try:
                DonationPageFactory(revenue_program=rev_program)
            except ValidationError as e:
                self.fail(f"Save raised a validation error on expected valid inputs: {e.message}")
        with self.assertRaises(ValidationError) as cm:
            DonationPageFactory(revenue_program=rev_program)
        self.assertEquals(
            str(cm.exception.detail["non_field_errors"][0]),
            f"Your organization has reached its limit of {self.limit_feature.feature_value} pages",
        )
