import io
import json

from django.apps import apps
from django.core.files.images import ImageFile
from django.db import models

from sorl.thumbnail import ImageField as SorlImageField

from apps.common.models import IndexedTimeStampedModel


class MediaImage(IndexedTimeStampedModel):
    spa_key = models.UUIDField(blank=True)
    page_id = models.ForeignKey("pages.DonationPage", null=False, on_delete=models.CASCADE)
    height = models.PositiveIntegerField()
    width = models.PositiveIntegerField()
    image = SorlImageField(upload_to="images", height_field="height", width_field="width")
    image_attrs = models.JSONField(blank=True)

    @classmethod
    def create_from_request(cls, data: [dict], files: {}, donation_page, image_key="DImage") -> [dict]:
        """Takes a request.data and builds a MediaImage instance from the json blob data found in the files dict.

        Expected Schemas:
            data = [{"uuid": str, "type": "DImage", "content": {"name": str(filename)}}, n...]
            files = {"str(<UUID>)": Blob}
        :param data: A copy of the request data.
        :param files: A list of dicts. Key=UUID in the request.data for the image element
        :param donation_page: the page that these images are referenced on.
        :param image_key: The key that identifies an Image element.
        :return: The data[dict] array with a "url" key and value in the content.
        """
        mutable = json.loads(data)
        page_images = list(
            apps.get_model("media.MediaImage").objects.filter(pk=donation_page).values_list("spa_key", flat=True)
        )
        for item in data:
            if item.get("type", "") == image_key:
                uuid = item["uuid"]
                if blob := files.get(uuid, None):
                    img = ImageFile(io.BytesIO(blob, name=f"{item['content']['name']}"))
                    m = cls(spa_key=item["uuid"], image=img, page_id=donation_page, image_attrs=item["content"])
                    item["content"]["url"] = m.image.storage.url()
        data = json.dumps(mutable)
        return data
