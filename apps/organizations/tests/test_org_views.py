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
    model = RevenueProgram
    model_factory = RevenueProgramFactory

    def setUp(self):
        super().setUp()
        self.user = user_model.objects.create_superuser(email="superuser@example.com", password="password")
        self.list_url = reverse("revenue-program-list")
        self.detail_url = "/api/v1/revenue-programs"
        self.create_resources()

    def test_reverse_works(self):
        self.login()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)

    def test_list_returns_expected_count(self):
        self.login()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        expected_count = RevenueProgram.objects.count()
        self.assertEqual(len(response.json()), expected_count)

    def test_created_and_list_are_equivalent(self):
        self.login()
        response = self.client.get(self.list_url)
        self.assertEqual([x["id"] for x in response.json()], list(RevenueProgram.objects.values_list("pk", flat=True)))

    def test_viewset_is_readonly(self):
        """
        For now, revprogram viewset is readonly. Test to make sure we don't accidentally change that.
        """
        rp = RevenueProgram.objects.all().first()
        self.login()
        new_name = "A New RevenueProgram Name"

        # Method PATCH Not Allowed
        response = self.client.patch(f"{self.detail_url}/{rp.pk}/", {"name": new_name})
        self.assertEqual(response.status_code, 405)

        # Method POST Not Allowed
        response = self.client.post(self.list_url, {"name": "New RevenueProgram", "organization": self.orgs[0].pk})
        self.assertEqual(response.status_code, 405)

    def test_pagination_disabled(self):
        self.login()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        # 'count' and 'results' keys are only present in paginated responses
        self.assertNotIn("count", response.json())
        self.assertNotIn("results", response.json())


class PlanViewSetTest(APITestCase):
    def setUp(self):
        self.obj_count = 5
        for i in range(self.obj_count):
            PlanFactory()
        self.list_url = reverse("plan-list")
        self.detail_url = "/api/v1/plans"
        self.user = user_model.objects.create_superuser(email="superuser@test.com", password="password")
        self.client.force_authenticate(user=self.user)

    def test_reverse_works(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)

    def test_list_returns_expected_count(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(len(response.json()), 0)
        self.assertEqual(len(response.json()), Plan.objects.count())


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
