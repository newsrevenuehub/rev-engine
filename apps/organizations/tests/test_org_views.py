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


class OrganziationStripeAccountIdActionTest(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.rev_program = RevenueProgramFactory(organization=self.organization)
        self.user = user_model.objects.create_user(email="test@test.com", password="testing")

    def _make_request(self, slug=""):
        self.client.force_authenticate(user=self.user)
        return self.client.get(reverse("organization-stripe-account-id"), {"revenue_program_slug": slug})

    def test_request_id_when_missing_required_param(self):
        response = self._make_request(slug="")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], 'Missing required parameter "revenue_program_slug"')

    def test_request_id_when_org_provider_not_verified(self):
        response = self._make_request(slug=self.rev_program.slug)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "Organization does not have a fully verified payment provider")

    def test_request_id_when_rev_program_slug_invalid(self):
        response = self._make_request(slug="no-such-rev-program")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "Could not find revenue program with provided slug")

    def test_request_id_when_everythings_fine(self):
        target_stripe_account_id = "my-test-id"
        self.organization.default_payment_provider = Organization.STRIPE[0]
        self.organization.stripe_account_id = target_stripe_account_id
        self.organization.stripe_verified = True
        self.organization.save()
        self.organization.refresh_from_db()
        response = self._make_request(slug=self.rev_program.slug)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["stripe_account_id"], target_stripe_account_id)


class RevenueProgramViewSetTest(AbstractTestCase):
    model = RevenueProgram
    model_factory = RevenueProgramFactory

    def setUp(self):
        super().setUp()
        self.list_url = reverse("revenue-program-list")
        self.detail_url = "/api/v1/revenue-programs"
        self.create_resources()

    def create_resources(self):
        self.orgs = Organization.objects.all()
        for i in range(self.resource_count):
            org_num = 0 if i % 2 == 0 else 1
            self.model_factory.create(organization=self.orgs[org_num])
        self.resources = self.model.objects.all()

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
        self.assertEqual(response.json()["count"], expected_count)

    def test_created_and_list_are_equivalent(self):
        revp = self.resources[0]
        self.authenticate_user_for_resource(revp)
        self.login()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [x["id"] for x in response.json()["results"]],
            [
                x
                for x in RevenueProgram.objects.filter(organization=self.user.get_organization()).values_list(
                    "pk", flat=True
                )
            ],
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
        for i in range(3):
            try:
                DonationPageFactory(organization=org)
            except ValidationError as e:
                self.fail(f"Save raised a validation error on expected valid inputs: {e.message}")
        with self.assertRaises(ValidationError) as cm:
            DonationPageFactory(organization=org)
        self.assertEquals(
            str(cm.exception.detail[0]),
            f"Your organization has reached its limit of {self.limit_feature.feature_value} pages",
        )
