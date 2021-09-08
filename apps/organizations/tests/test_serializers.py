from rest_framework.test import APITestCase

from apps.common.models import SocialMeta
from apps.organizations.serializers import RevenueProgramListInlineSerializer
from apps.organizations.tests.factories import RevenueProgramFactory


class RevenueProgramListInlineSerializerTest(APITestCase):
    def setUp(self):
        self.revenue_program = RevenueProgramFactory()

    def _add_social_to_revenue_program(self, social_data, revenue_program):
        social_meta = SocialMeta.objects.create(**social_data)
        revenue_program.social_meta = social_meta
        revenue_program.save()

    def test_social_meta_flattened_with_blank(self):
        social_data = {
            "title": "",
            "description": "",
            "url": "",
            "card": "",
        }
        self._add_social_to_revenue_program(social_data, self.revenue_program)
        serializer = RevenueProgramListInlineSerializer(self.revenue_program)
        revprogram_data = serializer.data

        # social data should be present at the first level of rev program data (not nested)
        for k, v in social_data.items():
            # social data gets prepended with "social_"
            social_key = "social_" + k
            self.assertIn(social_key, revprogram_data, social_key)
            if k == "card":
                self.assertIsNone(revprogram_data[social_key])
            else:
                self.assertEqual(revprogram_data[social_key], v)

    def test_social_meta_flattened_with_non_blank(self):
        social_data = {
            "title": "My Social Testing Title",
            "description": "My Social description is usually a bit longer. One or two sentences is the recommended length.",
            "url": "https://www.testing.com",
            "card": "/some-image.png",
        }
        self._add_social_to_revenue_program(social_data, self.revenue_program)
        serializer = RevenueProgramListInlineSerializer(self.revenue_program)
        revprogram_data = serializer.data

        # social data should be present at the first level of rev program data (not nested)
        for k, v in social_data.items():
            # social data gets prepended with "social_"
            social_key = "social_" + k
            social_value = v
            self.assertIn(social_key, revprogram_data, social_key)
            if k == "card":
                social_value = "/media" + social_value
            self.assertEqual(revprogram_data[social_key], social_value)
