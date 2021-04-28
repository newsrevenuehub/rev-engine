from django.db import models
from django.utils.text import slugify

from apps.common.constants import STATE_CHOICES
from apps.common.models import IndexedTimeStampedModel


def normalize_slug(slug, to_length=50):
    """Returns a string of len <= a supplied length.
    :param slug:
    :param to_length:
    :return: str
    """
    if len(slug) > to_length:
        slug = slug[:to_length].rstrip("-")
    return slug


class Feature(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    plans = models.ManyToManyField("organizations.Plan", related_name="plans", blank=True)

    def __str__(self):
        return self.name


class Plan(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name


class Organization(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField()
    plan = models.ForeignKey("organizations.Plan", null=True, on_delete=models.CASCADE)
    non_profit = models.BooleanField(default=True, verbose_name="Non-profit?")
    stripe_account = models.CharField(max_length=255, blank=True)
    org_addr1 = models.CharField(max_length=255, blank=True, verbose_name="Address 1")
    org_addr2 = models.CharField(max_length=255, blank=True, verbose_name="Address 2")
    org_city = models.CharField(max_length=64, blank=True, verbose_name="City")
    org_state = models.CharField(max_length=2, blank=True, choices=STATE_CHOICES, verbose_name="State")
    org_zip = models.CharField(max_length=9, blank=True, verbose_name="Zip")
    salesforce_id = models.CharField(max_length=255, blank=True, verbose_name="Salesforce ID")

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.id:
            self.slug = normalize_slug(slugify(self.name, allow_unicode=True))
        super(Organization, self).save(*args, **kwargs)


class RevenueProgram(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.id:
            slug = normalize_slug(slugify(self.name, allow_unicode=True))
            self.slug = f"{self.organization.slug}-{slug}"
        super(RevenueProgram, self).save(*args, **kwargs)
