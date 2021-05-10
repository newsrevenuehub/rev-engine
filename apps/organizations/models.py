from django.core.exceptions import ValidationError
from django.db import models

from apps.common.constants import STATE_CHOICES
from apps.common.models import IndexedTimeStampedModel
from apps.common.utils import normalize_slug


class Feature(IndexedTimeStampedModel):
    VALID_BOOLEAN_INPUTS = ["t", "f", "0", "1"]

    class FeatureType(models.TextChoices):
        PAGE_LIMIT = "PL", ("Page Limit")
        BOOLEAN = "BL", ("Boolean")

    name = models.CharField(max_length=255)
    feature_type = models.CharField(
        max_length=2,
        choices=FeatureType.choices,
        default=FeatureType.PAGE_LIMIT,
    )
    feature_value = models.CharField(
        max_length=32, blank=True, help_text="If feature type is Boolean, valid inputs are 't', 'f', '1', '0"
    )
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ["feature_type", "feature_value"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.feature_type == self.FeatureType.PAGE_LIMIT and not self.feature_value.isnumeric():
            raise ValidationError("Page Limit types must be a positive integer value.")
        if (
            self.feature_type == self.FeatureType.BOOLEAN
            and self.feature_value.lower() not in self.VALID_BOOLEAN_INPUTS
        ):
            raise ValidationError(
                f"The feature type '{self.FeatureType.BOOLEAN.label}' requires one of the following [1,0,t,f]"
            )
        super().save(*args, **kwargs)


class Plan(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    features = models.ManyToManyField("organizations.Feature", related_name="plans", blank=True)

    def __str__(self):
        return self.name


class Organization(IndexedTimeStampedModel):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(blank=True, unique=True)
    plan = models.ForeignKey("organizations.Plan", null=True, on_delete=models.CASCADE)
    non_profit = models.BooleanField(default=True, verbose_name="Non-profit?")
    org_addr1 = models.CharField(max_length=255, blank=True, verbose_name="Address 1")
    org_addr2 = models.CharField(max_length=255, blank=True, verbose_name="Address 2")
    org_city = models.CharField(max_length=64, blank=True, verbose_name="City")
    org_state = models.CharField(max_length=2, blank=True, choices=STATE_CHOICES, verbose_name="State")
    org_zip = models.CharField(max_length=9, blank=True, verbose_name="Zip")
    salesforce_id = models.CharField(max_length=255, blank=True, verbose_name="Salesforce ID")

    users = models.ManyToManyField("users.User", through="users.OrganizationUser")

    STRIPE = ("stripe", "Stripe")
    SUPPORTED_PROVIDERS = (STRIPE,)
    default_payment_provider = models.CharField(max_length=100, choices=SUPPORTED_PROVIDERS, default=STRIPE[0])
    stripe_account_id = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.id:
            self.slug = normalize_slug(self.name, self.slug)
        super().save(*args, **kwargs)

    def user_is_member(self, user):
        return user in self.users.all()


class RevenueProgram(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, blank=True, unique=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.id:
            self.slug = normalize_slug(
                self.name,
                self.slug,
            )
            self.slug = normalize_slug(slug=f"{self.organization.slug}-{self.slug}")
        super().save(*args, **kwargs)
