import json
from uuid import uuid4

from django.test import override_settings

from sorl.thumbnail import get_thumbnail

from apps.common.tests.test_utils import (
    get_random_jpg_filename,
    get_test_image_binary,
    get_test_image_file_jpeg,
)

from ..common.tests.test_resources import AbstractTestCase
from .models import MediaImage


def setup_sidebar_fixture(e_type="DImage", extra=False):
    img1 = get_test_image_file_jpeg(filename=get_random_jpg_filename())
    img2 = get_test_image_file_jpeg(filename=get_random_jpg_filename())
    img3 = get_test_image_file_jpeg(filename=get_random_jpg_filename())
    uuid1 = uuid4()
    uuid2 = uuid4()
    sidebar_elements = {
        "sidebar_elements": [
            {"uuid": f"{uuid1}", "type": e_type, "content": ""},
            {"uuid": f"{uuid2}", "type": e_type, "content": ""},
        ]
    }
    if extra:
        uuid3 = uuid4()
        extra_elem = {
            "uuid": f"{uuid3}",
            "type": e_type,
            "content": {"url": f"/media/images/{img3.name}", "thumbnail": f"/media/thumbs/{img3.name}"},
        }
        sidebar_elements["sidebar_elements"].append(extra_elem)
    sidebar_elements["sidebar_elements"] = json.dumps(sidebar_elements["sidebar_elements"])

    files = {
        f"{uuid1}": img1,
        f"{uuid2}": img2,
    }
    return sidebar_elements, files


@override_settings(MEDIA_ROOT="/tmp/media")
@override_settings(MEDIA_URL="/media/")
class TestMediaImage(AbstractTestCase):
    def setUp(self):
        self.dp = self.create_donation_page()

    def test_no_media_resources_yet(self):
        assert not MediaImage.objects.all()

    def test_model_creation(self):
        mi = MediaImage.objects.create(
            spa_key=uuid4(), image=get_test_image_file_jpeg(filename=get_random_jpg_filename()), page_id=self.dp
        )
        assert str(mi) == mi.image.name
        assert MediaImage.objects.all().count() == 1

    def test_serialized_representation(self):
        mi = MediaImage.objects.create(
            spa_key=uuid4(), image=get_test_image_file_jpeg(filename=get_random_jpg_filename()), page_id=self.dp
        )
        mi.thumbnail = get_thumbnail(mi.image, geometry_string="300").url
        mi.save()
        mi.refresh_from_db()
        serialized = mi.get_as_dict()
        assert serialized.get("uuid") == str(mi.spa_key)
        assert serialized.get("type") == "DImage"
        assert serialized.get("content").get("url") == mi.image.storage.url(name=mi.image.name)
        assert serialized.get("content").get("thumbnail") == mi.thumbnail.storage.url(name=mi.thumbnail.name)

    def test_link_multiple_images_to_page(self):
        sidebar, files = setup_sidebar_fixture()
        result = MediaImage.create_from_request(data=sidebar, files=files, donation_page=self.dp.pk)

        assert len(result["sidebar_elements"]) == 2
        for res in result["sidebar_elements"]:
            assert res["content"] != ""

    def test_class_creation_returns_with_no_sidebar(self):
        sidebar, files = setup_sidebar_fixture()
        bar = {"not_sidebar": sidebar["sidebar_elements"]}
        result = MediaImage.create_from_request(data=bar, files=files, donation_page=self.dp.pk)
        assert result == bar

    def test_no_creation_if_no_images(self):
        sidebar, files = setup_sidebar_fixture(e_type="DRichText")
        MediaImage.create_from_request(data=sidebar, files=files, donation_page=self.dp.pk)
        assert not MediaImage.objects.all()

    def test_existing_uuid_with_no_file(self):
        sidebar, files = setup_sidebar_fixture(extra=True)
        result = MediaImage.create_from_request(data=sidebar, files=files, donation_page=self.dp.pk)
        assert MediaImage.objects.all().count() == 2
        assert len(result["sidebar_elements"]) == 3
