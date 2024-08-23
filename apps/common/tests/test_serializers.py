import pytest
from rest_framework.test import APIRequestFactory

from apps.common.serializers import SocialMetaInlineSerializer
from apps.organizations.tests.factories import RevenueProgramFactory


@pytest.mark.django_db
def test_socialmetainlineserializer():
    rp = RevenueProgramFactory(twitter_handle="tweetzor")
    serializer = SocialMetaInlineSerializer(rp.socialmeta, context={"request": APIRequestFactory().get("/")})
    assert serializer.data["title"] == f"Join | {rp.name}"
    assert serializer.data["description"] == f"{rp.name} is supported by people like you. Support {rp.name} today."
    assert serializer.data["url"] == "https://fundjournalism.org"
    assert serializer.data["twitter_handle"] == f"@{rp.twitter_handle}"
    assert serializer.data["revenue_program_name"] == rp.name
    assert serializer.data["image_alt"] == "fund journalism social media card"
