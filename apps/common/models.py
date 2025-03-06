from django.db import models

from model_utils.fields import AutoCreatedField, AutoLastModifiedField
from sorl.thumbnail import ImageField as SorlImageField


class IndexedTimeStampedModel(models.Model):
    id: int

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
    revenue_program = models.OneToOneField("organizations.RevenueProgram", on_delete=models.CASCADE, null=True)

    def __str__(self):
        return f"Social media Metatags for RevenueProgram: {self.revenue_program.name if self.revenue_program else '<NotSet>'}"
