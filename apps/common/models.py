from django.db import models

from model_utils.fields import AutoCreatedField, AutoLastModifiedField
from sorl.thumbnail import ImageField as SorlImageField


class IndexedTimeStampedModel(models.Model):
    created = AutoCreatedField("created", db_index=True)
    modified = AutoLastModifiedField("modified", db_index=True)

    class Meta:
        abstract = True


class SocialMeta(models.Model):
    # opengraph truncates titles over 95chars
    title = models.CharField(max_length=95, blank=True)
    description = models.TextField(blank=True)
    url = models.URLField(blank=True)
    card = SorlImageField(null=True, blank=True)

    def __str__(self):
        related = ""
        if hasattr(self, "revenueprogram"):
            related = ("revenueprogram", "Revenue Program")
        if related:
            return f'Social media Metatags for {related[1]} "{getattr(self, related[0])}"'
        return f"Social media Metatags: {self.title}"
