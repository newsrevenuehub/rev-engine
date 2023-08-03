import logging
import os
import uuid
from dataclasses import asdict, dataclass, field
from functools import cached_property
from typing import List, Literal, Optional

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinLengthValidator
from django.db import models
from django.utils import timezone

import mailchimp_marketing as MailchimpMarketing
import reversion
import stripe
from addict import Dict as AttrDict
from mailchimp_marketing.api_client import ApiClientError

from apps.common.models import IndexedTimeStampedModel
from apps.common.secrets import GoogleCloudSecretProvider
from apps.common.utils import normalize_slug
from apps.config.validators import validate_slug_against_denylist
from apps.google_cloud.pubsub import Message, Publisher
from apps.organizations.validators import validate_statement_descriptor_suffix
from apps.pages.defaults import (
    BENEFITS,
    DEFAULT_PERMITTED_PAGE_ELEMENTS,
    DEFAULT_PERMITTED_SIDEBAR_ELEMENTS,
    SWAG,
)
from apps.users.choices import Roles
from apps.users.models import RoleAssignment


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")

# This is for limiting creation of pages, revenue programs, and role assignments
# in cases where our marketing materials use language about "unlimited". We don't
# want a malactor to be able to create an unbounded number of these entities. If a
# legitimate actor hits these limits, it can be handled via customer service.
UNLIMITED_CEILING = 200


# RFC-1035 limits domain labels to 63 characters, and RP slugs are used for subdomains,
# so we limit to 63 chars
RP_SLUG_MAX_LENGTH = 63
FISCAL_SPONSOR_NAME_MAX_LENGTH = 100

CURRENCY_CHOICES = [(k, k) for k in settings.CURRENCIES.keys()]

TAX_ID_MAX_LENGTH = TAX_ID_MIN_LENGTH = 9


@dataclass(frozen=True)
class Plan:
    """Used for modeling Organization plans"""

    name: str
    label: str
    sidebar_elements: list[str] = field(default_factory=lambda: DEFAULT_PERMITTED_SIDEBAR_ELEMENTS)
    page_elements: list[str] = field(default_factory=lambda: DEFAULT_PERMITTED_PAGE_ELEMENTS)
    page_limit: int = 2
    publish_limit: int = 1
    style_limit: int = 1
    custom_thank_you_page_enabled: bool = False


FreePlan = Plan(
    name="FREE",
    label="Free",
)


CorePlan = Plan(
    name="CORE",
    label="Core",
    page_limit=5,
    publish_limit=2,
    style_limit=UNLIMITED_CEILING,
    sidebar_elements=DEFAULT_PERMITTED_SIDEBAR_ELEMENTS + [BENEFITS],
    page_elements=DEFAULT_PERMITTED_PAGE_ELEMENTS + [SWAG],
    custom_thank_you_page_enabled=True,
)

PlusPlan = Plan(
    name="PLUS",
    label="Plus",
    # If this limit gets hit, it can be dealt with as a customer service issue.
    page_limit=UNLIMITED_CEILING,
    publish_limit=UNLIMITED_CEILING,
    style_limit=UNLIMITED_CEILING,
    custom_thank_you_page_enabled=True,
    sidebar_elements=DEFAULT_PERMITTED_SIDEBAR_ELEMENTS + [BENEFITS],
    page_elements=DEFAULT_PERMITTED_PAGE_ELEMENTS + [SWAG],
)


class Plans(models.TextChoices):
    FREE = FreePlan.name, FreePlan.label
    PLUS = PlusPlan.name, PlusPlan.label
    CORE = CorePlan.name, CorePlan.label

    @classmethod
    def get_plan(cls, name):
        return {cls.FREE.value: FreePlan, cls.PLUS.value: PlusPlan, cls.CORE.value: CorePlan}.get(name, None)


class OrganizationQuerySet(models.QuerySet):
    def filtered_by_role_assignment(self, role_assignment: RoleAssignment) -> models.QuerySet:
        match role_assignment.role_type:
            case Roles.HUB_ADMIN:
                return self.all()
            case Roles.ORG_ADMIN | Roles.RP_ADMIN:
                return self.filter(id=role_assignment.organization.id)
            case _:
                return self.none()


class OrganizationManager(models.Manager):
    pass


class Organization(IndexedTimeStampedModel):
    # used in self-upgrade flow. Stripe checkouts can have associated client-reference-id, and we set that
    # to the value of an org.uuid so that we can look up the org in the self-upgrade flow, which is triggered
    # by stripe webhooks.
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=255, unique=True)
    plan_name = models.CharField(choices=Plans.choices, max_length=10, default=Plans.FREE)
    salesforce_id = models.CharField(max_length=255, blank=True, verbose_name="Salesforce ID")
    show_connected_to_slack = models.BooleanField(
        verbose_name="Show connected to Slack",
        default=False,
        help_text="Indicates Slack integration status, designed for manual operation by staff members when connected to the Hub’s Slack",
    )
    show_connected_to_salesforce = models.BooleanField(
        verbose_name="Show connected to Salesforce",
        default=False,
        help_text="Indicates Salesforce integration status, designed for manual operation by staff members",
    )
    show_connected_to_mailchimp = models.BooleanField(
        verbose_name="Show connected to Mailchimp",
        default=False,
        help_text="Indicates Mailchimp integration status, designed for manual operation by staff members",
    )

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
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)

    objects = OrganizationManager.from_queryset(OrganizationQuerySet)()

    def __str__(self):
        return self.name

    @cached_property
    def stripe_subscription(self):
        if not self.stripe_subscription_id:
            return None
        return stripe.Subscription.retrieve(
            self.stripe_subscription_id,
            api_key=settings.LIVE_SECRET_KEY_FOR_UPGRADES
            if settings.STRIPE_LIVE_MODE
            else settings.STRIPE_TEST_SECRET_KEY_UPGRADES,
        )

    @property
    def plan(self):
        return Plans.get_plan(self.plan_name)

    @property
    def admin_revenueprogram_options(self):
        rps = self.revenueprogram_set.all()
        return [(rp.name, rp.pk) for rp in rps]

    def user_is_member(self, user):
        return user in self.users.all()

    def user_is_owner(self, user):
        return user in [through.user for through in self.user_set.through.objects.filter(is_owner=True)]


class Benefit(IndexedTimeStampedModel):
    name = models.CharField(max_length=128, help_text="A way to uniquely identify this Benefit")
    description = models.TextField(help_text="The text that appears on the contribution page")
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


class FiscalStatusChoices(models.TextChoices):
    """

    These are used in RevenueProgram to indicate the fiscal status of a record.
    """

    FOR_PROFIT = "for-profit"
    NONPROFIT = "nonprofit"
    FISCALLY_SPONSORED = "fiscally sponsored"


@dataclass(frozen=True)
class TransactionalEmailStyle:
    """Used to model the default style characteristics for a given revenue program,

    though in theory, this need not be tied to a revenue program.
    """

    is_default_logo: bool = False
    logo_url: str = None
    logo_alt_text: str = None
    header_color: str = None
    header_font: str = None
    body_font: str = None
    button_color: str = None


HubDefaultEmailStyle = TransactionalEmailStyle(
    is_default_logo=True,
    logo_url=os.path.join(settings.SITE_URL, "static", "nre-logo-yellow.png"),
    logo_alt_text="News Revenue Hub",
    header_color=None,
    header_font=None,
    body_font=None,
    button_color=None,
)


class RevenueProgramQuerySet(models.QuerySet):
    def filtered_by_role_assignment(self, role_assignment: RoleAssignment) -> models.QuerySet:
        match role_assignment.role_type:
            case Roles.HUB_ADMIN:
                return self.all()
            case Roles.ORG_ADMIN:
                return self.filter(organization=role_assignment.organization)
            case Roles.RP_ADMIN:
                return self.filter(id__in=role_assignment.revenue_programs.values_list("id", flat=True))
            case _:
                return self.none()


class MailchimpIntegrationError(Exception):
    pass


class MailchimpRateLimitError(Exception):
    pass


# A sibling app (switchboard-api) has manually managed definitions like the `Mailchimp...` ones below
# This is not an ideal way to manage this but in short term it allows us to get everything running in prod quickly
# while also ensuring the two app data models are in sync (insofar as we human maintainers can ensure that).
@dataclass(frozen=True)
class MailchimpProductImage:
    """An instance of a Mailchimp product image, as represented by the Mailchimp API and relayed by rev-engine"""

    id: str  # Unique identifier for the image
    product_id: str  # ID of the product this image belongs to
    url: str  # URL to the product image
    variant_ids: list[str]  # List of variant IDs associated with this image


@dataclass(frozen=True)
class MailchimpProductVariant:
    """An instance of a Mailchimp product variant, as represented by the Mailchimp API and relayed by rev-engine"""

    id: str  # Unique identifier for the product variant
    product_id: str  # ID of the product this variant belongs to
    title: str  # Title of the product variant
    url: str  # URL to the product variant
    sku: str  # Stock Keeping Unit (SKU) associated with the product variant
    price: float  # Price of the product variant
    inventory_quantity: int  # Available inventory for the product variant
    image_url: Optional[str] = None  # URL of the product variant's image


@dataclass(frozen=True)
class MailchimpProductLink:
    """An instance of a Mailchimp product link, as represented by the Mailchimp API and relayed by rev-engine"""

    id: str  # Unique identifier for the link
    product_id: str  # ID of the product this link belongs to
    url: str  # URL to the product link
    type: str  # Type of the link (could be 'website', 'store', etc.)


@dataclass(frozen=True)
class MailchimpProduct:

    """An instance of a Mailchimp product link, as represented by the Mailchimp API and relayed by rev-engine"""

    id: str
    currency_code: str
    # When this is created by rev-engine, the value will be either "one-time contribution" or "recurring contribution"
    title: str
    handle: str
    url: str
    description: str
    type: str
    vendor: str
    image_url: str
    variants: List[MailchimpProductVariant]
    images: List[MailchimpProductImage]
    published_at_foreign: str
    _links: List[MailchimpProductLink]


@dataclass(frozen=True)
class MailchimpEmailList:
    """An instance of a Mailchimp email list (aka audience), as represented by the Mailchimp API and relayed by rev-engine"""

    id: str
    web_id: int
    name: str
    contact: dict
    permission_reminder: str
    use_archive_bar: bool
    campaign_defaults: dict
    notify_on_subscribe: bool
    notify_on_unsubscribe: bool
    date_created: str
    list_rating: str
    email_type_option: bool
    subscribe_url_short: str
    subscribe_url_long: str
    beamer_address: str
    visibility: str
    double_optin: bool
    has_welcome: bool
    marketing_permissions: bool
    modules: List
    stats: dict
    _links: List[dict]


@dataclass(frozen=True)
class MailchimpStore:
    """An instance of a Mailchimp store, as represented by the Mailchimp API and relayed by rev-engine"""

    id: str
    list_id: str
    name: str
    platform: str
    domain: str
    is_syncing: bool
    email_address: str
    currency_code: str
    money_format: str
    primary_locale: str
    timezone: str
    phone: str
    address: dict
    connected_site: dict
    automations: dict
    list_is_active: bool
    created_at: str
    updated_at: str
    _links: List[dict]


@dataclass(frozen=True)
class MailchimpSegment:
    """An instance of a Mailchimp segment, as represented by the Mailchimp API and relayed by rev-engine"""

    id: str
    name: str
    member_count: int
    type: Literal["saved", "static", "fuzzy"]
    created_at: str
    updated_at: str
    options: dict
    list_id: str
    _links: List[dict]


class RevenueProgramManager(models.Manager):
    pass


class RevenueProgram(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(
        max_length=RP_SLUG_MAX_LENGTH,
        blank=True,
        unique=True,
        help_text="This will be used as the subdomain for contribution pages made under this revenue program. If left blank, it will be derived from the Revenue Program name.",
        validators=[validate_slug_against_denylist],
    )
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    contact_email = models.EmailField(max_length=255, blank=True)
    default_donation_page = models.ForeignKey(
        "pages.DonationPage",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="Choose an optional default contribution page once you've saved your initial revenue program",
    )
    tax_id = models.CharField(
        blank=True, null=True, max_length=TAX_ID_MAX_LENGTH, validators=[MinLengthValidator(TAX_ID_MIN_LENGTH)]
    )
    payment_provider = models.ForeignKey("organizations.PaymentProvider", null=True, on_delete=models.SET_NULL)
    domain_apple_verified_date = models.DateTimeField(blank=True, null=True)
    fiscal_sponsor_name = models.CharField(max_length=FISCAL_SPONSOR_NAME_MAX_LENGTH, null=True, blank=True)
    fiscal_status = models.TextField(choices=FiscalStatusChoices.choices, default=FiscalStatusChoices.NONPROFIT)

    # Analytics
    google_analytics_v3_domain = models.CharField(max_length=300, null=True, blank=True)
    google_analytics_v3_id = models.CharField(max_length=50, null=True, blank=True)
    google_analytics_v4_id = models.CharField(max_length=50, null=True, blank=True)
    facebook_pixel_id = models.CharField(max_length=100, null=True, blank=True)

    # Social links
    twitter_handle = models.CharField(
        max_length=15,
        blank=True,
        help_text="How can your contributors mention you on Twitter? Don't include '@' symbol",
    )
    website_url = models.URLField(blank=True, help_text="Does this Revenue Program have a website?")

    # Stripe Statement descriptor
    stripe_statement_descriptor_suffix = models.CharField(
        max_length=10, blank=True, null=True, validators=[validate_statement_descriptor_suffix]
    )

    # Strange, hopefully temporary, hacky bit to accommodate one ore two particular clients' needs
    allow_offer_nyt_comp = models.BooleanField(
        default=False,
        help_text="Should page authors for this Revenue Program see the option to offer their contributors a comp subscription to the New York Times?",
        verbose_name="Allow page editors to offer an NYT subscription",
    )
    country = models.CharField(
        max_length=2,
        choices=CountryChoices.choices,
        default=CountryChoices.US,
        verbose_name="Country",
        help_text="2-letter country code of RP's company. This gets included in data sent to stripe when creating a payment",
    )
    # This is used to make requests to Mailchimp's API on behalf of users who have gone through the Mailchimp Oauth flow
    # to grant revengine access to their Mailchimp account.
    mailchimp_server_prefix = models.CharField(max_length=100, null=True, blank=True)
    mailchimp_list_id = models.TextField(null=True, blank=True)
    mailchimp_contributor_segment_id = models.CharField(max_length=100, null=True, blank=True)
    mailchimp_recurring_contributor_segment_id = models.CharField(max_length=100, null=True, blank=True)
    # NB: This field is stored in a secret manager, not in the database.
    # TODO: [DEV-3581] Cache the value for mailchimp_access_token to avoid hitting the secret manager on every request (potentially multiple times per request)
    mailchimp_access_token = GoogleCloudSecretProvider(model_attr="mailchimp_access_token_secret_name")

    objects = RevenueProgramManager.from_queryset(RevenueProgramQuerySet)()

    def __str__(self):
        return self.name

    def handle_mailchimp_api_client_read_error(
        self, entity: str, exc: ApiClientError, log_level_on_not_found: Literal["debug", "error", "warning"] = "debug"
    ) -> None:
        logger.info("Called for rp %s", self.id)
        match exc.status_code:
            case 404:
                getattr(logger, log_level_on_not_found)(
                    "Mailchimp %s not found for RP %s, returning None", entity, self.id
                )
            case 429:
                logger.debug("Mailchimp rate limit exceeded for RP %s, raising exception", self.id)
                # We raise this error because we have Celery tasks that interact with Mailchimp API and
                # in case of rate limit error we will want to retry
                raise MailchimpRateLimitError("Mailchimp rate limit exceeded")
            case _:
                logger.exception("Unexpected error from Mailchimp API. The error text is %s", exc.text)
        return None

    @cached_property
    def chosen_mailchimp_email_list(self) -> MailchimpEmailList | None:
        """Alias for self.mailchimp_email_list

        This is boilerplate that's necessary to make MailchimpRevenueProgramForSpaConfiguration (serializer) happy
        and easily testable.
        """
        return asdict(self.mailchimp_email_list) if self.mailchimp_email_list else None

    @cached_property
    def available_mailchimp_email_lists(self) -> List[MailchimpEmailList]:
        """Alias for self.mailchimp_email_lists

        This is boilerplate that's necessary to make MailchimpRevenueProgramForSpaConfiguration (serializer) happy
        and easily testable.
        """
        return [asdict(x) for x in self.mailchimp_email_lists]

    @cached_property
    def mailchimp_store(self) -> MailchimpStore | None:
        logger.info("Called for rp %s", self.id)
        if not self.mailchimp_integration_connected:
            logger.debug(
                "Mailchimp integration not connected for this revenue program (%s), returning None",
                self.id,
            )
            return None
        try:
            client = self.get_mailchimp_client()
            response = client.ecommerce.get_store(self.mailchimp_store_id)
            return MailchimpStore(**response)
        except ApiClientError as exc:
            return self.handle_mailchimp_api_client_read_error("store", exc)

    @cached_property
    def mailchimp_one_time_contribution_product(self) -> MailchimpProduct | None:
        logger.info("Called for rp %s", self.id)
        if not self.mailchimp_list_id:
            logger.debug("No email list ID on RP %s, returning None", self.id)
            return None
        try:
            client = self.get_mailchimp_client()
            response = client.ecommerce.get_store_product(
                self.mailchimp_store_id, self.mailchimp_one_time_contribution_product_id
            )
            return MailchimpProduct(**response)
        except ApiClientError as exc:
            return self.handle_mailchimp_api_client_read_error("one-time contribution product", exc)

    @cached_property
    def mailchimp_recurring_contribution_product(self) -> MailchimpProduct | None:
        logger.info("Called for rp %s", self.id)
        if not self.mailchimp_list_id:
            logger.debug("No email list ID on RP %s, returning None", self.id)
            return None
        try:
            client = self.get_mailchimp_client()
            response = client.ecommerce.get_store_product(
                self.mailchimp_store_id, self.mailchimp_recurring_contribution_product_id
            )
            return MailchimpProduct(**response)
        except ApiClientError as error:
            return self.handle_mailchimp_api_client_read_error("recurring contribution product", error)

    @cached_property
    def mailchimp_contributor_segment(self) -> MailchimpSegment | None:
        logger.info("Called for rp %s", self.id)
        if not self.mailchimp_list_id:
            logger.debug("No email list ID on RP %s, returning None", self.id)
            return None
        if not self.mailchimp_contributor_segment_id:
            logger.debug("No mailhcimp_contributor_segment_id on RP %s, returning None", self.id)
            return None
        client = self.get_mailchimp_client()
        try:
            response = client.lists.get_segment(self.mailchimp_list_id, self.mailchimp_contributor_segment_id)
            return MailchimpSegment(**response)
        except ApiClientError as error:
            return self.handle_mailchimp_api_client_read_error("contributor segment", error)

    @property
    def mailchimp_recurring_segment(self):
        logger.info("Called for rp %s", self.id)
        if not self.mailchimp_list_id:
            logger.debug("No email list ID on RP %s, returning None", self.id)
            return None
        if not self.mailchimp_recurring_contributor_segment_id:
            logger.debug("No mailhcimp_recurring_contributor_segment_id on RP %s, returning None", self.id)
            return None
        client = self.get_mailchimp_client()
        try:
            response = client.lists.get_segment(self.mailchimp_list_id, self.mailchimp_recurring_contributor_segment_id)
            return MailchimpSegment(**response)
        except ApiClientError as error:
            return self.handle_mailchimp_api_client_read_error("recurring segment", error)

    @cached_property
    def mailchimp_email_list(self) -> MailchimpEmailList | None:
        logger.info("Called for rp %s", self.id)
        if not (list_id := self.mailchimp_list_id):
            logger.debug("No email list ID on RP %s, returning None", self.id)
            return None
        client = self.get_mailchimp_client()
        try:
            logger.info("Getting list %s for RP %s", list_id, self.id)
            response = client.lists.get_list(list_id)
            return MailchimpEmailList(**response)
        except ApiClientError as error:
            # we want to log as an error if not found because in this case, something has gone wrong in that we have a
            # list ID but it is not found on Mailchimp.  This will give us a signal in Sentry, while not blocking
            # serialization of the revenue program.
            return self.handle_mailchimp_api_client_read_error(
                "mailchimp email list", error, log_level_on_not_found="error"
            )

    @property
    def mailchimp_store_id(self):
        return f"rp-{self.id}-store"

    @property
    def mailchimp_store_name(self):
        return "RevEngine"

    @property
    def mailchimp_one_time_contribution_product_id(self):
        return f"rp-{self.id}-one-time-contribution-product"

    @property
    def mailchimp_one_time_contribution_product_name(self):
        return "one-time contribution"

    @property
    def mailchimp_recurring_contribution_product_id(self):
        return f"rp-{self.id}-recurring-contribution-product"

    @property
    def mailchimp_recurring_contribution_product_name(self):
        return "recurring contribution"

    @property
    def mailchimp_contributor_segment_name(self):
        return "Contributors"

    @property
    def mailchimp_recurring_segment_name(self):
        return "Recurring contributors"

    def get_mailchimp_client(self) -> MailchimpMarketing.Client:
        logger.info("Called for rp %s", self.id)
        if not self.mailchimp_integration_connected:
            logger.warning("Called for rp %s which is not connected to Mailchimp")
            raise ValueError("Mailchimp integration not connected for this revenue program")
        client = MailchimpMarketing.Client()
        client.set_config(
            {
                "access_token": self.mailchimp_access_token,
                "server": self.mailchimp_server_prefix,
            }
        )
        return client

    def handle_mailchimp_api_client_write_error(self, entity: str, exc: ApiClientError) -> None:
        logger.info("Called for rp %s", self.id)
        match exc.status_code:
            case 429:
                logger.debug("Mailchimp rate limit exceeded for RP %s, raising exception", self.id)
                # We raise this error because we have Celery tasks that interact with Mailchimp API and
                # in case of rate limit error we will want to retry
                raise MailchimpRateLimitError("Mailchimp rate limit exceeded")
            case _:
                logger.exception("Error creating %s for RP %s. The error text is %s", entity, self.id, exc.text)
                raise MailchimpIntegrationError(f"Error creating {entity}")

    def make_mailchimp_store(self) -> MailchimpStore:
        logger.info("Called for rp %s", self.id)
        if not self.mailchimp_list_id:
            logger.warning("No email list ID on RP %s", self.id)
            raise ValidationError("No email list ID on RP %s", self.id)
        if not self.payment_provider:
            logger.error("No payment provider on RP %s", self.id)
            raise ValidationError("No payment provider on RP %s", self.id)
        client = self.get_mailchimp_client()
        try:
            response = client.ecommerce.add_store(
                {
                    "id": self.mailchimp_store_id,
                    "list_id": self.mailchimp_list_id,
                    "name": self.mailchimp_store_name,
                    "currency_code": self.payment_provider.currency,
                }
            )
            return MailchimpStore(**response)
        except ApiClientError as error:
            return self.handle_mailchimp_api_client_write_error("store", error)

    def make_mailchimp_product(self, product_id: str, product_name: str) -> MailchimpProduct:
        logger.info("Called for rp %s", self.id)
        client = self.get_mailchimp_client()
        try:
            response = client.ecommerce.add_store_product(
                self.mailchimp_store_id,
                {
                    "id": product_id,
                    "title": product_name,
                    "variants": [
                        {
                            "id": product_id,
                            "title": product_name,
                        }
                    ],
                },
            )
            return MailchimpProduct(**response)
        except ApiClientError as error:
            return self.handle_mailchimp_api_client_write_error(product_id, error)

    def make_mailchimp_one_time_contribution_product(self) -> MailchimpProduct:
        logger.info("Called for rp %s", self.id)
        return self.make_mailchimp_product(
            self.mailchimp_one_time_contribution_product_id, self.mailchimp_one_time_contribution_product_name
        )

    def make_mailchimp_recurring_contribution_product(self) -> MailchimpProduct:
        logger.info("Called for rp %s", self.id)
        return self.make_mailchimp_product(
            self.mailchimp_recurring_contribution_product_id, self.mailchimp_recurring_contribution_product_name
        )

    def make_mailchimp_contributor_segment(self) -> MailchimpSegment:
        logger.info("Called for rp %s", self.id)
        if not self.mailchimp_list_id:
            logger.error("No email list ID on RP %s", self.id)
            raise ValidationError("Mailchimp must be connected and email list ID must be set")
        client = self.get_mailchimp_client()
        try:
            response = client.lists.create_segment(
                self.mailchimp_list_id,
                {
                    "name": self.mailchimp_contributor_segment_name,
                    "options": {
                        "match": "all",
                        "conditions": [
                            {
                                "field": "ecomm_purchased",
                                "op": "member",
                            },
                            {
                                "field": "ecomm_prod",
                                "op": "is",
                                "value": self.mailchimp_one_time_contribution_product_name,
                            },
                        ],
                    },
                },
            )
            return MailchimpSegment(**response)
        except ApiClientError as error:
            return self.handle_mailchimp_api_client_write_error(self.mailchimp_contributor_segment_name, error)

    def make_mailchimp_recurring_segment(self) -> MailchimpSegment:
        """"""
        logger.info("Called for rp %s", self.id)
        if not self.mailchimp_list_id:
            logger.error("No email list ID on RP %s", self.id)
            raise ValidationError("Mailchimp must be connected and email list ID must be set")
        client = self.get_mailchimp_client()
        try:
            response = client.lists.create_segment(
                self.mailchimp_list_id,
                {
                    "name": self.mailchimp_recurring_segment_name,
                    "options": {
                        "match": "all",
                        "conditions": [
                            {
                                "field": "ecomm_purchased",
                                "op": "member",
                            },
                            {
                                "field": "ecomm_prod",
                                "op": "is",
                                "value": self.mailchimp_recurring_contribution_product_name,
                            },
                        ],
                    },
                },
            )
            return MailchimpSegment(**response)
        except ApiClientError as exc:
            return self.handle_mailchimp_api_client_write_error(self.mailchimp_recurring_segment_name, exc)

    @property
    def mailchimp_integration_connected(self):
        """Determine mailchimp connection state for the revenue program"""
        return all([self.mailchimp_access_token, self.mailchimp_server_prefix])

    def ensure_mailchimp_store(self) -> None:
        if not self.mailchimp_store:
            logger.info("Creating store for rp_id=[%s]", self.id)
            self.make_mailchimp_store()
        else:
            logger.info("Store already exists for rp_id=[%s]", self.id)

    def ensure_mailchimp_one_time_contribution_product(self) -> None:
        if not self.mailchimp_one_time_contribution_product:
            logger.info("RP with ID %s does not have a one time contributor producxt. Attempting to create", self.id)
            self.make_mailchimp_one_time_contribution_product()
        else:
            logger.info("One-time contribution product already exists for rp_id=[%s]", self.id)

    def ensure_mailchimp_recurring_contribution_product(self) -> None:
        if not self.mailchimp_recurring_contribution_product:
            logger.info("RP with ID %s does not have a recurring contributor product. Attempting to create", self.id)
            self.make_mailchimp_recurring_contribution_product()
        else:
            logger.info("Recurring contribution product already exists for rp_id=[%s]", self.id)

    def ensure_mailchimp_contributor_segment(self) -> None:
        # TODO: [DEV-3579] Handle edge case where segment has been defined in Mailchimp but the ID is not saved in the RP
        if not self.mailchimp_contributor_segment:
            logger.info(
                "Creating %s segment for rp_id=[%s]",
                self.mailchimp_contributor_segment_name,
                self.id,
            )
            segment = self.make_mailchimp_contributor_segment()
            logger.info("Segment created for rp_id=[%s]", self.id)
            self.mailchimp_contributor_segment_id = segment.id
            logger.info("Saving mailchimp contributor segment id for rp_id=[%s]", self.id)
            with reversion.create_revision():
                self.save(update_fields={"mailchimp_contributor_segment_id", "modified"})
                reversion.set_comment("ensure_mailchimp_contributor_segment updated contributor segment id")
        else:
            logger.info("Segment already exists for rp_id=[%s]", self.id)

    def ensure_mailchimp_recurring_segment(self) -> None:
        """Ensure that a Mailchimp segment exists for recurring contributors for the given RevenueProgram.

        Note that this is intended to be run in the `ensure_mailchimp_recurring_segment` task. The indirection
        here is to make `setup_mailchimp_entities_for_rp_mailing_list` more easily testable by providing
        clean, obvious points to mock out.
        """
        # TODO: [DEV-3579] Handle edge case where segment has been defined in Mailchimp but the ID is not saved in the RP
        if not self.mailchimp_recurring_segment:
            logger.info(
                "Creating %s segment for rp_id=[%s]",
                self.mailchimp_contributor_segment_name,
                self.id,
            )
            segment = self.make_mailchimp_recurring_segment()
            logger.info("Segment created for rp_id=[%s]", self.id)
            self.mailchimp_recurring_contributor_segment_id = segment.id
            logger.info("Saving mailchimp recurring contributor segment id for rp_id=[%s]", self.id)
            with reversion.create_revision():
                self.save(update_fields={"mailchimp_recurring_contributor_segment_id", "modified"})
                reversion.set_comment("ensure_mailchimp_recurring_segment updated recurring contributor segment id")
        else:
            logger.info("Segment already exists for rp_id=[%s]", self.id)

    def ensure_mailchimp_entities(self) -> None:
        logger.info("Ensuring mailchimp entities for rp_id=[%s]", self.id)
        self.ensure_mailchimp_store()
        self.ensure_mailchimp_one_time_contribution_product()
        self.ensure_mailchimp_recurring_contribution_product()
        self.ensure_mailchimp_contributor_segment()
        self.ensure_mailchimp_recurring_segment()

    def publish_revenue_program_mailchimp_list_configuration_complete(self):
        """Publish a message to the `RP_MAILCHIMP_LIST_CONFIGURATION_COMPLETE_TOPIC` topic."""
        logger.info("Publishing RP_MAILCHIMP_LIST_CONFIGURATION_COMPLETE_TOPIC for rp_id=[%s]", self.id)
        Publisher.get_instance().publish(
            settings.RP_MAILCHIMP_LIST_CONFIGURATION_COMPLETE_TOPIC, Message(data=str(self.id))
        )

    @property
    def payment_provider_stripe_verified(self):
        return self.payment_provider.stripe_verified if self.payment_provider else False

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

    @property
    def non_profit(self):
        return self.fiscal_status in (FiscalStatusChoices.FISCALLY_SPONSORED, FiscalStatusChoices.NONPROFIT)

    @property
    def mailchimp_access_token_secret_name(self) -> str:
        """This value will be used as the name of the secret in Google Cloud Secrets Manager"""
        return f"MAILCHIMP_ACCESS_TOKEN_FOR_RP_{self.id}_{settings.ENVIRONMENT}"

    @property
    def transactional_email_style(self) -> TransactionalEmailStyle:
        """Guarantees that a TransactionalEmailStyle is returned.

        This value gets used in transactional emails. It's meant to provide a reliable interface for transactional
        email templates such that they don't need any knowledge about RP plans or broader context. Instead, email
        templates can assume that the values provided by this property are always present.

        If the RP's org is on free plan, or if there's no default donation page, return the HubDefaultEmailStyle.
        Otherwise, derive a TransactionalEmailStyle instance based on the default donation page's characteristics.
        If the default page doesn't have a logo, we use the Hub's instead.
        """
        if any(
            [
                self.organization.plan.name == "FREE",
                not (page := self.default_donation_page),
            ]
        ):
            return HubDefaultEmailStyle
        else:
            _style = AttrDict(page.styles.styles if page.styles else {})
            return TransactionalEmailStyle(
                is_default_logo=not page.header_logo,
                logo_url=page.header_logo.url if page.header_logo else HubDefaultEmailStyle.logo_url,
                logo_alt_text=page.header_logo_alt_text or ""
                if page.header_logo
                else HubDefaultEmailStyle.logo_alt_text,
                header_color=_style.colors.cstm_mainHeader or None,
                header_font=_style.font.heading or None,
                body_font=_style.font.body or None,
                button_color=_style.colors.cstm_CTAs or None,
            )

    # TODO: [DEV-3582] Better caching for mailchimp entities
    @cached_property
    def mailchimp_email_lists(self) -> list[MailchimpEmailList]:
        """Retrieve Mailchimp email lists for this RP, if any.

        See https://mailchimp.com/developer/marketing/api/lists/get-lists-info/
        """
        logger.info("Called for rp %s", self.id)
        if not self.mailchimp_integration_connected:
            logger.debug(
                "Mailchimp integration not connected for this revenue program (%s), returning empty list", self.id
            )
            return []
        try:
            logger.info(
                "Fetching email lists from Mailchimp for RP with ID %s mc server prefix %s",
                self.id,
                self.mailchimp_server_prefix,
            )
            client = self.get_mailchimp_client()
            response = client.lists.get_all_lists(count=1000)
            lists = response.get("lists", [])
            logger.debug("Response from Mailchimp containing %s list ids", len(lists))
            return [MailchimpEmailList(**x) for x in lists]
        except ApiClientError as exc:
            logger.exception(
                (
                    "Failed to fetch email lists from Mailchimp for RP with ID %s mc server prefix %s. "
                    "The error text is %s"
                ),
                self.id,
                self.mailchimp_server_prefix,
                exc.text,
            )
            return []

    def clean_fields(self, **kwargs):
        if not self.id:
            self.slug = normalize_slug(self.name, self.slug, max_length=RP_SLUG_MAX_LENGTH)
        super().clean_fields(**kwargs)

    def clean(self):
        # Avoid state of a rev program's default page not being one of "its pages"
        if self.default_donation_page and self.default_donation_page.revenue_program != self:
            raise ValidationError(
                f'Contribution page "{self.default_donation_page}" is already associated with a revenue program, "{self.default_donation_page.revenue_program}"'
            )
        # Ensure no @ symbol on twitter_handle-- we'll add those later
        if self.twitter_handle and self.twitter_handle[0] == "@":
            self.twitter_handle = self.twitter_handle.replace("@", "")

        self.clean_fiscal_sponsor_name()

    def clean_fiscal_sponsor_name(self):
        """Ensure a fiscally sponsored record has the fiscal sponsor name"""
        if self.fiscal_status == FiscalStatusChoices.FISCALLY_SPONSORED and not self.fiscal_sponsor_name:
            raise ValidationError("Please enter the fiscal sponsor name.")
        elif self.fiscal_sponsor_name and self.fiscal_status != FiscalStatusChoices.FISCALLY_SPONSORED:
            raise ValidationError("Only fiscally sponsored Revenue Programs can have a fiscal sponsor name.")

    def stripe_create_apple_pay_domain(self):
        """
        Register an ApplePay domain with Apple (by proxy) for this RevenueProgram.

        NOTE: Cannot create ApplePay Domains using test key.

        "If you're hoping to test this locally, pretty much too bad"
            -- Steve Jobs
        """
        if settings.STRIPE_LIVE_MODE and not self.domain_apple_verified_date:
            try:
                stripe.ApplePayDomain.create(
                    api_key=settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS,
                    domain_name=f"{self.slug}.{settings.DOMAIN_APEX}",
                    stripe_account=self.payment_provider.stripe_account_id,
                )
                self.domain_apple_verified_date = timezone.now()
                self.save()
            except stripe.error.StripeError as ex:
                logger.exception(
                    "Failed to register ApplePayDomain for RevenueProgram %s because of StripeError",
                    self.name,
                )
                raise ex


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
        """Retreieve live and future live contribution pages that rely on this payment provider"""
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
            self.stripe_product_id = product["id"]
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
