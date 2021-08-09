from rest_framework.test import APITestCase

from apps.organizations.tests.factories import OrganizationFactory
from apps.pages.serializers import DonationPageFullDetailSerializer
from apps.pages.tests.factories import DonationPageFactory


class PageFullDetailSerializerTest(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.page = DonationPageFactory(organization=self.organization)
        self.serializer = DonationPageFullDetailSerializer

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

    def test_get_organization_name(self):
        serializer = self.serializer(self.page)
        data = serializer.data
        self.assertEqual(data["organization_name"], self.organization.name)
