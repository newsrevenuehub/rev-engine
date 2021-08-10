from django.contrib.auth import get_user_model

from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

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

        rp_count = 3
        bl_count = 3
        b_per_bl_count = 2

        organization = OrganizationFactory()

        for _ in range(rp_count):
            RevenueProgramFactory(organization=organization)

        for _ in range(bl_count):
            benefit_level = BenefitLevelFactory()
            for _ in range(b_per_bl_count):
                benefit = BenefitFactory()
                benefit_level.benefits.add(benefit)

    def _make_request_to(self, url):
        self.client.force_authenticate(user=self.user)
        return self.client.get(url)

    def _get_detail_url_for_pk(self, rp_pk):
        return reverse("revenueprogram-detail", pk=rp_pk)

    def test_list_view_contains_url_to_detail_view(self):
        response = self._make_request_to(self.list_url)
        pass
