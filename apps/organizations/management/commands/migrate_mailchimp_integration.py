import inspect
import json
import logging
import time
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


MC_RESULTS_PER_PAGE_DEFAULT = 1000
MC_BATCH_SIZE_DEFAULT = 500

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class Dev5586MailchimpMigrationerror(Exception):
    """Custom exception for errors during DEV-5586 Mailchimp migration."""


class MailchimpOrderLineItem(TypedDict):
    """Type definition for a Mailchimp order line item.

    Note that a returned line item will have additional field. This is for
    line items used when updating an order.
    """

    product_id: str
    product_variant_id: str
    quantity: int
    price: float
    discount: float


class PartialMailchimpRecurringOrder(TypedDict):
    """Type definition for Mailchimp order for a recurring contribution.

    We use this when updating orders.
    """

    id: str
    lines: list[MailchimpOrderLineItem]


class BatchOperation(TypedDict):
    """Type definition for a Mailchimp batch operation."""

    path: str
    body: str
    method: str


@dataclass
class MailchimpMigrator:
    """Class to handle the migration of a revenue program's Mailchimp integration."""

    rp_id: int
    mc_batch_size: int
    mc_results_per_page: int

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
        """Validate that the revenue program is ready for Mailchimp migration.

        We ensure the RP:
            - has an MC server prefix
            - has an MC access token
            - has an MC list ID
            - has an MC store
            - has a Stripe account ID
        """
        if not self.rp.mailchimp_integration_ready:
            logger.warning("Revenue program with ID %s does not have Mailchimp integration connected", self.rp.id)
            raise Dev5586MailchimpMigrationerror(
                f"Revenue program with ID {self.rp.id} does not have Mailchimp integration connected"
            )
        if not self.rp.stripe_account_id:
            logger.warning("Revenue program with ID %s does not have a Stripe account ID", self.rp.id)
            raise Dev5586MailchimpMigrationerror(
                f"Revenue program with ID {self.rp.id} does not have a Stripe account ID"
            )

    def get_stripe_data(self) -> None:
        """Retrieve all invoices from Stripe for the revenue program."""
        logger.info("Retrieving all invoices from Stripe for revenue program with ID %s", self.rp.id)
        try:
            self.stripe_importer.list_and_cache_stripe_resources_for_recurring_contributions()
        # or is this backoff error?
        except stripe.error.StripeError as e:
            logger.warning("Failed to retrieve invoices from Stripe for revenue program with ID %s: %s", self.rp.id, e)
            raise Dev5586MailchimpMigrationerror(
                f"Failed to retrieve invoices from Stripe for revenue program with ID {self.rp.id}"
            ) from e

    def get_subscription_interval_for_order(self, order_id: str) -> Literal["month", "year"] | None:
        """Get the subscription interval for an order."""
        invoice_key = self.stripe_importer.make_key(entity_name="Invoice", entity_id=order_id)
        if not (invoice := self.stripe_importer.get_resource_from_cache(invoice_key)):
            logger.warning("Invoice with ID %s not found in cache", order_id)
            return None
        if not (sub_id := invoice.get("subscription")):
            logger.warning("Invoice with ID %s does not have a subscription ID", order_id)
            return None
        sub_key = self.stripe_importer.make_key(entity_name="Subscription", entity_id=sub_id)

        if not (sub := self.stripe_importer.get_resource_from_cache(sub_key)):
            logger.warning("Subscription with ID %s (for invoice %s) not found in cache", sub_id, order_id)
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

    def get_udpate_order_batch_op(
        self, interval: Literal["month", "year"], order: PartialMailchimpRecurringOrder
    ) -> BatchOperation | None:
        """Get a batch operation to update an order to the new product type."""
        if (count := len(order["lines"])) != 1:
            logger.warning("Order has %s line item%s, cannot update", count, "" if count == 1 else "s")
            raise Dev5586MailchimpMigrationerror("Order has more than one line item, cannot update")
        line = order["lines"][0]
        new_id = (
            MailchimpProductType.MONTHLY.as_mailchimp_product_id(self.rp.id)
            if interval == "month"
            else MailchimpProductType.YEARLY.as_mailchimp_product_id(self.rp.id)
        )
        if line["product_id"] == new_id and line["product_variant_id"] == new_id:
            logger.info("Order already has correct product type, no update needed")
            return None
        return BatchOperation(
            method="PATCH",
            path=f"/ecommerce/stores/{self.mc_store.id}/orders/{order['id']}",
            body=json.dumps({"lines": [{**line, "product_id": new_id, "product_variant_id": new_id}]}),
        )

    def ensure_mailchimp_monthly_and_yearly_products(self) -> None:
        """Ensure that the RP's MC account has new product types for monthly and yearly contributions."""
        target_products = [MailchimpProductType.MONTHLY, MailchimpProductType.YEARLY]
        to_create = [x for x in target_products if not getattr(self.rp, (field := x.as_rp_field()))]
        if not to_create:
            logger.info("Revenue program with ID %s already has monthly and yearly Mailchimp product types", self.rp.id)
            return
        for product_type in to_create:
            logger.info("Creating Mailchimp product type %s for revenue program ID %s", product_type, self.rp.id)
            self.rp.ensure_mailchimp_contribution_product(product_type)
            # MC products are use cached property, and since we reference above before
            # creating, we need to clear cached value.
            self.rp.__dict__.pop(field, None)
            if not getattr(self.rp, field):
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

    def ensure_mailchimp_recurring_segment_criteria(self) -> None:
        """Ensure that the membership criteria for the recurring contributors segment is up to date."""
        if not (segment := self.rp.mailchimp_recurring_contributors_segment):
            logger.warning("Revenue program with ID %s does not have recurring contributors segment", self.rp.id)
            raise Dev5586MailchimpMigrationerror(
                f"Revenue program with ID {self.rp.id} does not have recurring contributors segment"
            )
        if segment.options == (options := MailchimpSegmentName.RECURRING_CONTRIBUTORS.get_segment_options()):
            logger.info(
                "Revenue program with ID %s already has updated membership criteria for recurring contributors segment",
                self.rp.id,
            )
            return
        try:
            self.mc_client.lists.update_segment(
                segment.list_id, self.rp.mailchimp_recurring_contributors_segment_id, {"options": options}
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
        limit = self.mc_results_per_page
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

    def get_update_mailchimp_orders_batches(self) -> list[BatchOperation]:
        batches = []
        updateable_orders = self._get_updateable_orders()
        logger.info(
            "Found %s order%s to update for revenue program ID %s",
            (count := len(updateable_orders)),
            "" if count == 1 else "s",
            self.rp.id,
        )
        for x in updateable_orders:
            if not (interval := self.get_subscription_interval_for_order(x["id"])):
                logger.warning("Failed to get subscription interval for order with ID %s. Skipping", x["id"])
                continue
            try:
                if batch := self.get_udpate_order_batch_op(interval, x):
                    batches.append(batch)
            except Dev5586MailchimpMigrationerror:
                continue
        return batches

    def update_mailchimp_orders_for_rp(self) -> list[dict[str, Literal["finished", "canceled", "timeout"]]]:
        batches = self.get_update_mailchimp_orders_batches()
        if not batches:
            logger.info("No orders to update for revenue program ID %s", self.rp.id)
        batch_outcomes = []
        for i in range(0, len(batches), self.mc_batch_size):
            start_time = time.time()
            response = self.mc_client.batches.start({"operations": batches[i : i + self.mc_batch_size]})
            batch_id = response["id"]
            logger.info("Batch %s started with ID: {batch_id}", i + 1)
            # this can take up to 10 minutes to return
            status = self.monitor_batch_status(batch_id)
            batch_outcomes.append({"batch_id": batch_id, "status": status})
            end_time = time.time()
            # if batches remain, and if current pacing would put us on track to exceed 10 requests per minute
            if i < len(batches) - 1 and end_time - start_time < 6:
                logger.info("Waiting 6 seconds before next batch submission...")
                time.sleep(6)
        return batch_outcomes

    def monitor_batch_status(
        self, batch_id, timeout=600, interval=10
    ) -> Literal["finished", "canceled", "timeout"] | None:
        """Monitor the status of a batch operation."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                status = self.mc_client.batches.status(batch_id)
                logger.info(
                    "Batch %s status: %s, completed operations: %s/%s",
                    batch_id,
                    status["status"],
                    status.get("completed_operations", 0),
                    status.get("total_operations", 0),
                )
                if status["status"] in ["finished", "canceled"]:
                    return status
                time.sleep(interval)
            except ApiClientError:
                logger.exception("Error checking status for batch %s", batch_id)
        logger.warning("Monitoring timed out for batch %s", batch_id)
        return "timeout"


def migrate_rp_mailchimp_integration(rp_id: int, mc_batch_size: int, mc_results_per_page: int) -> None:
    migrator = MailchimpMigrator(
        rp_id=rp_id,
        mc_batch_size=mc_batch_size,
        mc_results_per_page=mc_results_per_page,
    )

    migrator.get_stripe_data()
    # at this point we have Stripe data in Redis cache
    try:
        migrator.ensure_mailchimp_monthly_and_yearly_products()
        migrator.ensure_monthly_and_yearly_mailchimp_segments()
        migrator.ensure_mailchimp_recurring_segment_criteria()
        migrator.update_mailchimp_orders_for_rp()
    # no matter what, we want to clear the cache
    finally:
        migrator.stripe_importer.clear_all_stripe_transactions_cache()


class Command(BaseCommand):
    """Command to migrate RP's using old (pre-DEV-5584) Mailchimp products and segments to new ones."""

    def add_arguments(self, parser: CommandParser):
        parser.add_argument(  # pragma: no cover
            "revenue_programs",
            type=lambda s: [x.strip() for x in s.split(",")],
            help="Comma-separated list of revenue program ids to limit to",
        )
        parser.add_argument(
            "--mc-page-count",
            type=int,
            help="Number of results per page when retrieving orders",
            default=MC_RESULTS_PER_PAGE_DEFAULT,
        )
        parser.add_argument(
            "--mc-batch-size",
            type=int,
            help="Size of batches sent to MC when batch updating orders",
            default=MC_BATCH_SIZE_DEFAULT,
        )

    def handle(self, *args, **options):
        for rp_id in options["revenue_programs"]:
            migrate_rp_mailchimp_integration(rp_id, options["mc_batch_size"], options["mc_page_count"])
        logger.info("Mailchimp migration complete")
