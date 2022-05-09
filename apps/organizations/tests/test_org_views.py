import django.db.utils
from django.contrib.auth import get_user_model

from rest_framework.exceptions import ValidationError
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from apps.common.tests.test_resources import AbstractTestCase
from apps.organizations.models import Feature, Organization, Plan, RevenueProgram
from apps.organizations.tests.factories import (
    FeatureFactory,
    OrganizationFactory,
    PlanFactory,
    RevenueProgramFactory,
)
from apps.pages.tests.factories import DonationPageFactory


user_model = get_user_model()


class OrganizationViewSetTest(AbstractTestCase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse("organization-list")

    def test_list_of_orgs(self):
        self.login()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        orgs = Organization.objects.all()
        self.assertEqual(response.json()["count"], len(orgs))
        org_names = [o["name"] for o in response.json()["results"]]
        expected_org_names = [o.name for o in orgs]
        self.assertEqual(org_names, expected_org_names)

    def test_org_readonly(self):
        self.login()
        response = self.client.post(self.list_url, {"name": "API Org"})
        self.assertEqual(response.status_code, 405)
        self.assertEqual(Organization.objects.count(), self.org_count)

    def test_cannot_delete_organization(self):
        self.login()
        org = Organization.objects.first()
        old_pk = org.pk
        detail_url = f"/api/v1/organizations/{old_pk}/"
        self.client.delete(detail_url)
        self.assertEqual(Organization.objects.count(), self.org_count)


class RevenueProgramViewSetTest(AbstractTestCase):
    model = RevenueProgram
    model_factory = RevenueProgramFactory

    def setUp(self):
        super().setUp()
        self.list_url = reverse("revenue-program-list")
        self.detail_url = "/api/v1/revenue-programs"
        self.create_resources()

    def test_reverse_works(self):
        self.login()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)

    def test_list_returns_expected_count(self):
        revp = self.resources[0]
        self.authenticate_user_for_resource(revp)
        self.login()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        expected_count = RevenueProgram.objects.filter(organization=self.user.get_organization()).count()
        self.assertEqual(len(response.json()), expected_count)

    def test_created_and_list_are_equivalent(self):
        revp = self.resources[0]
        self.authenticate_user_for_resource(revp)
        self.login()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertListEqual(
            sorted([x["id"] for x in response.json()]),
            sorted(
                [
                    x
                    for x in RevenueProgram.objects.filter(organization=self.user.get_organization()).values_list(
                        "pk", flat=True
                    )
                ]
            ),
        )

    def test_viewset_is_readonly(self):
        """
        For now, revprogram viewset is readonly. Test to make sure we don't accidentally change that.
        """
        rp = RevenueProgram.objects.all().first()
        self.authenticate_user_for_resource(rp)
        self.login()
        new_name = "A New RevenueProgram Name"

        # Method PATCH Not Allowed
        response = self.client.patch(f"{self.detail_url}/{rp.pk}/", {"name": new_name})
        self.assertEqual(response.status_code, 405)

        # Method POST Not Allowed
        response = self.client.post(self.list_url, {"name": "New RevenueProgram", "organization": self.orgs[0].pk})
        self.assertEqual(response.status_code, 405)

    def test_pagination_disabled(self):
        revp = self.resources[0]
        self.authenticate_user_for_resource(revp)
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
        self.user = user_model.objects.create_user(email="test@test.com", password="testing")
        self.client.force_authenticate(user=self.user)

    def test_reverse_works(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)

    def test_list_returns_expected_count(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.json()["count"], 0)
        self.assertEqual(response.json()["count"], Plan.objects.count())


class FeatureViewSetTest(APITestCase):
    def setUp(self):
        self.limit_feature = FeatureFactory()
        self.list_url = reverse("feature-list")
        self.detail_url = "/api/v1/features"
        self.user = user_model.objects.create_user(email="test@test.com", password="testing")
        self.client.force_authenticate(user=self.user)

    def test_reverse_works(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)

    def test_list_returns_expected_count(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.json()["count"], 0)
        self.assertEqual(response.json()["count"], Feature.objects.count())

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
