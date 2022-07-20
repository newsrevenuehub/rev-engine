from django.test import TestCase

from apps.common.models import SocialMeta
from apps.organizations.tests.factories import RevenueProgramFactory


class SocialMetaTest(TestCase):
    def setUp(self):
        self.title = "My Social Title"
        self.description = "My Social Description"
        self.url = "https://example.com"
        self.social_meta = SocialMeta.objects.create(
            title=self.title, description=self.description, url=self.url, revenue_program=RevenueProgramFactory()
        )

    def test_social_meta_string(self):
        expected_related_string = f"Social media Metatags for RevenueProgram: {self.social_meta.revenue_program.name}"
        self.assertEqual(expected_related_string, str(self.social_meta))
