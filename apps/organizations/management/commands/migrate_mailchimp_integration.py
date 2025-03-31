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

    Note that a returned line item will have additional fields. This is for
    line items used when updating an order.
    """

    id: str
    product_id: str
    product_variant_id: str


class PartialMailchimpRecurringOrder(TypedDict):
    """Type definition for Mailchimp order for a recurring contribution.

    We use this when updating orders. Note that actual orders have more fields.
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
            - via mailchimp_integration_ready:
                - has an MC server prefix
                - has an MC access token
                - has an MC list ID
                - has an MC store
            - has a Stripe account ID
        """
        if not self.rp.mailchimp_integration_ready:
            logger.warning("Revenue program with ID %s does not have Mailchimp integration connected", self.rp_id)
            raise Dev5586MailchimpMigrationerror(
                f"Revenue program with ID {self.rp_id} does not have Mailchimp integration connected"
            )
        if not self.rp.stripe_account_id:
            logger.warning("Revenue program with ID %s does not have a Stripe account ID", self.rp_id)
            raise Dev5586MailchimpMigrationerror(
                f"Revenue program with ID {self.rp_id} does not have a Stripe account ID"
            )

    def get_stripe_data(self) -> None:
        """Retrieve all invoices and subscriptions from Stripe for the revenue program.

        We need this data when updating a Mailchimp order. We can tell if an order is for a recurring contribution
        because its id will begin with `in_` referencing a Stripe invoice, but from that alone we can't deduce
        the subscription interval (monthly or yearly). We need to retrieve the associated subscription to get the plan details,
        and the easiest way to do this is by reusing Stripe transaction import code. We retrieve all invoices,
        then all subscriptions, and then we can look up an order by invoice, find its subscription ID, and then
        retrieve the plan details from the subscription to determine if it's monthly or yearly.
        """
        logger.info("Retrieving all invoices from Stripe for revenue program with ID %s", self.rp_id)
        try:
            self.stripe_importer.list_and_cache_stripe_resources_for_recurring_contributions()
        except stripe.error.StripeError as e:
            logger.warning("Failed to retrieve invoices from Stripe for revenue program with ID %s: %s", self.rp_id, e)
            raise Dev5586MailchimpMigrationerror(
                f"Failed to retrieve invoices from Stripe for revenue program with ID {self.rp_id}"
            ) from e

    def get_subscription_interval_for_order(self, order_id: str) -> Literal["month", "year"] | None:
        """Get the subscription interval for an order.

        We will have a Mailchimp order ID which is also a Stripe invoice ID (starts with `in_`). When
        this function runs, we expect to have imported Stripe invoice and subscription data for the RP.
        We try to find the invoice in our data cache, look to its subscription ID, and then retrieve that
        from cache. In success case, we report back the subscription interval. Otehrwise, we log warning
        and return None.
        """
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

    def get_update_order_batch_op(
        self, interval: Literal["month", "year"], order: PartialMailchimpRecurringOrder
    ) -> BatchOperation | None:
        """Get a batch operation to update an order line item to the new product type."""
        if (count := len(order["lines"])) != 1:
            logger.warning("Order has %s line item%s, cannot update", count, "" if count == 1 else "s")
            return None
        line = order["lines"][0]
        new_id = (
            MailchimpProductType.MONTHLY.as_mailchimp_product_id(self.rp_id)
            if interval == "month"
            else MailchimpProductType.YEARLY.as_mailchimp_product_id(self.rp_id)
        )
        if line["product_id"] == new_id and line["product_variant_id"] == new_id:
            logger.info("Order already has correct product type, no update needed")
            return None
        return BatchOperation(
            method="PATCH",
            path=f"/ecommerce/stores/{self.mc_store.id}/orders/{order['id']}/lines/{line['id']}",
            body=json.dumps({"product_id": new_id, "product_variant_id": new_id}),
        )

    def ensure_mailchimp_monthly_and_yearly_products(self) -> None:
        """Ensure that the RP's MC account has new product types for monthly and yearly contributions."""
        target_products = [MailchimpProductType.MONTHLY, MailchimpProductType.YEARLY]
        to_create = [x for x in target_products if not getattr(self.rp, x.as_rp_field())]
        if not to_create:
            logger.info("Revenue program with ID %s already has monthly and yearly Mailchimp product types", self.rp_id)
            return
        for product_type in to_create:
            logger.info("Creating Mailchimp product type %s for revenue program ID %s", product_type, self.rp_id)
            self.rp.ensure_mailchimp_contribution_product(product_type)
            # MC-product-related properties on RevenueProgram are cached within a session, and since we reference above before
            # creating when will be None, we need to clear cached value so downstream code will not get None.
            field = product_type.as_rp_field()
            self.rp.__dict__.pop(field, None)
            if not getattr(self.rp, field):
                logger.warning(
                    "Failed to create Mailchimp product type %s for revenue program ID %s", product_type, self.rp_id
                )
                raise Dev5586MailchimpMigrationerror(
                    f"Failed to create Mailchimp product type {product_type} for revenue program ID {self.rp_id}"
                )

    def ensure_monthly_and_yearly_mailchimp_segments(self) -> None:
        """Ensure that the RP's MC account has new segments for monthly and yearly contributors."""
        # NB: Keep in mind that rp.mailchimp_<interval>_contribution_product is a cached property so if it's been referenced
        # when its value is None, and then product created, unless cache is cleared, value will continue to be None within session.
        # In practice, this function gets called after `ensure_mailchimp_monthly_and_yearly_products` which takes care of clearing
        # cache after creating products.
        if not (self.rp.mailchimp_monthly_contribution_product and self.rp.mailchimp_yearly_contribution_product):
            logger.warning(
                "Revenue program with ID %s does not have monthly and yearly Mailchimp product types", self.rp_id
            )
            raise Dev5586MailchimpMigrationerror(
                f"Revenue program with ID {self.rp_id} does not have monthly and yearly Mailchimp product types"
            )
        target_segments = [MailchimpSegmentName.MONTHLY_CONTRIBUTORS, MailchimpSegmentName.YEARLY_CONTRIBUTORS]
        # we take the absence of the segment ID field on the RP as evidence that it needs to be created
        to_create = [x for x in target_segments if not getattr(self.rp, x.as_rp_id_field())]
        if not to_create:
            logger.info("Revenue program with ID %s already has monthly and yearly Mailchimp segments", self.rp_id)
            return
        for segment in to_create:
            logger.info("Creating Mailchimp segment %s for revenue program ID %s", segment, self.rp_id)
            self.rp.ensure_mailchimp_contributor_segment(segment)

    def ensure_mailchimp_recurring_segment_criteria(self) -> None:
        """Ensure that the membership criteria for the recurring contributors segment is up to date.

        Specifically, the new criterion for being a member of this segment is that a customer purchased either
        the monthly or yearly product, whereas in the past, we checked for purchase of the recurring product.
        """
        if not (segment := self.rp.mailchimp_recurring_contributors_segment):
            logger.warning("Revenue program with ID %s does not have recurring contributors segment", self.rp_id)
            raise Dev5586MailchimpMigrationerror(
                f"Revenue program with ID {self.rp_id} does not have recurring contributors segment"
            )
        new_options = MailchimpSegmentName.RECURRING_CONTRIBUTORS.get_segment_options()
        # we don't assume that conditions list order will be guaranteed, hence why we compare sets rather than
        # directly comparing segment.options to new_options.
        old_conditions = {(k, v) for condition in segment.options.get("conditions", []) for k, v in condition.items()}
        new_conditions = {(k, v) for condition in new_options["conditions"] for k, v in condition.items()}
        if all(
            [
                segment.options["match"] == new_options["match"],
                old_conditions == new_conditions,
            ]
        ):
            logger.info(
                "Revenue program with ID %s already has updated membership criteria for recurring contributors segment",
                self.rp_id,
            )
            return
        try:
            self.mc_client.lists.update_segment(
                segment.list_id, self.rp.mailchimp_recurring_contributors_segment_id, {"options": new_options}
            )
        except ApiClientError as e:
            logger.warning(
                "Failed to update membership criteria for recurring contributors segment for revenue program ID %s: %s",
                self.rp_id,
                e.text,
            )
            raise Dev5586MailchimpMigrationerror(
                f"Failed to update membership criteria for recurring contributors "
                f"segment for revenue program ID {self.rp_id}"
            ) from e
        else:
            logger.info(
                "Updated membership criteria for recurring contributors segment for revenue program ID %s", self.rp_id
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
                # we only store a subset of order fields from each order so that we reduce memory footprint
                # when dealing with 10s of thousands of orders (worst case is expected to be ~50k orders for a large RP)
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
        """Get all orders that are eligible for updating.

        For an order to be eligible for updating, it must:
        - be for a recurring contribution, identified by its ID starting with `in_`
        - have exactly one line item. NRH-produced orders are expected to have a single line item and our downstream
          code is equipped to only deal with a single item
        - the line item's product ID must match the Mailchimp recurring product ID for the revenue program (which is the product
          being replaced by either yearly or monthly products)
        """
        return [
            x
            for x in self._get_all_orders()
            if x["id"].startswith("in_")
            and len(x["lines"]) == 1
            and x["lines"][0]["product_id"] == MailchimpProductType.RECURRING.as_mailchimp_product_id(self.rp_id)
        ]

    def get_update_mailchimp_order_line_item_batches(self) -> list[BatchOperation]:
        """Get a list of batch operations to update order line items in Mailchimp.

        Note that if we encount an order for which we cannot find a subscription interval, we log a warning
        and continue on to the next order.
        """
        batches = []
        updateable_orders = self._get_updateable_orders()
        logger.info(
            "Found %s order%s to update for revenue program ID %s",
            (count := len(updateable_orders)),
            "" if count == 1 else "s",
            self.rp_id,
        )
        for x in updateable_orders:
            if not (interval := self.get_subscription_interval_for_order(x["id"])):
                logger.warning("Failed to get subscription interval for order with ID %s. Skipping", x["id"])
                continue
            if batch := self.get_update_order_batch_op(interval, x):
                batches.append(batch)

        return batches

    def update_mailchimp_order_line_items_for_rp(self, sleep_time: int = 6) -> None:
        """Update Mailchimp order line items for the revenue program."""
        batches = self.get_update_mailchimp_order_line_item_batches()
        if not batches:
            logger.info("No orders to update for revenue program ID %s", self.rp_id)
        for i in range(0, len(batches), self.mc_batch_size):
            start_time = time.time()
            response = self.mc_client.batches.start({"operations": batches[i : i + self.mc_batch_size]})
            batch_id = response["id"]
            logger.info("Batch %s started with ID: {batch_id}", i + 1)
            # this can take up to 10 minutes to return
            self.monitor_batch_status(batch_id)
            end_time = time.time()
            # if batches remain, and if current pacing would put us on track to exceed 10 requests per minute
            if i < len(batches) - 1 and end_time - start_time < 6:
                logger.info("Waiting 6 seconds before next batch submission...")
                time.sleep(sleep_time)

    def monitor_batch_status(
        self, batch_id, timeout=600, interval=10
    ) -> Literal["finished", "canceled", "timeout", "error"] | None:
        """Monitor the status of a batch operation.

        We poll the Mailchimp API for the status of the batch operation until it is either finished or times out.

        Note that in finish case, MC provides a `response_body_url` which contains a gzipped JSON file
        with more info about the operation. This may be helpful for debugging errors.
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                status = self.mc_client.batches.status(batch_id)
                logger.info(
                    "Batch %s status: %s, completed operations: %s/%s, errored operations: %s",
                    batch_id,
                    status["status"],
                    status["finished_operations"],
                    status["total_operations"],
                    status["errored_operations"],
                )
                if status["status"] == "finished":
                    logger.info(
                        "Batch %s finished with %s successful operations and %s errors. More details available at %s",
                        batch_id,
                        status["finished_operations"],
                        status["errored_operations"],
                        status["response_body_url"],
                    )
                    return "finished"
                if status["status"] == "canceled":
                    logger.warning("Batch %s was canceled", batch_id)
                    return "canceled"
                time.sleep(interval)
            except ApiClientError:
                logger.exception("Error checking status for batch %s", batch_id)
                return "error"
        logger.warning("Monitoring timed out for batch %s", batch_id)
        return "timeout"


def migrate_rp_mailchimp_integration(rp_id: int, mc_batch_size: int, mc_results_per_page: int) -> None:
    """Migrate a revenue program's Mailchimp integration."""
    migrator = MailchimpMigrator(
        rp_id=rp_id,
        mc_batch_size=mc_batch_size,
        mc_results_per_page=mc_results_per_page,
    )

    migrator.get_stripe_data()
    # at this point we have Stripe data in Redis cache. Note that we wont' be able to update orders
    # if we haven't called .get_stripe_data first.
    try:
        migrator.ensure_mailchimp_monthly_and_yearly_products()
        migrator.ensure_monthly_and_yearly_mailchimp_segments()
        migrator.ensure_mailchimp_recurring_segment_criteria()
        migrator.update_mailchimp_order_line_items_for_rp()
        logger.info("Migration for revenue program with ID %s completed successfully", migrator.rp.id)
    except Dev5586MailchimpMigrationerror:
        logger.exception("Migration for revenue program with ID %s failed", migrator.rp.id)
        raise
    # no matter what, we want to clear the cache
    finally:
        migrator.stripe_importer.clear_all_stripe_transactions_cache()


class Command(BaseCommand):
    """Command to migrate RP's using old (pre-DEV-5584) Mailchimp products and segments to new ones."""

    def add_arguments(self, parser: CommandParser):
        parser.add_argument(
            "revenue_programs",
            type=lambda s: [x.strip() for x in s.split(",")],
            help="Comma-separated list of revenue program ids to migrate. Example: 1,2,3",
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
            migrate_rp_mailchimp_integration(int(rp_id), options["mc_batch_size"], options["mc_page_count"])
        logger.info("Mailchimp migration complete")
