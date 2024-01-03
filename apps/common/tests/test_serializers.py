from django.test import RequestFactory, TestCase

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
        rp = RevenueProgramFactory(name=self.rp_name, twitter_handle=self.twitter_handle)
        self.revenue_program = rp
        self.social_meta = rp.socialmeta
        self.serializer = SocialMetaInlineSerializer
        factory = RequestFactory()
        self.request = factory.get("/")

    def test_serializer_method_fields(self):
        serializer = self.serializer(self.social_meta, context={"request": self.request})
        self.assertEqual(serializer.data["title"], "Join | My RP")
        self.assertEqual(serializer.data["description"], "My RP is supported by people like you. Support My RP today.")
        self.assertEqual(serializer.data["url"], "https://fundjournalism.org")
        self.assertEqual(serializer.data["twitter_handle"], "@" + self.twitter_handle)
        self.assertEqual(serializer.data["revenue_program_name"], self.revenue_program.name)
        self.assertEqual(serializer.data["image_alt"], "fund journalism social media card")
