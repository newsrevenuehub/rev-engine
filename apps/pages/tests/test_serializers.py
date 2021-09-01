from rest_framework.test import APITestCase

from apps.organizations.models import BenefitLevelBenefit, RevenueProgramBenefitLevel
from apps.organizations.tests.factories import (
    BenefitFactory,
    BenefitLevelFactory,
    OrganizationFactory,
    RevenueProgramFactory,
)
from apps.pages.serializers import DonationPageFullDetailSerializer
from apps.pages.tests.factories import DonationPageFactory


class DonationPageFullDetailSerializerTest(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()

        self.benefit_1 = BenefitFactory(organization=self.organization)
        self.benefit_2 = BenefitFactory(organization=self.organization)

        self.benefit_level_1 = BenefitLevelFactory(organization=self.organization)

        BenefitLevelBenefit.objects.create(benefit_level=self.benefit_level_1, benefit=self.benefit_1, order=1)
        BenefitLevelBenefit.objects.create(benefit_level=self.benefit_level_1, benefit=self.benefit_2, order=2)

        self.benefit_level_2 = BenefitLevelFactory(organization=self.organization)

        BenefitLevelBenefit.objects.create(benefit_level=self.benefit_level_2, benefit=self.benefit_1, order=1)

        self.revenue_program = RevenueProgramFactory(organization=self.organization)

        RevenueProgramBenefitLevel.objects.create(
            revenue_program=self.revenue_program, benefit_level=self.benefit_level_1, level=1
        )
        RevenueProgramBenefitLevel.objects.create(
            revenue_program=self.revenue_program, benefit_level=self.benefit_level_2, level=2
        )

        self.page = DonationPageFactory(organization=self.organization, revenue_program=self.revenue_program)
        self.serializer = DonationPageFullDetailSerializer

    def test_get_benefit_levels(self):
        serializer = self.serializer(self.page)
        data = serializer.data

        # Should have the righ amount of benefit levels...
        self.assertEqual(len(data["benefit_levels"]), 2)
        # ...and they should be in the right order.
        self.assertEqual(data["benefit_levels"][0]["name"], self.benefit_level_1.name)

        # Benefit level should have the right number of benefits...
        self.assertEqual(len(data["benefit_levels"][0]["benefits"]), 2)
        # ...and they should be in the right order.
        self.assertEqual(data["benefit_levels"][0]["benefits"][0]["name"], self.benefit_1.name)

    def test_get_organization_is_nonprofit(self):
        # Set it true, expect it in page serializer
        self.organization.non_profit = True
        self.organization.save()
        self.organization.refresh_from_db()
        serializer = self.serializer(self.page)
        data = serializer.data
        self.assertEqual(data["organization_is_nonprofit"], True)

        # Set it false, expect it in page serializer
        self.organization.non_profit = False
        self.organization.save()
        self.organization.refresh_from_db()
        serializer = self.serializer(self.page)
        data = serializer.data
        self.assertEqual(data["organization_is_nonprofit"], False)
