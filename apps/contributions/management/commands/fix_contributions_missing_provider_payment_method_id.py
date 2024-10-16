import logging
from collections.abc import Generator
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import Q, QuerySet

import reversion
import stripe
import stripe.error

from apps.contributions.choices import ContributionInterval, ContributionStatus
from apps.contributions.models import Contribution
from apps.contributions.stripe_import import MAX_STRIPE_RESPONSE_LIMIT


SEARCH_API_METADATA_ITEM_LIMIT = 10

# otherwise we get spammed by stripe info logs when running this command
logging.getLogger("stripe").setLevel(logging.ERROR)


class Command(BaseCommand):
    """Find contributions with missing or dummy val for provider_payment_method_id try to update.

    When found, we update both provider_payment_method_id and provider_payment_method_details.
    """

    @property
    def name(self):
        return Path(__file__).name

    def get_relevant_contributions(self) -> QuerySet[Contribution]:
        """Get contributions with missing or dummy value for provider_payment_method_id.

        We require that contribution be one time and have a provider payment ID or be recurring
        and have a provider subscription ID.

        We also require status be in [PAID, REFUNDED, FAILED, CANCELED] and that it have a contributor object.
        """
        return (
            Contribution.objects.filter(
                status__in=[
                    ContributionStatus.PAID,
                    ContributionStatus.REFUNDED,
                    ContributionStatus.FAILED,
                    ContributionStatus.CANCELED,
                ]
            )
            .filter(
                Q(provider_payment_method_id__isnull=True)
                | Q(provider_payment_method_id=settings.DUMMY_PAYMENT_METHOD_ID)
            )
            .filter(
                Q(interval=ContributionInterval.ONE_TIME, provider_payment_id__isnull=False)
                | Q(~Q(interval=ContributionInterval.ONE_TIME), provider_subscription_id__isnull=False)
            )
            .exclude(contributor__isnull=True)
            .exclude_disconnected_stripe_accounts()
        )

    def get_stripe_payment_object_for_contribution(
        self, contribution: Contribution
    ) -> stripe.PaymentIntent | stripe.Subscription:
        """Get stripe payment object for contribution.

        We expand the payment method.
        """
        if contribution.interval == ContributionInterval.ONE_TIME:
            return stripe.PaymentIntent.retrieve(
                contribution.provider_payment_id,
                stripe_account=contribution.stripe_account_id,
                expand=["payment_method"],
            )
        return stripe.Subscription.retrieve(
            contribution.provider_subscription_id,
            stripe_account=contribution.stripe_account_id,
            expand=[
                "default_payment_method",
                "customer.invoice_settings.default_payment_method",
                "latest_invoice.payment_intent.payment_method",
            ],
        )

    def _update_and_save(self, contribution: Contribution, pm: stripe.PaymentMethod) -> Contribution:
        """Update and save contribution."""
        self.stdout.write(
            self.style.HTTP_INFO(f"Updating contribution {contribution.id} with data from payment method {pm.id}")
        )
        contribution.provider_payment_method_id = pm.id
        contribution.provider_payment_method_details = pm
        with reversion.create_revision():
            contribution.save(
                update_fields={"modified", "provider_payment_method_id", "provider_payment_method_details"}
            )
            reversion.set_comment(f"Updated by {self.name} command")
        return contribution

    def get_pm_from_subscription(self, subscription: stripe.Subscription) -> stripe.PaymentMethod | None:
        """Get payment method from subscription."""
        if pm := subscription.get("default_payment_method"):
            return pm
        if (invoice_settings := subscription.get("customer", {}).get("invoice_settings")) and (
            pm := invoice_settings.get("default_payment_method")
        ):
            return pm
        if (invoice := subscription.get("latest_invoice")) and (pi := invoice.get("payment_intent")):
            return pi.get("payment_method")

    def process_contribution_via_retrieve_api(self, contribution: Contribution) -> tuple[Contribution, bool]:
        """Process contribution via stripe retrieve API.

        Attempts to retrieve the stripe payment method data. If successful, saves back to the contribution in revengine.
        """
        self.stdout.write(self.style.HTTP_INFO(f"Processing {contribution.id} via retrieve API"))
        updated = False
        try:
            payment_object = self.get_stripe_payment_object_for_contribution(contribution)
        except stripe.error.StripeError:
            self.stdout.write(self.style.ERROR(f"Failed to retrieve payment object for contribution {contribution.id}"))
        else:
            pm = (
                self.get_pm_from_subscription(payment_object)
                if contribution.interval != ContributionInterval.ONE_TIME
                else payment_object.get("payment_method")
            )
            if pm:
                self._update_and_save(contribution, pm)
                updated = True
                self.stdout.write(self.style.SUCCESS(f"Updated contribution {contribution.id} with new payment data"))
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"Failed to retrieve payment method for contribution {contribution.id} from payment object"
                    )
                )
        return contribution, updated

    def process_contributions_via_retrieve_api(
        self, contributions: QuerySet[Contribution]
    ) -> tuple[QuerySet[Contribution], QuerySet[Contribution]]:
        """Process contributions via stripe retrieve API.

        Each contribution is treated individually, but returns a queryset of updated and not updated contributions.
        """
        updated_ids, not_updated_ids = [], []
        for contribution in contributions.all():
            _con, updated = self.process_contribution_via_retrieve_api(contribution)
            if updated:
                updated_ids.append(_con.id)
            else:
                not_updated_ids.append(_con.id)
        return contributions.filter(id__in=updated_ids), contributions.filter(id__in=not_updated_ids)

    def get_metadata_queries(
        self, contributions: QuerySet[Contribution], chunk_size: int = SEARCH_API_METADATA_ITEM_LIMIT
    ) -> Generator[tuple[str, str]]:
        """Generate tuples of account_id and metadata queries for stripe search API."""
        for acct_id in (
            (qs := contributions.with_stripe_account())
            .values_list("stripe_account", flat=True)
            # required so that we get distinct stripe account IDs
            .order_by("stripe_account")
            .distinct()
        ):
            contributor_ids = (
                qs.filter(stripe_account=acct_id, contributor__isnull=False)
                # required so that we get distinct contributor IDs
                .order_by("contributor__id")
                .values_list("contributor__id", flat=True)
                .distinct()
            )
            for i in range(0, contributor_ids.count(), chunk_size):
                ids = contributor_ids[i : i + chunk_size]
                # it's possible for this to be empty via empty contributor_ids or because of the slice
                if not ids:
                    continue
                yield acct_id, " OR ".join(f'metadata["contributor_id"]:"{cid}"' for cid in ids)

    def search_subscriptions(self, query: str, stripe_account_id: str) -> Generator[stripe.Subscription]:
        """Search stripe subscriptions, including a query string.

        We expand data.latest_invoice.payment_intent.payment_method so we can save back the data without
        additional API calls.
        """
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Searching stripe subscriptions with query: {query} and stripe account ID: {stripe_account_id}"
            )
        )
        return stripe.Subscription.search(
            stripe_account=stripe_account_id,
            expand=[
                "data.default_payment_method",
                "data.customer.invoice_settings.default_payment_method",
                "data.latest_invoice.payment_intent.payment_method",
            ],
            query=query,
            limit=MAX_STRIPE_RESPONSE_LIMIT,
        ).auto_paging_iter()

    def search_payment_intents(self, query: str, stripe_account_id: str) -> Generator[stripe.PaymentIntent]:
        """Search stripe payment intents, including a query string.

        We expand payment_method so we can save back the data without additional API calls.
        """
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Searching stripe payment intents with query: {query} and stripe account ID: {stripe_account_id}"
            )
        )
        return stripe.PaymentIntent.search(
            stripe_account=stripe_account_id,
            expand=["data.payment_method"],
            query=query,
            limit=MAX_STRIPE_RESPONSE_LIMIT,
        ).auto_paging_iter()

    def process_contributions_via_search_api(
        self,
        contributions: QuerySet[Contribution],
        # ie, updated, not_updated
    ) -> tuple[QuerySet[Contribution], QuerySet[Contribution]]:
        self.stdout.write(
            self.style.HTTP_INFO(f"Processing {contributions.count()} contributions without contributor in metadata")
        )
        one_times = contributions.filter(interval=ContributionInterval.ONE_TIME)
        recurrings = contributions.exclude(id__in=one_times.values_list("id", flat=True))
        queries = {
            "one_time": self.get_metadata_queries(one_times),
            "recurring": self.get_metadata_queries(recurrings),
        }
        updated_ids = []
        for q_type in queries:
            for i, _query in enumerate(queries[q_type]):
                acct_id, query = _query
                self.stdout.write(
                    self.style.HTTP_INFO(
                        f"Search {i + 1} for Stripe {'subscriptions' if q_type == 'recurring' else 'payment intents'} "
                        f"with query: {query} and stripe account ID: {acct_id}"
                    )
                )
                method = self.search_subscriptions if q_type == "recurring" else self.search_payment_intents
                stripe_entities = method(query, acct_id)
                for entity in stripe_entities:
                    if pm := (
                        self.get_pm_from_subscription(entity) if q_type == "recurring" else entity.get("payment_method")
                    ):
                        qs = recurrings if q_type == "recurring" else one_times
                        key = "provider_subscription_id" if q_type == "recurring" else "provider_payment_id"
                        try:
                            contribution = qs.get(**{key: entity.id})
                        except Contribution.DoesNotExist:
                            self.stdout.write(
                                self.style.HTTP_INFO(
                                    f"No contribution found for returned {'subscription' if q_type == 'recurring' else 'payment intent'} "
                                    f"{entity.id} with key {key}"
                                )
                            )
                        except Contribution.MultipleObjectsReturned:
                            self.stdout.write(
                                self.style.HTTP_INFO(
                                    f"Multiple contributions found for returned "
                                    f"{'subscription' if q_type == 'recurring' else 'payment intent'} "
                                    f"{entity.id} with key {key} so this will not be updated"
                                )
                            )
                        else:
                            updated_ids.append(self._update_and_save(contribution, pm).id)
        return Contribution.objects.filter(id__in=updated_ids), contributions.exclude(id__in=updated_ids)

    def process_contributions(
        self,
        contributions: QuerySet[Contribution],
        # i.e., updated, not_updated
    ) -> tuple[QuerySet[Contribution], QuerySet[Contribution]]:
        """Attempt to retrieve payment method for each contribution and update revengine contribution with relevant data.

        Specifically, we are trying to update provider_payment_method_id and provider_payment_method_details.

        """
        searchable_contributions = contributions.filter(contribution_metadata__schema_version__in=["1.0", "1.1", "1.4"])
        unsearchable_contributions = contributions.exclude(id__in=searchable_contributions.values_list("id", flat=True))
        updated_via_retrieve_qs, not_updated_via_retrieve_qs = self.process_contributions_via_retrieve_api(
            unsearchable_contributions
        )
        updated_via_search_qs, not_updated_via_search_qs = self.process_contributions_via_search_api(
            contributions=searchable_contributions
        )
        return updated_via_search_qs | updated_via_retrieve_qs, not_updated_via_search_qs | not_updated_via_retrieve_qs

    def handle(self, *args, **options):
        # add flag to secondary retrieve failed search items
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name}`"))

        if not (fixable_contributions := self.get_relevant_contributions()).exists():
            self.stdout.write(self.style.HTTP_INFO("No fixable contributions found. Exiting."))
            return

        self.stdout.write(self.style.HTTP_INFO(f"Found {fixable_contributions.count()} fixable contributions"))

        updated_qs, not_updated_qs = self.process_contributions(contributions=fixable_contributions)
        if updated_qs.exists():
            self.stdout.write(
                self.style.SUCCESS(
                    f"Updated {updated_qs.count()} contributions:  {', '.join(str(x) for x in updated_qs.values_list('id', flat=True))}"
                )
            )
        if not_updated_qs.exists():
            self.stdout.write(
                self.style.WARNING(
                    f"Unable to update {not_updated_qs.count()} contribution IDs: "
                    f"{', '.join(str(x) for x in not_updated_qs.values_list('id', flat=True))}"
                )
            )
