from django.test import TestCase

from apps.common.models import Address, SocialMeta
from apps.common.tests.factories import RevEngineHistoricalChangeFactory
from apps.organizations.models import Organization
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory


class AddressTest(TestCase):
    def test_address_to_string(self):
        address1 = "123 Testing"
        address2 = "Suite 2"
        city = "Testville"
        state = "TS"
        postal_code = "54321"
        target_string = f"{address1} {address2}, {city}, {state} {postal_code}"
        address = Address.objects.create(
            address1=address1,
            address2=address2,
            city=city,
            state=state,
            postal_code=postal_code,
        )

        self.assertEqual(target_string, str(address))


class SocialMetaTest(TestCase):
    def setUp(self):
        self.title = "My Social Title"
        self.description = "My Social Description"
        self.url = "https://example.com"
        self.social_meta = SocialMeta.objects.create(title=self.title, description=self.description, url=self.url)
        self.revenue_program = RevenueProgramFactory()

    def test_social_meta_string(self):
        expected_unrelated_string = f"Social media Metatags: {self.title}"
        self.assertEqual(expected_unrelated_string, str(self.social_meta))

        # Add related model
        self.revenue_program.social_meta = self.social_meta
        self.revenue_program.save()

        expected_related_string = f'Social media Metatags for Revenue Program "{self.revenue_program.name}"'
        self.assertEqual(expected_related_string, str(self.social_meta))


class RevEngineHistoricalChangeTest(TestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.model = Organization
        self.app_label = "organizations"
        self.model_name = "organization"
        self.change = RevEngineHistoricalChangeFactory(
            app_label=self.app_label,
            model=self.model_name,
            object_id=self.organization.pk,
        )

    def test_get_object_history_admin_url(self):
        output = self.change.get_object_history_admin_url()
        self.assertTrue(
            all(
                [
                    isinstance(output, str),
                    str(self.change.object_id) in output,
                    self.app_label in output,
                    self.model_name in output,
                    str(self.organization.id) in output,
                ]
            )
        )
