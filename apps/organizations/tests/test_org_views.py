from django.utils.text import slugify

from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from apps.organizations.models import Feature, Organization, Plan, RevenueProgram
from apps.organizations.tests.factories import (
    FeatureFactory,
    OrganizationFactory,
    PlanFactory,
    RevenueProgramFactory,
)


class OrganizationViewSetTest(APITestCase):
    def setUp(self):
        self.org_count = 5
        for i in range(self.org_count):
            OrganizationFactory()
        self.list_url = reverse("organization-list")

    def test_list_of_orgs(self):
        response = self.client.get(self.list_url)
        orgs = Organization.objects.all()
        self.assertEqual(response.json()["count"], len(orgs))
        org_names = [o["name"] for o in response.json()["results"]]
        expected_org_names = [o.name for o in orgs]
        self.assertEqual(org_names, expected_org_names)

    def test_create_org(self):
        response = self.client.post(self.list_url, {"name": "API Org"})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Organization.objects.count(), self.org_count + 1)

    def test_slug_created(self):
        response = self.client.post(self.list_url, {"name": "API Org"})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["slug"], slugify(response.data["name"], allow_unicode=True))

    def test_supplied_slug_does_not_apply(self):
        response = self.client.post(self.list_url, {"name": "API Org", "slug": "my-made-up-slug"})
        self.assertNotEqual(response.data["slug"], "my-made-up-slug")
        self.assertEqual(response.data["slug"], slugify(response.data["name"], allow_unicode=True))

    def test_update_org_name_does_not_apply(self):
        org = Organization.objects.first()
        old_name = org.name
        old_pk = org.pk
        detail_url = f"/api/v1/organizations/{old_pk}/"
        new_name = "A new name"
        self.client.patch(detail_url, {"name": new_name})
        org.refresh_from_db()
        self.assertEqual(org.name, old_name)
        self.assertNotEqual(org.name, new_name)

    def test_delete_organization(self):
        org = Organization.objects.first()
        old_pk = org.pk
        detail_url = f"/api/v1/organizations/{old_pk}/"
        self.client.delete(detail_url)
        self.assertEqual(Organization.objects.count(), self.org_count - 1)
        assert not Organization.objects.filter(pk=old_pk).first()

    def test_org_list_uses_list_serializer(self):
        response = self.client.get(self.list_url)
        self.assertNotIn("org_addr1", response.json())

    def test_org_detail_uses_detail_serializer(self):
        org = Organization.objects.all().first()
        response = self.client.get(f"/api/v1/organizations/{org.pk}/")
        self.assertIn("org_addr1", response.json())


class RevenueProgramViewSetTest(APITestCase):
    def setUp(self):
        self.rp_count = 5
        for i in range(self.rp_count):
            RevenueProgramFactory()
        self.list_url = reverse("revenueprogram-list")
        self.detail_url = "/api/v1/revenue-programs"

    def test_reverse_works(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)

    def test_list_returns_expected_count(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], RevenueProgram.objects.count())

    def test_created_and_list_are_equivalent(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [x["id"] for x in response.json()["results"]],
            [x for x in RevenueProgram.objects.values_list("pk", flat=True)],
        )

    def test_revenue_program_create_add_program(self):
        org = OrganizationFactory()
        response = self.client.post(self.list_url, {"name": "New RevenueProgram", "organization": org.pk})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(RevenueProgram.objects.count(), self.rp_count + 1)

    def test_cannot_update_revenue_program_name(self):
        rp = RevenueProgram.objects.all().first()
        new_name = "A New RevenueProgram Name"
        response = self.client.patch(f"{self.detail_url}/{rp.pk}/", {"name": new_name})
        self.assertNotEqual(response.data["name"], new_name)

    def test_cannot_update_revenue_program_slug(self):
        rp = RevenueProgram.objects.all().first()
        new_slug = "a-new-slug"
        response = self.client.patch(f"{self.detail_url}/{rp.pk}/", {"name": new_slug})
        self.assertNotEqual(response.data["slug"], new_slug)


class PlanViewSetTest(APITestCase):
    # Stubbing these tests since we haven't really built out the business logic yet.
    def setUp(self):
        self.obj_count = 5
        for i in range(self.obj_count):
            PlanFactory()
        self.list_url = reverse("plan-list")
        self.detail_url = "/api/v1/plans"

    def test_reverse_works(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)

    def test_list_returns_expected_count(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.json()["count"], 0)
        self.assertEqual(response.json()["count"], Plan.objects.count())


class FeatureViewSetTest(APITestCase):
    # Stubbing these tests since we haven't really built out the business logic yet.
    def setUp(self):
        self.obj_count = 5
        for i in range(self.obj_count):
            FeatureFactory()
        self.list_url = reverse("feature-list")
        self.detail_url = "/api/v1/features"

    def test_reverse_works(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)

    def test_list_returns_expected_count(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.json()["count"], 0)
        self.assertEqual(response.json()["count"], Feature.objects.count())
