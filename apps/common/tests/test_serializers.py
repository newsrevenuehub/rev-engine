from django.templatetags.static import static
from django.test import RequestFactory, TestCase

from apps.common.models import SocialMeta
from apps.common.serializers import SocialMetaInlineSerializer
from apps.common.tests.test_utils import get_test_image_file_jpeg
from apps.organizations.tests.factories import RevenueProgramFactory


class SocialMetaInlineSerializerTest(TestCase):
    def setUp(self):
        self.rp_name = "My RP"
        self.title = "My Title"
        self.description = "My Description"
        self.url = "https://www.testing.com"
        file = get_test_image_file_jpeg()
        file.url = "/media/whatever.png"
        self.card = get_test_image_file_jpeg()
        self.twitter_handle = "tweetzor"
        self.social_meta = SocialMeta.objects.create(
            title=self.title, description=self.description, url=self.url, card=self.card
        )
        self.revenue_program = RevenueProgramFactory(
            name=self.rp_name, social_meta=self.social_meta, twitter_handle=self.twitter_handle
        )
        self.serializer = SocialMetaInlineSerializer
        factory = RequestFactory()
        self.request = factory.get("/")

    def test_serializer_method_fields(self):
        serializer = self.serializer(self.social_meta, context={"request": self.request})
        self.assertEqual(serializer.data["title"], self.title)
        self.assertEqual(serializer.data["description"], self.description)
        self.assertEqual(serializer.data["url"], self.url)
        self.assertEqual(serializer.data["twitter_handle"], "@" + self.twitter_handle)
        self.assertEqual(serializer.data["revenue_program_name"], self.revenue_program.name)
        self.assertEqual(serializer.data["image_alt"], f"{self.revenue_program.name} social media card")
