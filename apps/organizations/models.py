import logging
from dataclasses import dataclass

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

import stripe

from apps.common.models import IndexedTimeStampedModel
from apps.common.utils import normalize_slug
from apps.config.validators import validate_slug_against_denylist
from apps.organizations.validators import validate_statement_descriptor_suffix
from apps.users.choices import Roles
from apps.users.models import RoleAssignmentResourceModelMixin, UnexpectedRoleType


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")

# This is for limiting creation of pages, revenue programs, and role assignments
# in cases where our marketing materials use language about "unlimited". We don't
# want a malactor to be able to create an unbounded number of these entities. If a
# legitimate actor hits these limits, it can be handled via customer service.
UNLIMITED_CEILING = 200


# RFC-1035 limits domain labels to 63 characters, and RP slugs are used for subdomains,
# so we limit to 63 chars
RP_SLUG_MAX_LENGTH = 63

CURRENCY_CHOICES = [(k, k) for k in settings.CURRENCIES.keys()]


@dataclass
class Plan:
    """Used for modeling Organization plans"""

    name: str
    label: str
    page_limit: int = 1


FreePlan = Plan(
    name="FREE",
    label="Free",
)

PlusPlan = Plan(
    name="PLUS",
    label="Plus",
    # If this limit gets hit, it can be dealt with as a customer service issue.
    page_limit=UNLIMITED_CEILING,
)


class Plans(models.TextChoices):

    FREE = FreePlan.name, FreePlan.label
    PLUS = PlusPlan.name, PlusPlan.label

    @classmethod
    def get_plan(cls, name):
        return {cls.FREE.value: FreePlan, cls.PLUS.value: PlusPlan}.get(name, None)


class Organization(IndexedTimeStampedModel, RoleAssignmentResourceModelMixin):
    name = models.CharField(max_length=255, unique=True)
    plan = models.CharField(choices=Plans.choices, max_length=10, default=Plans.FREE)
    salesforce_id = models.CharField(max_length=255, blank=True, verbose_name="Salesforce ID")

    # TODO: [DEV-2035] Remove Organization.slug field entirely
    slug = models.SlugField(
        # 63 here is somewhat arbitrary. This used to be set to `RP_SLUG_MAX_LENGTH` (which used to have a different name),
        # which is the maximum length a domain can be according to RFC-1035. We're retaining that value
        # but without a reference to the constant, because using the constant would imply there
        # are business requirements related to sub-domain length around this field which there are not
        # (and given TODO above, it would appear that the business requirements that originally
        # led to org slug being a field are no longer around)
        max_length=63,
        unique=True,
        validators=[validate_slug_against_denylist],
    )

    users = models.ManyToManyField("users.User", through="users.OrganizationUser")
    send_receipt_email_via_nre = models.BooleanField(
        default=True,
        help_text="If false, receipt email assumed to be sent via Salesforce. Other emails, e.g. magic_link, are always sent via NRE regardless of this setting",
    )

    def __str__(self):
        return self.name

    def get_plan_data(self):
        return Plans.get_plan(self.plan)

    @property
    def admin_revenueprogram_options(self):
        rps = self.revenueprogram_set.all()
        return [(rp.name, rp.pk) for rp in rps]

    def user_is_member(self, user):
        return user in self.users.all()

    def user_is_owner(self, user):
        return user in [through.user for through in self.user_set.through.objects.filter(is_owner=True)]

    @classmethod
    def filter_queryset_by_role_assignment(cls, role_assignment, queryset):
        if role_assignment.role_type == Roles.HUB_ADMIN:
            return queryset.all()
        elif role_assignment.role_type in (Roles.ORG_ADMIN, Roles.RP_ADMIN):
            return queryset.filter(pk=role_assignment.organization.pk)
        else:
            raise UnexpectedRoleType(f"{role_assignment.role_type} is not a valid value")


class Benefit(IndexedTimeStampedModel):
    name = models.CharField(max_length=128, help_text="A way to uniquely identify this Benefit")
    description = models.TextField(help_text="The text that appears on the donation page")
    revenue_program = models.ForeignKey("organizations.RevenueProgram", on_delete=models.CASCADE)

    class Meta:
        unique_together = (
            "name",
            "revenue_program",
        )
        ordering = ["benefitlevelbenefit__order"]

    def __str__(self):
        return self.name


class BenefitLevel(IndexedTimeStampedModel):
    name = models.CharField(max_length=128)
    lower_limit = models.PositiveIntegerField()
    upper_limit = models.PositiveIntegerField(null=True, blank=True)
    currency = models.CharField(max_length=3, default="usd")
    level = models.PositiveSmallIntegerField(help_text="Is this a first-level benefit, second-level, etc?", default=0)

    benefits = models.ManyToManyField("organizations.Benefit", through="organizations.BenefitLevelBenefit")

    revenue_program = models.ForeignKey("organizations.RevenueProgram", on_delete=models.CASCADE)

    class Meta:
        unique_together = (
            "name",
            "revenue_program",
        )
        ordering = ("level",)

    def __str__(self):
        return self.name

    @property
    def donation_range(self):
        upper_limit_str = f"-{self.upper_limit}" if self.upper_limit else "+"
        return f"${self.lower_limit}{upper_limit_str}"

    def clean(self):
        if self.upper_limit and self.upper_limit <= self.lower_limit:
            raise ValidationError("Upper limit must be greater than lower limit")


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
        return f'"{self.benefit}" {self.order} for "{self.benefit_level}" benefit level'


class CountryChoices(models.TextChoices):
    """Two-letter country codes

    These are used in RevenueProgram for the country value. In turn, they get sent to Stripe
    in SPA when payment request is made.
    """

    US = "US", "United States"
    CANADA = "CA", "Canada"


class RevenueProgram(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(
        max_length=RP_SLUG_MAX_LENGTH,
        blank=True,
        unique=True,
        help_text="This will be used as the subdomain for donation pages made under this revenue program. If left blank, it will be derived from the Revenue Program name.",
        validators=[validate_slug_against_denylist],
    )
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    contact_email = models.EmailField(max_length=255, blank=True)
    default_donation_page = models.ForeignKey(
        "pages.DonationPage",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="Choose an optional default donation page once you've saved your initial revenue program",
    )
    # TODO: [DEV-2403] non_profit should probably be moved to the payment provider?
    non_profit = models.BooleanField(default=True, verbose_name="Non-profit?")
    payment_provider = models.ForeignKey("organizations.PaymentProvider", null=True, on_delete=models.SET_NULL)
    domain_apple_verified_date = models.DateTimeField(blank=True, null=True)

    # Analytics
    google_analytics_v3_domain = models.CharField(max_length=300, null=True, blank=True)
    google_analytics_v3_id = models.CharField(max_length=50, null=True, blank=True)
    google_analytics_v4_id = models.CharField(max_length=50, null=True, blank=True)
    facebook_pixel_id = models.CharField(max_length=100, null=True, blank=True)

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
    country = models.CharField(
        max_length=2,
        choices=CountryChoices.choices,
        default=CountryChoices.US,
        verbose_name="Country",
        help_text="2-letter country code of RP's company. This gets included in data sent to stripe when creating a payment",
    )

    def __str__(self):
        return self.name

    @property
    def admin_style_options(self):
        styles = self.style_set.all()
        return [(c.name, c.pk) for c in styles]

    @property
    def admin_benefit_options(self):
        benefits = self.benefit_set.all()
        return [(c.name, c.pk) for c in benefits]

    @property
    def admin_benefitlevel_options(self):
        benefit_levels = self.benefitlevel_set.all()
        return [(c.name, c.pk) for c in benefit_levels]

    @property
    def stripe_account_id(self):
        if not self.payment_provider:
            return None
        return self.payment_provider.stripe_account_id

    def clean_fields(self, **kwargs):
        if not self.id:
            self.slug = normalize_slug(self.name, self.slug, max_length=RP_SLUG_MAX_LENGTH)
        super().clean_fields(**kwargs)

    def clean(self):
        # Avoid state of a rev program's default page not being one of "its pages"
        if self.default_donation_page and self.default_donation_page.revenue_program != self:
            raise ValidationError(
                f'Donation page "{self.default_donation_page}" is already associated with a revenue program, "{self.default_donation_page.revenue_program}"'
            )
        # Ensure no @ symbol on twitter_handle-- we'll add those later
        if self.twitter_handle and self.twitter_handle[0] == "@":
            self.twitter_handle = self.twitter_handle.replace("@", "")

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
                    domain_name=f"{self.slug}.{settings.DOMAIN_APEX}",
                    stripe_account=self.payment_provider.stripe_account_id,
                )
                self.domain_apple_verified_date = timezone.now()
                self.save()
            except stripe.error.StripeError:
                logger.warning(
                    "Failed to register ApplePayDomain for RevenueProgram %s because of StripeError",
                    self.name,
                    exc_info=True,
                )

    def user_has_ownership_via_role(self, role_assignment):
        """Determine if a user owns an instance based on role_assignment"""
        return any(
            [
                all(
                    [
                        role_assignment.role_type == Roles.ORG_ADMIN.value,
                        role_assignment.organization == self.organization,
                    ]
                ),
                all(
                    [
                        role_assignment.role_type == Roles.RP_ADMIN.value,
                        self in role_assignment.revenue_programs.all(),
                    ]
                ),
            ]
        )


class PaymentProvider(IndexedTimeStampedModel):
    stripe_account_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    stripe_product_id = models.CharField(max_length=255, blank=True, null=True)

    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="USD")
    STRIPE = ("stripe", "Stripe")
    SUPPORTED_PROVIDERS = (STRIPE,)
    default_payment_provider = models.CharField(max_length=100, choices=SUPPORTED_PROVIDERS, default=STRIPE[0])

    stripe_oauth_refresh_token = models.CharField(max_length=255, blank=True)
    stripe_verified = models.BooleanField(
        default=False,
        help_text='A fully verified Stripe Connected account should have "charges_enabled: true" in Stripe',
    )

    def __str__(self):
        return f"Stripe Payment Provider acct:{self.stripe_account_id} product:{self.stripe_product_id}"

    def get_dependent_pages_with_publication_date(self):
        """Retreieve live and future live donation pages that rely on this payment provider"""
        from apps.pages.models import DonationPage  # vs circular import

        return DonationPage.objects.filter(revenue_program__payment_provider=self, published_date__isnull=False)

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
                'Currency settings for stripe account/product "%s"/"%s" misconfigured. Tried to access "%s", but valid options are: %s',
                self.stripe_account_id,
                self.stripe_product_id,
                self.currency,
                settings.CURRENCIES,
            )
            return {"code": "", "symbol": ""}
