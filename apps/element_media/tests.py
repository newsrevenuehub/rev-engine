import json
from uuid import uuid4

import pytest

from apps.pages.tests.factories import DonationPageFactory

from .models import MediaImage, get_thumbnail


@pytest.fixture
def dummy_image_no_extension(test_jpeg_file):
    test_jpeg_file.name = "dummy_image_no_extension"
    return test_jpeg_file


@pytest.mark.parametrize("image", ["test_jpeg_file", "dummy_image_no_extension"])
def test_get_thumbnail(request, image):
    img_file = request.getfixturevalue(image)
    get_thumbnail(img_file)


@pytest.mark.django_db
class TestMediaImage:

    @pytest.fixture
    def image_instance(self, test_jpeg_file):
        return MediaImage.objects.create(
            spa_key=uuid4(),
            page_id=DonationPageFactory(),
            image=test_jpeg_file,
            thumbnail=get_thumbnail(test_jpeg_file),
        )

    def test__str__(self, image_instance):
        assert str(image_instance) == image_instance.image.name

    def test_create_from_request_when_no_sidebar_elements(self, image_instance, donation_page):
        count = MediaImage.objects.count()
        donation_page = image_instance.page_id
        MediaImage.create_from_request({}, {}, donation_page.id)
        assert MediaImage.objects.count() == count

    def test_create_from_request_when_sidebar_elements(self, image_instance, donation_page):
        count = MediaImage.objects.count()
        donation_page = image_instance.page_id
        data = {
            "sidebar_elements": json.dumps(
                [
                    {"uuid": f"{uuid4()}", "type": "DReason", "content": ""},
                    {"uuid": (img_id := f"{uuid4()}"), "type": "DImage", "content": ""},
                ]
            )
        }
        files = {img_id: image_instance.image}
        MediaImage.create_from_request(data, files, donation_page.id)
        assert MediaImage.objects.count() == count + 1

    def test_create_from_request_when_no_image_files(self, donation_page):
        data = {
            "sidebar_elements": json.dumps(
                [
                    {"uuid": f"{uuid4()}", "type": "DReason", "content": ""},
                    {"uuid": f"{uuid4()}", "type": "DImage", "content": ""},
                ]
            )
        }
        MediaImage.create_from_request(data, {}, donation_page.id)
        assert not MediaImage.objects.all()
