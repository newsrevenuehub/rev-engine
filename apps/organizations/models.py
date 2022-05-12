import logging

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

import stripe
from simple_history.models import HistoricalRecords

from apps.common.models import IndexedTimeStampedModel
from apps.common.utils import normalize_slug
from apps.config.validators import validate_slug_against_denylist
from apps.organizations.validators import validate_statement_descriptor_suffix
from apps.users.choices import Roles
from apps.users.models import RoleAssignmentResourceModelMixin, UnexpectedRoleType


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")

# RFC-1035 limits domain labels to 63 characters
SLUG_MAX_LENGTH = 63


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

    # A history of changes to this model, using django-simple-history.
    history = HistoricalRecords()

    class Meta:
        unique_together = ["feature_type", "feature_value"]

    def __str__(self):  # pragma: no cover
        return self.name

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)


class Plan(IndexedTimeStampedModel, RoleAssignmentResourceModelMixin):
    name = models.CharField(max_length=255)
    features = models.ManyToManyField("organizations.Feature", related_name="plans", blank=True)

    # A history of changes to this model, using django-simple-history.
    history = HistoricalRecords()

    def __str__(self):  # pragma: no cover
        return self.name

    @classmethod
    def filter_queryset_by_role_assignment(cls, role_assignment, queryset):
        if role_assignment.role_type == Roles.HUB_ADMIN:
            return queryset.all()
        elif role_assignment.role_type in (Roles.ORG_ADMIN, Roles.RP_ADMIN):
            return queryset.filter(organization=role_assignment.organization)
        else:
            raise UnexpectedRoleType(f"{role_assignment.role_type} is not a valid value")


CURRENCY_CHOICES = [(k, k) for k, _ in settings.CURRENCIES.items()]


class Organization(IndexedTimeStampedModel, RoleAssignmentResourceModelMixin):
    name = models.CharField(max_length=255, unique=True)
    plan = models.ForeignKey("organizations.Plan", null=True, on_delete=models.CASCADE)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="USD")
    non_profit = models.BooleanField(default=True, verbose_name="Non-profit?")
    address = models.OneToOneField("common.Address", on_delete=models.CASCADE)
    salesforce_id = models.CharField(max_length=255, blank=True, verbose_name="Salesforce ID")

    slug = models.SlugField(
        max_length=SLUG_MAX_LENGTH,
        unique=True,
        validators=[validate_slug_against_denylist],
    )

    users = models.ManyToManyField("users.User", through="users.OrganizationUser")

    STRIPE = ("stripe", "Stripe")
    SUPPORTED_PROVIDERS = (STRIPE,)
    default_payment_provider = models.CharField(max_length=100, choices=SUPPORTED_PROVIDERS, default=STRIPE[0])
    stripe_account_id = models.CharField(max_length=255, blank=True)
    stripe_oauth_refresh_token = models.CharField(max_length=255, blank=True)
    stripe_verified = models.BooleanField(
        default=False,
        help_text='A fully verified Stripe Connected account should have "charges_enabled: true" in Stripe',
    )
    stripe_product_id = models.CharField(max_length=255, blank=True)
    domain_apple_verified_date = models.DateTimeField(blank=True, null=True)
    uses_email_templates = models.BooleanField(default=False)

    # A history of changes to this model, using django-simple-history.
    history = HistoricalRecords()

    @property
    def admin_revenueprogram_options(self):
        rps = self.revenueprogram_set.all()
        return [(rp.name, rp.pk) for rp in rps]

    @property
    def admin_benefit_options(self):
        benefits = self.benefit_set.all()
        return [(c.name, c.pk) for c in benefits]

    @property
    def admin_benefitlevel_options(self):
        benefit_levels = self.benefitlevel_set.all()
        return [(c.name, c.pk) for c in benefit_levels]

    @property
    def needs_payment_provider(self):
        """
        Right now this is simple. If the org is not "stripe_verified", then they "need a provider"
        """
        return not self.stripe_verified

    def __str__(self):
        return self.name

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
                stripe_account=self.stripe_account_id,
            )
            self.stripe_product_id = product.id
            self.save()

    def get_currency_dict(self):
        try:
            return {"code": self.currency, "symbol": settings.CURRENCIES[self.currency]}
        except KeyError:
            logger.error(
                f'Currency settings for organization "{self.name}" misconfigured. Tried to access "{self.currency}", but valid options are: {settings.CURRENCIES}'
            )

    @classmethod
    def filter_queryset_by_role_assignment(cls, role_assignment, queryset):
        if role_assignment.role_type == Roles.HUB_ADMIN:
            return queryset.all()
        elif role_assignment.role_type in (Roles.ORG_ADMIN, Roles.RP_ADMIN):
            return queryset.filter(pk=role_assignment.organization.pk)
        else:
            raise UnexpectedRoleType(f"{role_assignment.role_type} is not a valid value")


class BenefitLevel(IndexedTimeStampedModel):
    name = models.CharField(max_length=128)
    lower_limit = models.PositiveIntegerField()
    upper_limit = models.PositiveIntegerField(null=True, blank=True)
    currency = models.CharField(max_length=3, default="usd")

    benefits = models.ManyToManyField("organizations.Benefit", through="organizations.BenefitLevelBenefit")

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    # A history of changes to this model, using django-simple-history.
    history = HistoricalRecords()

    def __str__(self):  # pragma: no cover
        return self.name

    class Meta:
        unique_together = (
            "name",
            "organization",
        )

        ordering = ["revenueprogrambenefitlevel__level"]

    @property
    def donation_range(self):
        upper_limit_str = f"-{self.upper_limit}" if self.upper_limit else "+"
        return f"${self.lower_limit}{upper_limit_str}"

    def clean(self):
        if self.upper_limit and self.upper_limit <= self.lower_limit:
            raise ValidationError("Upper limit must be greater than lower limit")


class RevenueProgramBenefitLevel(models.Model):
    """
    Through table for the relationship between Organization and Benefit Level.
    Determines the order in which Benefit Levels appear
    """

    revenue_program = models.ForeignKey("organizations.RevenueProgram", on_delete=models.CASCADE)
    benefit_level = models.ForeignKey("organizations.BenefitLevel", on_delete=models.CASCADE)
    level = models.PositiveSmallIntegerField(help_text="Is this a first-level benefit, second-level, etc?")

    class Meta:
        ordering = ("level",)

    def __str__(self):  # pragma: no cover
        return f"Benefit Level {self.level} for {self.revenue_program}"


class Benefit(IndexedTimeStampedModel):
    name = models.CharField(max_length=128, help_text="A way to uniquely identify this Benefit")
    description = models.TextField(help_text="The text that appears on the donation page")
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    # A history of changes to this model, using django-simple-history.
    history = HistoricalRecords()

    def __str__(self):
        return self.name

    class Meta:
        unique_together = (
            "name",
            "organization",
        )

        ordering = ["benefitlevelbenefit__order"]


class BenefitLevelBenefit(models.Model):
    """
    The through table for the M2M relationship BenefitLevel <--> Benefit,
    including relationship metadata such as the order the Benefit shuold appear
    in for that BenefitLevel
    """

    benefit = models.ForeignKey(Benefit, on_delete=models.CASCADE)
    benefit_level = models.ForeignKey(BenefitLevel, on_delete=models.CASCADE)
    order = models.PositiveSmallIntegerField(help_text="The order in which this Benefit appears in this BenefitLevel")

    class Meta:
        ordering = ("order",)

    def __str__(self):
        return f'Benefit {self.order} for "{self.benefit_level}" benefit level'


class RevenueProgram(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(
        max_length=SLUG_MAX_LENGTH,
        blank=True,
        unique=True,
        help_text="This will be used as the subdomain for donation pages made under this revenue program. If left blank, it will be derived from the Revenue Program name.",
        validators=[validate_slug_against_denylist],
    )
    address = models.OneToOneField("common.Address", on_delete=models.SET_NULL, null=True)
    social_meta = models.OneToOneField("common.SocialMeta", on_delete=models.SET_NULL, null=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    contact_email = models.EmailField(max_length=255, blank=True)
    default_donation_page = models.ForeignKey(
        "pages.DonationPage",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="Choose an optional default donation page once you've saved your initial revenue program",
    )

    # Analytics
    google_analytics_v3_domain = models.CharField(max_length=300, null=True, blank=True)
    google_analytics_v3_id = models.CharField(max_length=50, null=True, blank=True)
    google_analytics_v4_id = models.CharField(max_length=50, null=True, blank=True)
    facebook_pixel_id = models.CharField(max_length=100, null=True, blank=True)

    benefit_levels = models.ManyToManyField(BenefitLevel, through=RevenueProgramBenefitLevel)

    # Social links
    twitter_handle = models.CharField(
        max_length=15, blank=True, help_text="How can your donors mention you on Twitter? Don't include '@' symbol"
    )
    website_url = models.URLField(blank=True, help_text="Does this Revenue Program have a website?")

    # Stripe Statement descriptor
    stripe_statement_descriptor_suffix = models.CharField(
        max_length=10, blank=True, null=True, validators=[validate_statement_descriptor_suffix]
    )

    # Strange, hopefully temporary, hacky bit to accommodate one ore two particular clients' needs
    allow_offer_nyt_comp = models.BooleanField(
        default=False,
        help_text="Should page authors for this Revenue Program see the option to offer their donors a comp subscription to the New York Times?",
        verbose_name="Allow page editors to offer an NYT subscription",
    )

    # A history of changes to this model, using django-simple-history.
    history = HistoricalRecords()

    @property
    def admin_style_options(self):
        styles = self.style_set.all()
        return [(c.name, c.pk) for c in styles]

    def __str__(self):
        return self.name

    def clean_fields(self, **kwargs):
        if not self.id:
            self.slug = normalize_slug(self.name, self.slug, max_length=SLUG_MAX_LENGTH)
            self.slug = normalize_slug(slug=self.slug, max_length=SLUG_MAX_LENGTH)
        super().clean_fields(**kwargs)

    def clean(self):
        self._ensure_owner_of_default_page()
        self._format_twitter_handle()

    def _ensure_owner_of_default_page(self):
        """
        Avoid state of a rev program's default page not being one of "its pages"
        """
        if self.default_donation_page and self.default_donation_page.revenue_program != self:
            raise ValidationError(
                f'Donation page "{self.default_donation_page}" is already associated with a revenue program, "{self.default_donation_page.revenue_program}"'
            )

    def _format_twitter_handle(self):
        """
        Ensure no @ symbol on twitter_handle-- we'll add those later
        """
        if self.twitter_handle and self.twitter_handle[0] == "@":
            self.twitter_handle = self.twitter_handle.replace("@", "")

    def _get_host(self):
        """
        Gets the host derived from RevenueProgram slug and SITE_URL
        """
        domain_apex = settings.DOMAIN_APEX
        return f"{self.slug}.{domain_apex}"

    def stripe_create_apple_pay_domain(self):
        """
        Register an ApplePay domain with Apple (by proxy) for this RevenueProgram.

        NOTE: Cannot create ApplePay Domains using test key.

        "If you're hoping to test this locally, pretty much too bad"
            -- Steve Jobs
        """
        if settings.STRIPE_LIVE_MODE:
            try:
                stripe.ApplePayDomain.create(
                    api_key=settings.STRIPE_LIVE_SECRET_KEY,
                    domain_name=self._get_host(),
                    stripe_account=self.organization.stripe_account_id,
                )
                self.domain_apple_verified_date = timezone.now()
                self.save()
            except stripe.error.StripeError as stripe_error:
                logger.warning(
                    f"Failed to register ApplePayDomain for RevenueProgram {self.name}. StripeError: {str(stripe_error)}"
                )

    def user_has_ownership_via_role(self, role_assignment):
        """Note on distinct ownership vs. access"""
        return any(
            [
                all(
                    [
                        role_assignment.role_type == Roles.ORG_ADMIN,
                        role_assignment.organization == self.organization,
                    ]
                ),
                all(
                    [
                        role_assignment.role_type == Roles.RP_ADMIN,
                        self in role_assignment.revenue_programs.all(),
                    ]
                ),
            ]
        )
