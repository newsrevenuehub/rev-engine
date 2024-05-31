from django.contrib.auth import get_user_model

from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from apps.organizations.models import BenefitLevelBenefit, RevenueProgram
from apps.organizations.tests.factories import (
    BenefitFactory,
    BenefitLevelFactory,
    OrganizationFactory,
    PaymentProviderFactory,
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
            payment_provider = PaymentProviderFactory()
            revenue_program = RevenueProgramFactory(organization=organization, payment_provider=payment_provider)
            for _ in range(self.bl_count):
                benefit_level = BenefitLevelFactory(revenue_program=revenue_program, lower_limit=7, upper_limit=13)
                for j in range(self.b_per_bl_count):
                    benefit = BenefitFactory(revenue_program=revenue_program)
                    BenefitLevelBenefit.objects.create(benefit=benefit, benefit_level=benefit_level, order=j)

    def _make_request_to(self, url):
        self.client.force_authenticate(user=self.user)
        return self.client.get(url)

    def _get_detail_url_for_pk(self, rp_pk):
        return reverse("revenueprogram-detail", kwargs={"pk": rp_pk})

    def test_list_view_contains_url_to_detail_view(self):
        response = self._make_request_to(self.list_url)
        assert response.status_code == 200
        assert response.data["count"] == self.rp_count

        for rp_data in response.data["results"]:
            assert "url" in rp_data
            rp_detail_url = self._get_detail_url_for_pk(rp_data["id"])
            assert rp_data["url"] == "http://testserver" + rp_detail_url

    def test_detail_view_contains_expanded_benefits(self):
        revenue_program = RevenueProgram.objects.first()
        detail_url = self._get_detail_url_for_pk(revenue_program.pk)
        response = self._make_request_to(detail_url)

        assert response.status_code == 200
        assert "benefit_levels" in response.data
        benefit_levels = response.data["benefit_levels"]
        assert len(benefit_levels) == self.bl_count
        benefit_level = benefit_levels[0]
        assert "benefits" in benefit_level
        assert len(benefit_level["benefits"]) == self.b_per_bl_count

    def test_benefits_contains_lower_upper_and_range(self):
        # donation_range is older, kept for backwards compatibility.
        # lower_limit, upper_limit are same data as separate fields.
        revenue_program = RevenueProgram.objects.first()
        detail_url = self._get_detail_url_for_pk(revenue_program.pk)
        response = self._make_request_to(detail_url)
        assert response.status_code == 200
        benefit_levels = response.data["benefit_levels"]
        benefit_level = benefit_levels[0]
        assert "benefits" in benefit_level
        assert benefit_level["donation_range"] == "$7-13"
        assert benefit_level["lower_limit"] == 7
        assert benefit_level["upper_limit"] == 13

    def test_view_with_stripe_account_id_filter(self):
        revenue_program = RevenueProgram.objects.first()
        url = f"{self.list_url}?stripe_account_id={revenue_program.payment_provider.stripe_account_id}"
        response = self._make_request_to(url)
        assert response.status_code == 200
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == revenue_program.id

    def test_detail_view_has_stripe_account_id(self):
        revenue_program = RevenueProgram.objects.first()
        detail_url = self._get_detail_url_for_pk(revenue_program.pk)
        response = self._make_request_to(detail_url)
        assert (
            response.data["payment_provider"]["stripe_account_id"] == revenue_program.payment_provider.stripe_account_id
        )

    def test_list_view_contains_stripe_account_id(self):
        response = self._make_request_to(self.list_url)
        assert response.status_code == 200
        assert response.data["count"] == self.rp_count

        for rp_data in response.data["results"]:
            assert "url" in rp_data
            assert rp_data["payment_provider"]["stripe_account_id"] is not None
