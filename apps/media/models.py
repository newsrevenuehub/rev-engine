import json

from django.core.files.images import ImageFile
from django.db import models
from django.http.request import QueryDict

from sorl.thumbnail import ImageField as SorlImageField
from sorl.thumbnail import get_thumbnail

from apps.common.models import IndexedTimeStampedModel
from apps.pages.models import DonationPage


class MediaImage(IndexedTimeStampedModel):
    spa_key = models.UUIDField(blank=True)
    page_id = models.ForeignKey("pages.DonationPage", null=False, on_delete=models.CASCADE)
    height = models.PositiveIntegerField()
    width = models.PositiveIntegerField()
    image = SorlImageField(upload_to="images", height_field="height", width_field="width")
    thumbnail = models.ImageField(upload_to="images/thumbs", null=True, blank=True)
    image_attrs = models.JSONField(blank=True, null=True)

    def __str__(self):
        return self.image.name

    def get_as_dict(self, image_key="DImage"):
        return {
            "uuid": str(self.spa_key),
            "type": str(image_key),
            "content": {
                "url": self.image.storage.url(name=self.image.name),
                "thumbnail": self.thumbnail.name,
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
                    img = ImageFile(files.get(element.get("uuid")))
                    m = cls(
                        spa_key=element.get("uuid"),
                        image=img,
                        page_id=DonationPage.objects.get(pk=donation_page),
                        image_attrs={},
                    )
                    # Save to get an upload location for the image
                    m.save()
                    m.thumbnail = get_thumbnail(m.image, geometry_string="300").url
                    m.save()
                    elements[index] = m.get_as_dict()
            mutable["sidebar_elements"] = elements
        return mutable
