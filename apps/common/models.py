from django.db import models

from model_utils.fields import AutoCreatedField, AutoLastModifiedField

from apps.common.constants import STATE_CHOICES


class IndexedTimeStampedModel(models.Model):
    created = AutoCreatedField("created", db_index=True)
    modified = AutoLastModifiedField("modified", db_index=True)

    class Meta:
        abstract = True


class Address(models.Model):
    address1 = models.CharField(max_length=255, blank=True, verbose_name="Address 1")
    address2 = models.CharField(max_length=255, blank=True, verbose_name="Address 2")
    city = models.CharField(max_length=64, blank=True, verbose_name="City")
    state = models.CharField(max_length=2, blank=True, choices=STATE_CHOICES, verbose_name="State")
    postal_code = models.CharField(max_length=9, blank=True, verbose_name="Postal code")

    def __str__(self):
        address2 = " " + self.address2 if self.address2 else ""
        postal_code = " " + self.postal_code if self.postal_code else ""
        return f"{self.address1}{address2}, {self.city}, {self.state}{postal_code}"
