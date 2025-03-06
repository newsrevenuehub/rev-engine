from __future__ import annotations

import logging
import typing
from dataclasses import dataclass
from typing import Literal

from django.conf import settings

import mailchimp_marketing as MailchimpMarketing
from mailchimp_marketing.api_client import ApiClientError

from apps.organizations.typings import MailchimpProductType, MailchimpSegmentName


# this is to avoid circular import issues, as this module is a depdency of
# organizations.models
if typing.TYPE_CHECKING:  # pragma: no cover
    from apps.organizations.models import RevenueProgram

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class MailchimpIntegrationError(Exception):
    pass


class MailchimpRateLimitError(Exception):
    pass


# A sibling app (switchboard-api) has manually managed definitions like the `Mailchimp...` ones below
# This is not an ideal way to manage this but in short term it allows us to get everything running in prod quickly
# while also ensuring the two app data models are in sync (insofar as we human maintainers can ensure that).
@dataclass(frozen=True)
class MailchimpProductImage:
    """An instance of a Mailchimp product image, as represented by the Mailchimp API and relayed by rev-engine."""

    id: str  # Unique identifier for the image
    product_id: str  # ID of the product this image belongs to
    url: str  # URL to the product image
    variant_ids: list[str]  # List of variant IDs associated with this image


@dataclass(frozen=True)
class MailchimpProductVariant:
    """An instance of a Mailchimp product variant, as represented by the Mailchimp API and relayed by rev-engine."""

    id: str  # Unique identifier for the product variant
    product_id: str  # ID of the product this variant belongs to
    title: str  # Title of the product variant
    url: str  # URL to the product variant
    sku: str  # Stock Keeping Unit (SKU) associated with the product variant
    price: float  # Price of the product variant
    inventory_quantity: int  # Available inventory for the product variant
    image_url: str | None = None  # URL of the product variant's image


@dataclass(frozen=True)
class MailchimpProductLink:
    """An instance of a Mailchimp product link, as represented by the Mailchimp API and relayed by rev-engine."""

    id: str  # Unique identifier for the link
    product_id: str  # ID of the product this link belongs to
    url: str  # URL to the product link
    type: str  # Type of the link (could be 'website', 'store', etc.)


@dataclass(frozen=True)
class MailchimpProduct:
    """An instance of a Mailchimp product link, as represented by the Mailchimp API and relayed by rev-engine."""

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
    variants: list[MailchimpProductVariant]
    images: list[MailchimpProductImage]
    published_at_foreign: str
    _links: list[MailchimpProductLink]


@dataclass(frozen=True)
class MailchimpEmailList:
    """An instance of a Mailchimp email list (aka audience), as represented by the Mailchimp API and relayed by rev-engine."""

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
    modules: list
    stats: dict
    _links: list[dict]


@dataclass(frozen=True)
class MailchimpStore:
    """An instance of a Mailchimp store, as represented by the Mailchimp API and relayed by rev-engine."""

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
    _links: list[dict]


@dataclass(frozen=True)
class MailchimpSegment:
    """An instance of a Mailchimp segment, as represented by the Mailchimp API and relayed by rev-engine."""

    id: str
    name: str
    member_count: int
    type: Literal["saved", "static", "fuzzy"]
    created_at: str
    updated_at: str
    options: dict
    list_id: str
    _links: list[dict]


class RevenueProgramMailchimpClient(MailchimpMarketing.Client):
    """Mailchimp client configured to interact with a revenue program's integration, after it's been initially set up."""

    def __init__(self, rp: RevenueProgram):
        logger.info("Called for RP %s", rp.id)
        if not rp.mailchimp_integration_connected:
            logger.warning("Called for RP %s which is not connected to Mailchimp", rp.id)
            raise MailchimpIntegrationError(f"Mailchimp integration not connected for RP {rp.id}")
        super().__init__()
        self.revenue_program = rp
        self.set_config(
            {
                "access_token": rp.mailchimp_access_token,
                "server": rp.mailchimp_server_prefix,
            }
        )

    def create_product(self, product_type: MailchimpProductType) -> MailchimpProduct | None:
        product_id = product_type.as_mailchimp_product_id(self.revenue_program.id)
        product_name = product_type.as_mailchimp_product_name()
        logger.info(
            "Called for RP %s, product_id %s, product_name %s", self.revenue_program.id, product_id, product_name
        )
        """Creates a Mailchimp ecommerce product. A Mailchimp store must be previously created for the revenue program."""
        try:
            response = self.ecommerce.add_store_product(
                self.revenue_program.mailchimp_store_id,
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
        except ApiClientError as error:
            return self._handle_write_error(product_id, error)
        else:
            return MailchimpProduct(**response)

    def create_segment(self, segment_name: MailchimpSegmentName, options) -> MailchimpSegment | None:
        """Create a segment of the revenue program's Mailchimp list. This list must be previously created."""
        logger.info("Called for RP %s, segment_name %s", self.revenue_program.id, segment_name)
        self._has_list_id(raise_if_not_present=True)
        try:
            response = self.lists.create_segment(
                self.revenue_program.mailchimp_list_id,
                {"name": segment_name, "options": options},
            )
        except ApiClientError as error:
            return self._handle_write_error(segment_name, error)
        else:
            return MailchimpSegment(**response)

    def create_store(self) -> MailchimpStore:
        """Create a Mailchimp ecommerce store for the revenue program's Mailchimp list. This list must be previously created."""
        logger.info("Called for RP %s", self.revenue_program.id)
        self._has_list_id(raise_if_not_present=True)
        if not self.revenue_program.payment_provider:
            logger.error("No payment provider on RP %s", self.revenue_program.id)
            raise MailchimpIntegrationError("No payment provider on RP %s", self.revenue_program.id)
        try:
            response = self.ecommerce.add_store(
                {
                    "id": self.revenue_program.mailchimp_store_id,
                    "list_id": self.revenue_program.mailchimp_list_id,
                    "name": self.revenue_program.mailchimp_store_name,
                    "currency_code": self.revenue_program.payment_provider.currency,
                }
            )
        except ApiClientError as error:
            return self._handle_write_error("store", error)
        else:
            return MailchimpStore(**response)

    def get_email_list(self) -> MailchimpEmailList | None:
        """Retrieve the Mailchimp list belonging to the integration, if it exists."""
        logger.debug("Called for RP %s", self.revenue_program.id)
        if not self._has_list_id():
            return None
        try:
            logger.info("Getting list %s for RP %s", self.revenue_program.mailchimp_list_id, self.revenue_program.id)
            response = self.lists.get_list(self.revenue_program.mailchimp_list_id)
        except ApiClientError as error:
            # we want to log as an error if not found because in this case, something has gone wrong in that we have a
            # list ID but it is not found on Mailchimp.  This will give us a signal in Sentry, while not blocking
            # serialization of the revenue program.
            return self._handle_read_error("mailchimp email list", error, log_level_on_not_found="error")
        else:
            return MailchimpEmailList(**response)

    def get_product(self, product_id: str) -> MailchimpProduct | None:
        """Retrieve an ecommerce product from the revenue program's Mailchimp store, if it exists."""
        logger.debug("Called for RP %s", self.revenue_program.id)
        try:
            response = self.ecommerce.get_store_product(self.revenue_program.mailchimp_store_id, product_id)
        except ApiClientError as exc:
            return self._handle_read_error("contribution product", exc)
        else:
            return MailchimpProduct(**response)

    def get_segment(self, segment_id: int) -> MailchimpSegment | None:
        """Retrieve a segment of the revenue program's Mailchimp list, if it exists."""
        logger.debug("Called for RP %s", self.revenue_program.id)
        if not self._has_list_id():
            return None
        try:
            response = self.lists.get_segment(self.revenue_program.mailchimp_list_id, segment_id)
        except ApiClientError as error:
            return self._handle_read_error("contributor segment", error)
        else:
            return MailchimpSegment(**response)

    def get_store(self) -> MailchimpStore | None:
        """Retrieve the revenue program's Mailchimp ecommerce store, if it exists."""
        logger.debug("Called for RP %s", self.revenue_program.id)
        try:
            response = self.ecommerce.get_store(self.revenue_program.mailchimp_store_id)
        except ApiClientError as exc:
            return self._handle_read_error("store", exc)
        else:
            return MailchimpStore(**response)

    def _has_list_id(self, raise_if_not_present=False):
        """Check whether a revenue program has a check for Mailchimp list ID on a revenue program."""
        if not self.revenue_program.mailchimp_list_id:
            logger.debug("No email list ID on RP %s", self.revenue_program.id)
            if raise_if_not_present:
                raise MailchimpIntegrationError("Mailchimp must be connected and email list ID must be set")
            return False
        return True

    def _handle_read_error(
        self, entity: str, exc: ApiClientError, log_level_on_not_found: Literal["debug", "error", "warning"] = "debug"
    ) -> None:
        logger.info("Called for RP %s", self.revenue_program.id)
        match exc.status_code:
            case 404:
                getattr(logger, log_level_on_not_found)(
                    "Mailchimp %s not found for RP %s, returning None", entity, self.revenue_program.id
                )
            case 429:
                logger.warning("Mailchimp rate limit exceeded for RP %s, raising exception", self.revenue_program.id)
                # We raise this error because we have Celery tasks that interact with Mailchimp API and
                # in case of rate limit error we will want to retry
                raise MailchimpRateLimitError("Mailchimp rate limit exceeded")
            case _:
                logger.error("Unexpected error from Mailchimp API. The error text is %s", exc.text, exc_info=exc)

    def _handle_write_error(self, entity: str, exc: ApiClientError) -> None:
        logger.info("Called for RP %s", self.revenue_program.id)
        match exc.status_code:
            case 429:
                logger.warning("Mailchimp rate limit exceeded for RP %s, raising exception", self.revenue_program.id)
                # We raise this error because we have Celery tasks that interact with Mailchimp API and
                # in case of rate limit error we will want to retry
                raise MailchimpRateLimitError("Mailchimp rate limit exceeded")
            case _:
                logger.error(
                    "Error creating %s for RP %s. The error text is %s",
                    entity,
                    self.revenue_program.id,
                    exc.text,
                    exc_info=exc,
                )
                raise MailchimpIntegrationError(f"Error creating {entity}")
