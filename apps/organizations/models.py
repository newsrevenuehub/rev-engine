import logging

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

import stripe

from apps.common.constants import STATE_CHOICES
from apps.common.models import IndexedTimeStampedModel
from apps.common.utils import normalize_slug
from apps.contributions.utils import get_hub_stripe_api_key


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


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
        max_length=32,
        blank=False,
        help_text="Limit feature types must be a positive integer. Valid Boolean Type values are ('t', 'f', '1', '0')",
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
    stripe_verified = models.BooleanField(
        default=False,
        help_text='A fully verified Stripe Connected account should have "charges_enabled: true" in Stripe',
    )
    stripe_product_id = models.CharField(max_length=255, blank=True)
    domain_apple_verified_date = models.DateTimeField(null=True)
    uses_email_templates = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.pk:
            self.slug = normalize_slug(self.name, self.slug)

        super().save(*args, **kwargs)

    def user_is_member(self, user):
        return user in self.users.all()

    def user_is_owner(self, user):
        return user in [through.user for through in self.user_set.through.objects.filter(is_owner=True)]

    def is_verified_with_default_provider(self):
        payment_provider = self.default_payment_provider
        payment_provider_account_id = getattr(self, f"{payment_provider}_account_id", None)
        payment_provider_verified = getattr(self, f"{payment_provider}_verified", None)
        return payment_provider and payment_provider_account_id and payment_provider_verified

    def stripe_create_default_product(self):
        if not self.stripe_product_id:
            product = stripe.Product.create(
                name=settings.GENERIC_STRIPE_PRODUCT_NAME,
                api_key=get_hub_stripe_api_key(),
                stripe_account=self.stripe_account_id,
            )
            self.stripe_product_id = product.id
            self.save()

    def stripe_create_apple_pay_domain(self):
        """
        Register an ApplePay domain with Apple (by proxy) for this organization, so that
        we only register domains in production environments.

        NOTE: Cannot create ApplePay Domains using test key.

        "If you're hoping to test this locally, pretty much too bad"
            -- Steve Jobs
        """
        if settings.STRIPE_LIVE_MODE == "True":
            try:
                stripe.ApplePayDomain.create(
                    api_key=settings.STRIPE_LIVE_SECRET_KEY,
                    domain_name=settings.SITE_URL.split("//")[1],
                    stripe_account=self.stripe_account_id,
                )
                self.domain_apple_verified_date = timezone.now()
                self.save()
            except stripe.error.StripeError as stripe_error:
                logger.warn(
                    f"Failed to register ApplePayDomain for organization {self.name}. StripeError: {str(stripe_error)}"
                )


class RevenueProgram(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, blank=True, unique=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    default_donation_page = models.ForeignKey("pages.DonationPage", null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return self.name

    def clean(self):
        # Avoid state of a rev program's default page not being one of "its pages"
        if self.default_donation_page and self.default_donation_page.revenue_program != self:
            raise ValidationError(
                f'Donation page "{self.default_donation_page}" is already associated with a revenue program, "{self.default_donation_page.revenue_program}"'
            )

    def save(self, *args, **kwargs):
        if not self.id:
            self.slug = normalize_slug(
                self.name,
                self.slug,
            )
            self.slug = normalize_slug(slug=self.slug)

        # Avoid state of a donation_page not being in the rev program's page set when being added as default page.
        if self.default_donation_page and self.default_donation_page not in self.donationpage_set.all():
            self.donationpage_set.add(self.default_donation_page)

        super().save(*args, **kwargs)
