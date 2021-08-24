import json
import os.path
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.files.images import ImageFile
from django.db import models
from django.http.request import QueryDict

from PIL import Image

from apps.common.models import IndexedTimeStampedModel
from apps.pages.models import DonationPage


THUMBNAIL_SIZE = 300, 300


def get_thumbnail(image):
    filename, ext = os.path.splitext(image.name)
    with Image.open(image) as thumb:
        if not ext:
            ext = thumb.format.lower()
        thumb.thumbnail(THUMBNAIL_SIZE)
        thumb_io = BytesIO()
        thumb.save(thumb_io, thumb.format, quality=80)
    return ContentFile(thumb_io.getvalue(), name=f"{filename}_thumbnail{ext}")


class MediaImage(IndexedTimeStampedModel):
    spa_key = models.UUIDField(blank=True)
    page_id = models.ForeignKey("pages.DonationPage", null=False, on_delete=models.CASCADE)
    image = models.ImageField(upload_to="images", null=True)
    thumbnail = models.ImageField(upload_to="thumbs", null=True, blank=True)
    image_attrs = models.JSONField(blank=True, null=True)

    def __str__(self):
        return self.image.name

    def get_as_dict(self, image_key="DImage"):
        return {
            "uuid": str(self.spa_key),
            "type": str(image_key),
            "content": {
                "url": self.image.storage.url(name=self.image.name),
                "thumbnail": self.thumbnail.storage.url(name=self.thumbnail.name),
            },
        }

    @classmethod
    def create_from_request(cls, data: QueryDict, files: {}, donation_page, image_key="DImage") -> [dict]:
        """Takes a request.data and builds a MediaImage instance from the json blob data found in the files dict.

        Expected Schemas:
            data = [{"uuid": str, "type": "DImage", "content": {}, n...]
            files = {"str(<UUID>)": Blob}
        :param data: A copy of the request POST data.
        :param files: A list of dicts. Key=UUID in the request.data for the image element
        :param donation_page: the page that these images are referenced on.
        :param image_key: The key that identifies an Image element.
        :return: The data["sidebar_elements"] updated with the storage locations for the image and the thumbnail.
        """

        ## TODO: Duplicate detection

        mutable = data.copy()
        if sbe := mutable.get("sidebar_elements"):
            elements = json.loads(sbe)
            for index, element in enumerate(elements):
                if element.get("type") == image_key:
                    if f := files.get(element.get("uuid"), None):
                        img = ImageFile(f)
                        thumb = get_thumbnail(img)
                        media_image = cls(
                            spa_key=element.get("uuid"),
                            image=img,
                            thumbnail=thumb,
                            page_id=DonationPage.objects.get(pk=donation_page),
                            image_attrs={},
                        )
                        media_image.save()
                        elements[index] = media_image.get_as_dict()
            mutable["sidebar_elements"] = elements
        return mutable
