import inspect
import json
import logging
import os
from dataclasses import dataclass
from typing import Literal, TypedDict

from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser

import stripe
from mailchimp_marketing.api_client import ApiClientError

from apps.contributions.stripe_import import StripeTransactionsImporter
from apps.organizations.mailchimp import MailchimpStore, RevenueProgramMailchimpClient
from apps.organizations.models import RevenueProgram
from apps.organizations.typings import MailchimpProductType, MailchimpSegmentName


# For QA, we'll set this to 10 so that we can test pagination without
# having to create a bunch of test data
MC_RESULTS_PER_PAGE = int(os.environ.get("MC_RESULTS_PER_PAGE", 1000))


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class Dev5586MailchimpMigrationerror(Exception):
    pass


class MailchimpOrderLineItem(TypedDict):
    product_id: str
    product_variant_id: str
    quantity: int
    price: float
    discount: float


class PartialMailchimpRecurringOrder(TypedDict):
    id: str
    lines: list[MailchimpOrderLineItem]


class BatchOperation(TypedDict):
    path: str
    body: str
    method: str


class MailchimpRecurringOrder:

    def __init__(
        self,
        rp: RevenueProgram,
        invoice_id: str,
        order: PartialMailchimpRecurringOrder,
    ):
        self.rp = rp
        self.invoice_id = invoice_id
        self.order = order
        self.subscription = self.get_subscription()
        self.interval = self.get_interval()

    def get_subscription(self) -> stripe.Subscription | None:
        try:
            invoice = stripe.Invoice.retrieve(
                self.invoice_id, expand=["subscription"], stripe_account=self.rp.stripe_account_id
            )
        except stripe.error.StripeError as e:
            logger.warning("Failed to retrieve subscription for invoice ID %s: %s", self.invoice_id, e)
            raise Dev5586MailchimpMigrationerror(
                f"Failed to retrieve subscription for invoice ID {self.invoice_id}"
            ) from e
        else:
            if not (subscription := invoice.subscription):
                logger.warning("Invoice ID %s does not have a subscription", self.invoice_id)
                raise Dev5586MailchimpMigrationerror(f"Invoice ID {self.invoice_id} does not have a subscription")
            return subscription

    def get_interval(self) -> Literal["month", "year"]:
        if not self.subscription:
            logger.warning("Cannot get interval because no subscription data for invoice ID %s", self.invoice_id)
            raise Dev5586MailchimpMigrationerror(
                f"Cannot get interval because no subscription data for invoice ID {self.invoice_id}"
            )
        match self.subscription.plan.interval:
            case "month":
                return "month"
            case "year":
                return "year"
            case _:
                raise Dev5586MailchimpMigrationerror(
                    f"Invalid interval for subscription {self.subscription.id} for invoice ID {self.invoice_id}"
                )

    def get_udpate_order_batch_op(self) -> BatchOperation | None:
        if not self.interval or not self.order:
            logger.warning("Cannot update order with missing interval or order data")
            raise Dev5586MailchimpMigrationerror("Cannot update order with missing interval or order data")
        if (count := len(self.order["lines"])) != 1:
            logger.warning("Order has more than %s line item%s, cannot update", count, "" if count == 1 else "s")
            raise Dev5586MailchimpMigrationerror("Order has more than one line item, cannot update")
        line = self.order["lines"][0]
        new_id = (
            MailchimpProductType.MONTHLY.as_mailchimp_product_id(self.rp.id)
            if self.interval == "month"
            else MailchimpProductType.YEARLY.as_mailchimp_product_id(self.rp.id)
        )
        if line["product_id"] == new_id and line["product_variant_id"] == new_id:
            logger.info("Order already has correct product type, no update needed")
            return None

        return {
            "method": "PATCH",
            "path": f"/ecommerce/stores/{self.rp.mailchimp_store.id}/orders/{self.order['id']}",
            "body": json.dumps({"lines": [{**line, "product_id": new_id, "product_variant_id": new_id}]}),
        }


@dataclass
class MailchimpMigrator:

    rp_id: int

    def __post_init__(self):
        try:
            self.rp: RevenueProgram = RevenueProgram.objects.get(id=self.rp_id)
        except RevenueProgram.DoesNotExist:
            logger.warning("Revenue program with ID %s does not exist", self.rp_id)
            raise Dev5586MailchimpMigrationerror(f"Revenue program with ID {self.rp_id} does not exist") from None
        self.validate_rp()
        self.mc_client: RevenueProgramMailchimpClient = self.rp.mailchimp_client
        # ignoring type check complaint about mc_store and stripe_account_id on StripeTransactionsImporter because
        # linter can't see the validation to understand that these will never be None
        self.mc_store: MailchimpStore = self.rp.mailchimp_store  # type: ignore
        self.stripe_importer: StripeTransactionsImporter = StripeTransactionsImporter(stripe_account_id=self.rp.stripe_account_id)  # type: ignore

    def validate_rp(self):
        if not self.rp.mailchimp_integration_connected:
            logger.warning("Revenue program with ID %s does not have Mailchimp integration connected", self.rp.id)
            raise Dev5586MailchimpMigrationerror(
                f"Revenue program with ID {self.rp.id} does not have Mailchimp integration connected"
            )
        if not self.rp.stripe_account_id:
            logger.warning("Revenue program with ID %s does not have a Stripe account ID", self.rp.id)
            raise Dev5586MailchimpMigrationerror(
                f"Revenue program with ID {self.rp.id} does not have a Stripe account ID"
            )

    def get_stripe_invoices(self) -> None:
        logger.info("Retrieving all invoices from Stripe for revenue program with ID %s", self.rp.id)
        try:
            self.stripe_importer.list_and_cache_invoices()
        # or is this backoff error?
        except stripe.error.StripeError as e:
            logger.warning("Failed to retrieve invoices from Stripe for revenue program with ID %s: %s", self.rp.id, e)
            raise Dev5586MailchimpMigrationerror(
                f"Failed to retrieve invoices from Stripe for revenue program with ID {self.rp.id}"
            ) from e

    def get_subscription_interval_for_order(self, order_id: str) -> Literal["month", "year"] | None:
        invoice_key = self.stripe_importer.make_key(entity_name="invoice", entity_id=order_id)
        if not (invoice := self.stripe_importer.get_resource_from_cache(invoice_key)):
            logger.warning("Invoice with ID %s not found in cache", order_id)
            return None
        if not (sub := invoice.get("subscription")):
            logger.warning("Invoice with ID %s does not have a subscription", order_id)
            return None
        if not (plan := sub.get("plan")):
            logger.warning("Subscription %s for invoice with ID %s does not have a plan object", sub["id"], order_id)
            return None
        match plan["interval"]:
            case "month":
                return "month"
            case "year":
                return "year"
            case _:
                logger.warning("Invalid interval for subscription %s for invoice with ID %s", sub["id"], order_id)
                return None

    def ensure_mailchimp_monthly_and_yearly_products(self) -> None:
        """Ensure that the RP's MC account has new product types for monthly and yearly contributions."""
        target_products = [MailchimpProductType.MONTHLY, MailchimpProductType.YEARLY]
        to_create = [x for x in target_products if not getattr(self.rp, x.as_rp_field())]
        if not to_create:
            logger.info("Revenue program with ID %s already has monthly and yearly Mailchimp product types", self.rp.id)
            return
        for product_type in to_create:
            logger.info("Creating Mailchimp product type %s for revenue program ID %s", product_type, self.rp.id)
            self.rp.ensure_mailchimp_contribution_product(product_type)
            self.rp.refresh_from_db()
            if not getattr(self.rp, product_type.as_rp_field()):
                logger.warning(
                    "Failed to create Mailchimp product type %s for revenue program ID %s", product_type, self.rp.id
                )
                raise Dev5586MailchimpMigrationerror(
                    f"Failed to create Mailchimp product type {product_type} for revenue program ID {self.rp.id}"
                )

    def ensure_monthly_and_yearly_mailchimp_segments(self) -> None:
        """Ensure that the RP's MC account has new segments for monthly and yearly contributors."""
        if not (self.rp.mailchimp_monthly_contribution_product and self.rp.mailchimp_yearly_contribution_product):
            logger.warning(
                "Revenue program with ID %s does not have monthly and yearly Mailchimp product types", self.rp.id
            )
            raise Dev5586MailchimpMigrationerror(
                f"Revenue program with ID {self.rp.id} does not have monthly and yearly Mailchimp product types"
            )
        target_segments = [MailchimpSegmentName.MONTHLY_CONTRIBUTORS, MailchimpSegmentName.YEARLY_CONTRIBUTORS]
        to_create = [x for x in target_segments if not getattr(self.rp, x.as_rp_id_field())]
        if not to_create:
            logger.info("Revenue program with ID %s already has monthly and yearly Mailchimp segments", self.rp.id)
            return
        for segment in to_create:
            logger.info("Creating Mailchimp segment %s for revenue program ID %s", segment, self.rp.id)
            self.rp.ensure_mailchimp_contributor_segment(segment)
            self.rp.refresh_from_db()
            if not getattr(self.rp, segment.as_rp_id_field()):
                logger.warning("Failed to create Mailchimp segment %s for revenue program ID %s", segment, self.rp.id)
                raise Dev5586MailchimpMigrationerror(
                    f"Failed to create Mailchimp segment {segment} for revenue program ID {self.rp.id}"
                )

    def ensure_mailchimp_recurring_segment_criteria(self) -> None:
        """Ensure that the membership criteria for the recurring contributors segment is up to date."""
        if not (segment := self.rp.mailchimp_recurring_contributors_segment):
            logger.warning("Revenue program with ID %s does not have recurring contributors segment", self.rp.id)
            raise Dev5586MailchimpMigrationerror(
                f"Revenue program with ID {self.rp.id} does not have recurring contributors segment"
            )
        if segment.options == (conditions := MailchimpSegmentName.RECURRING_CONTRIBUTORS.get_segment_creation_config()):
            logger.info(
                "Revenue program with ID %s already has upated membership criteria for recurring contributors segment",
                self.rp.id,
            )
            return
        try:
            # is there a spelling issue here on old? or was this the only already pluralized one?
            self.rp.mailchimp_client.lists.update_segment(
                segment.list_id, MailchimpSegmentName.RECURRING_CONTRIBUTORS, conditions
            )
        except ApiClientError as e:
            logger.warning(
                "Failed to update membership criteria for recurring contributors segment for revenue program ID %s: %s",
                self.rp.id,
                e.text,
            )
            raise Dev5586MailchimpMigrationerror(
                f"Failed to update membership criteria for recurring contributors "
                f"segment for revenue program ID {self.rp.id}"
            ) from e
        else:
            logger.info(
                "Updated membership criteria for recurring contributors segment for revenue program ID %s", self.rp.id
            )

    def _get_all_orders(self) -> list[PartialMailchimpRecurringOrder]:
        """Get all orders for a store."""
        offset = 0
        orders_to_update = []
        limit = MC_RESULTS_PER_PAGE
        line_item_save_keys = inspect.get_annotations(MailchimpOrderLineItem).keys()
        while True:
            logger.info(
                "Retrieving orders for store ID %s with offset %s and limit %s",
                (store_id := self.mc_store.id),
                offset,
                limit,
            )
            try:
                _orders = self.mc_client.ecommerce.get_store_orders(store_id, offset=offset, count=limit)
            except ApiClientError as e:
                logger.warning("Failed to retrieve orders for store ID %s: %s", store_id, e.text)
                raise Dev5586MailchimpMigrationerror(f"Failed to retrieve orders for store ID {store_id}") from e
            for x in _orders["orders"]:
                lines = [
                    MailchimpOrderLineItem(**{k: v for k, v in y.items() if k in line_item_save_keys})
                    for y in x["lines"]
                ]
                orders_to_update.append(PartialMailchimpRecurringOrder(id=x["id"], lines=lines))
            if offset + len(_orders["orders"]) < _orders["total_items"]:
                offset += limit
            else:
                break
        return orders_to_update

    def _get_updateable_orders(self) -> list[PartialMailchimpRecurringOrder]:
        return [x for x in self._get_all_orders() if x["id"].startswith("in_")]

    def get_update_mailchimp_orders_batches_for_rp(self) -> list[BatchOperation]:
        batches = []
        updateable_orders = self._get_updateable_orders()
        logger.info(
            "Found %s order%s to update for revenue program ID %s",
            (count := len(updateable_orders)),
            "" if count == 1 else "s",
            self.rp.id,
        )
        for x in updateable_orders:
            try:
                if batch := MailchimpRecurringOrder(
                    rp=self.rp, invoice_id=x["id"], order=x
                ).get_udpate_order_batch_op():
                    batches.append(batch)
            except Dev5586MailchimpMigrationerror:
                continue
        return batches

    def update_mailchimp_orders_for_rp(self) -> list[MailchimpRecurringOrder] | None:
        batch = self.get_update_mailchimp_orders_batches_for_rp()
        if not batch:
            logger.info("No orders to update for revenue program ID %s", self.rp.id)
            return
        # chunk batch into 500
        # send batches


def migrate_rp_mailchimp_integration(rp_id: int) -> None:
    migrator = MailchimpMigrator(rp_id)
    migrator.get_stripe_invoices()
    migrator.ensure_mailchimp_monthly_and_yearly_products()
    migrator.ensure_monthly_and_yearly_mailchimp_segments()
    migrator.ensure_mailchimp_recurring_segment_criteria()
    migrator.update_mailchimp_orders_for_rp()


class Command(BaseCommand):
    """Command to migrate RP's using old (pre-DEV-5584) Mailchimp products and segments to new ones."""

    def add_arguments(self, parser: CommandParser):
        parser.add_argument(  # pragma: no cover
            "revenue_programs",
            type=lambda s: [x.strip() for x in s.split(",")],
            default=[],
            help="Optional comma-separated list of revenue program ids to limit to",
        )
        parser.add_argument("--mc-page-count", type=int, help="", default=MC_RESULTS_PER_PAGE)

    def handle(self, *args, **options):
        for rp_id in options["revenue_programs"]:
            migrate_rp_mailchimp_integration(rp_id)
        logger.info("Mailchimp migration complete")
