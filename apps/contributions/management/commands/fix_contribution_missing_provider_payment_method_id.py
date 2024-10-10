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

        We also require status be in [PAID, REFUNDED, FAILED, CANCELED].
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
            .filter(provider_payment_method_id__in=[None, settings.DUMMY_PAYMENT_METHOD_ID])
            .filter(
                Q(interval=ContributionInterval.ONE_TIME, provider_payment_method_id__isnull=False)
                | Q(~Q(interval=ContributionInterval.ONE_TIME), provider_subscription_id__isnull=False)
            )
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
                contribution.provider_payment_method_id,
                stripe_account=contribution.stripe_account_id,
                expand=["payment_method"],
            )
        return stripe.Subscription.retrieve(
            contribution.provider_subscription_id,
            stripe_account=contribution.stripe_account_id,
            expand=["latest_invoice.payment_intent.payment_method"],
        )

    def _update_and_save(self, contribution: Contribution, pm: stripe.PaymentMethod) -> Contribution:
        """Update and save contribution."""
        contribution.provider_payment_method_id = pm.id
        contribution.provider_payment_method_details = pm
        with reversion.create_revision():
            contribution.save(
                update_fields={"modified", "provider_payment_method_id", "provider_payment_method_details"}
            )
            reversion.set_comment(f"Updated by {self.name} command")
        return contribution

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
            if pm := payment_object.get("payment_method"):
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
        for contribution in contributions:
            _con, updated = self.process_contribution_via_retrieve_api(contribution)
            if updated:
                updated_ids.append(_con.id)
            else:
                not_updated_ids.append(_con.id)
        return contributions.filter(id__in=updated_ids), contributions.filter(id__in=not_updated_ids)

    def chunk_search_api_queries(
        self, contributions: QuerySet[Contribution], chunk_size: int = 100
    ) -> Generator[QuerySet[Contribution]]:
        """Chunk contributions by stripe account ID and yield queryset chunks.

        Each chunk will have self-same stripe account ID.
        """
        rp_ids = set(
            contributions.order_by("donation_page__revenue_program__payment_provider__stripe_account_id")
            .values_list("donation_page__revenue_program__payment_provider__stripe_account_id", flat=True)
            .distinct()
        ) + set(
            contributions.order_by("_revenue_program__payment_provider__stripe_account_id")
            .values_list("_revenue_program__payment_provider__stripe_account_id", flat=True)
            .distinct()
        )
        for rp_id in rp_ids:
            rp_contributions = contributions.filter(
                Q(donation_page__revenue_program_id=rp_id) | Q(_revenue_program_id=rp_id)
            )
            for i in range(0, rp_contributions.count(), chunk_size):
                yield contributions[i : i + chunk_size].filter(
                    Q(donation_page__revenue_program__payment_provider__stripe_account_id=rp_id)
                    | Q(_revenue_program__payment_provider__stripe_account_id=rp_id)
                )

    def process_contributions_via_search_api(
        self,
        contributions: QuerySet[Contribution],
        # ie, updated, not_updated
    ) -> tuple[QuerySet[Contribution], QuerySet[Contribution]]:
        self.stdout.write(
            self.style.HTTP_INFO(f"Processing {contributions.count()} contributions without contributor in metadata")
        )
        # can or connect these:
        # stripe subscriptions search --query="metadata['contributor_id']:'101'" --stripe-account acct_1JhIObPmggpEz0oe
        for i, chunk in enumerate(self.chunk_search_api_queries(contributions)):
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"Processing batch {i + 1}, conisisting of {chunk.count()} "
                    f"contributions for RP {chunk.first().donation_page.revenue_program_id}"
                )
            )
            # get via search api
            updated_qs, not_updated_qs = contributions.none(), contributions.none()
        return updated_qs, not_updated_qs

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
        updated_via_search_qs, not_updated_via_search_qs = self.process_contributions_via_search_api(
            contributions=unsearchable_contributions
        )
        updated_via_retrieve_qs, not_updated_via_retrieve_qs = self.process_contribution_via_retrieve_api(
            contribution=searchable_contributions
        )
        return updated_via_search_qs | updated_via_retrieve_qs, not_updated_via_search_qs | not_updated_via_retrieve_qs

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name}`"))
        if not (relevant_contributions := self.get_relevant_contributions()).exists():
            self.stdout.write(
                self.style.HTTP_INFO(
                    "No relevant contributions found with missing or dummy value for provider_payment_method_id"
                )
            )
            return

        if not (fixable_contributions := relevant_contributions.exclude_disconnected_stripe_accounts()).exists():
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"{relevant_contributions.count()} relevant contributions were found, but none had connected Stripe accounts"
                )
            )
            return
        updated_qs, not_updated_qs = self.process_contributions(contributions=fixable_contributions)
        if updated_qs.exists():
            self.stdout.write(
                self.style.SUCCESS(
                    f"Updated contribution IDs: {', '.join(str(x) for x in updated_qs.values_list('id', flat=True))}"
                )
            )
        if not_updated_qs.exists():
            self.stdout.write(
                self.style.WARNING(
                    f"Failed to update {not_updated_qs.count()}contribution IDs: "
                    f"{', '.join(str(x) for x in not_updated_qs.values_list('id', flat=True))}"
                )
            )
