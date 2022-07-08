from django.test import TestCase

from apps.common.models import SocialMeta
from apps.organizations.tests.factories import RevenueProgramFactory


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
