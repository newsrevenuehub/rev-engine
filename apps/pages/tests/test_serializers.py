from django.utils import timezone

from rest_framework.test import APITestCase

from apps.organizations.models import BenefitLevelBenefit, RevenueProgramBenefitLevel
from apps.organizations.tests.factories import (
    BenefitFactory,
    BenefitLevelFactory,
    OrganizationFactory,
    RevenueProgramFactory,
)
from apps.pages.serializers import DonationPageFullDetailSerializer, StyleListSerializer
from apps.pages.tests.factories import DonationPageFactory, StyleFactory


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

    def test_get_organization_address_with_org_addr1(self):
        self.organization.org_addr1 = "PO Box 321"
        self.organization.org_addr2 = "123 Fake Street"
        self.organization.org_city = "San Francisco"
        self.organization.org_state = "CA"
        self.organization.org_zip = "54321"
        self.organization.save()
        self.organization.refresh_from_db()
        serializer = self.serializer(self.page)
        data = serializer.data
        self.assertIn("PO Box 321", data["organization_address"])
        self.assertIn("123 Fake Street", data["organization_address"])
        self.assertIn("San Francisco", data["organization_address"])
        self.assertIn("CA", data["organization_address"])
        self.assertIn("54321", data["organization_address"])

    def test_get_organization_address_without_org_addr1(self):
        self.organization.org_addr1 = ""
        self.organization.save()
        self.organization.refresh_from_db()
        serializer = self.serializer(self.page)
        data = serializer.data
        self.assertIsNone(data["organization_address"])

    def test_get_organization_contact_email(self):
        contact_email = "testing@test.com"
        self.organization.contact_email = contact_email
        self.organization.save()
        self.organization.refresh_from_db()
        serializer = self.serializer(self.page)
        data = serializer.data
        self.assertEqual(data["organization_contact_email"], contact_email)

    def test_get_organization_name(self):
        serializer = self.serializer(self.page)
        data = serializer.data
        self.assertEqual(data["organization_name"], self.organization.name)


class StyleListSerializerTest(APITestCase):
    def setUp(self):
        self.style_1 = StyleFactory()
        self.style_2 = StyleFactory()
        self.donation_page_live = DonationPageFactory(published_date=timezone.now(), styles=self.style_1)
        self.donation_page_unlive = DonationPageFactory(styles=self.style_2)
        self.serializer = StyleListSerializer

    def test_get_used_live(self):
        live_style_serializer = self.serializer(self.style_1)
        nonlive_style_serializer = self.serializer(self.style_2)

        self.assertIn("used_live", live_style_serializer.data)
        self.assertTrue(live_style_serializer.data["used_live"])
        self.assertIn("used_live", nonlive_style_serializer.data)
        self.assertFalse(nonlive_style_serializer.data["used_live"])
