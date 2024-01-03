from django.test import TestCase

from apps.organizations.tests.factories import RevenueProgramFactory


class SocialMetaTest(TestCase):
    def setUp(self):
        rp = RevenueProgramFactory()
        self.social_meta = rp.socialmeta

    def test_social_meta_string(self):
        expected_related_string = f"Social media Metatags for RevenueProgram: {self.social_meta.revenue_program.name}"
        self.assertEqual(expected_related_string, str(self.social_meta))
