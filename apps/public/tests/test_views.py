from django.contrib.auth import get_user_model

from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from apps.organizations.models import (
    BenefitLevelBenefit,
    RevenueProgram,
    RevenueProgramBenefitLevel,
)
from apps.organizations.tests.factories import (
    BenefitFactory,
    BenefitLevelFactory,
    OrganizationFactory,
    RevenueProgramFactory,
)


user_model = get_user_model()


class RevenueProgramViewsetTest(APITestCase):
    def setUp(self):
        self.user = user_model.objects.create_superuser(email="superuser@test.com", password="testing")
        self.list_url = reverse("revenueprogram-list")

        self.rp_count = 3
        self.bl_count = 3
        self.b_per_bl_count = 2

        organization = OrganizationFactory()

        for _ in range(self.rp_count):
            revenue_program = RevenueProgramFactory(organization=organization)
            for i in range(self.bl_count):
                benefit_level = BenefitLevelFactory(organization=organization)
                RevenueProgramBenefitLevel.objects.create(
                    benefit_level=benefit_level, revenue_program=revenue_program, level=i
                )
                for j in range(self.b_per_bl_count):
                    benefit = BenefitFactory(organization=organization)
                    BenefitLevelBenefit.objects.create(benefit=benefit, benefit_level=benefit_level, order=j)

    def _make_request_to(self, url):
        self.client.force_authenticate(user=self.user)
        return self.client.get(url)

    def _get_detail_url_for_pk(self, rp_pk):
        return reverse("revenueprogram-detail", kwargs={"pk": rp_pk})

    def test_list_view_contains_url_to_detail_view(self):
        response = self._make_request_to(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], self.rp_count)

        for rp_data in response.data["results"]:
            self.assertIn("url", rp_data)
            rp_detail_url = self._get_detail_url_for_pk(rp_data["id"])
            self.assertEqual(rp_data["url"], "http://testserver" + rp_detail_url)

    def test_detail_view_contains_expanded_benefits(self):
        revenue_program = RevenueProgram.objects.first()
        detail_url = self._get_detail_url_for_pk(revenue_program.pk)
        response = self._make_request_to(detail_url)

        self.assertEqual(response.status_code, 200)
        self.assertIn("benefit_levels", response.data)
        benefit_levels = response.data["benefit_levels"]
        self.assertEqual(len(benefit_levels), self.bl_count)
        benefit_level = benefit_levels[0]
        self.assertIn("benefits", benefit_level)
        self.assertEqual(len(benefit_level["benefits"]), self.b_per_bl_count)
