import logging
from pathlib import Path

from django.core.management.base import BaseCommand

import backoff
import reversion
import stripe

from apps.common.utils import get_stripe_accounts_and_their_connection_status
from apps.contributions.models import Contribution
from apps.contributions.stripe_import import STRIPE_API_BACKOFF_ARGS


# otherwise we get spammed by stripe info logs when running this command
logging.getLogger("stripe").setLevel(logging.ERROR)


class Command(BaseCommand):
    """Missing provider payment method details.

    Find contributions that have provider_payment_method_id but no value for provider_payment_method_details attempt to
    backfill that value.
    """

    @property
    def name(self):
        return Path(__file__).name

    @backoff.on_exception(backoff.expo, stripe.error.RateLimitError, **STRIPE_API_BACKOFF_ARGS)
    def fetch_stripe_payment_method(self, contribution) -> stripe.PaymentMethod | None:
        return contribution.fetch_stripe_payment_method(contribution.provider_payment_method_id)

    def backfill_provider_payment_method_details_for_contribution(self, contribution) -> None:
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Attempting to backfill provider_payment_method_details for contribution {contribution.id}"
            )
        )
        if details := self.fetch_stripe_payment_method(contribution):
            self.stdout.write(
                self.style.HTTP_INFO(f"Successfully fetched payment method details for contribution {contribution.id}")
            )
            contribution.provider_payment_method_details = details
            with reversion.create_revision():
                contribution.save(update_fields={"provider_payment_method_details", "modified"})
                reversion.set_comment(f"{self.name} updated contribution")
            self.updated_ids.append(contribution.id)
        else:
            self.stdout.write(
                self.style.WARNING(f"Failed to fetch payment method details for contribution {contribution.id}")
            )
            self.unupdated_ids.append(contribution.id)

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name}`"))
        self.updated_ids = []
        self.unupdated_ids = []
        contributions = Contribution.objects.filter(
            provider_payment_method_id__isnull=False, provider_payment_method_details__isnull=True
        ).with_stripe_account()
        if not contributions.exists():
            self.stdout.write(
                self.style.HTTP_INFO(
                    "No contributions with provider_payment_method_id but no provider_payment_method_details found, exiting"
                )
            )
            return
        accounts = get_stripe_accounts_and_their_connection_status(
            contributions.values_list("stripe_account", flat=True).distinct()
        )
        unretrievable_accounts = [k for k, v in accounts.items() if not v]
        connected_accounts = [k for k, v in accounts.items() if v]
        ineligible_because_of_account = contributions.filter(stripe_account__in=unretrievable_accounts)
        fixable = contributions.filter(stripe_account__in=connected_accounts)
        fixable_count = fixable.count()
        if ineligible_because_of_account.exists():
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"Found {(inelgible_count:=ineligible_because_of_account.count())} contribution{'' if inelgible_count == 1 else 's'}"
                    f" with value for provider_payment_method_id but no value for provider_payment_method_details that cannot be updated"
                    f" because account is disconnected or some other problem retrieving account:"
                    f" {', '.join(str(x) for x in ineligible_because_of_account.values_list('id', flat=True))}"
                )
            )

        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {fixable_count} eligible contribution{'' if fixable_count == 1 else 's'} to sync"
            )
        )
        if fixable_count:
            for x in fixable.all():
                self.backfill_provider_payment_method_details_for_contribution(x)

        self.stdout.write(
            self.style.HTTP_INFO(
                f"Updated {(updated_count:=len(self.updated_ids))} contribution{'' if updated_count == 1 else 's'}"
                f" out of {fixable_count} eligible contributions."
            )
        )
        if self.updated_ids:
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"Successfully updated {(updated_count:=len(self.updated_ids))} contribution{'' if updated_count == 1 else 's'}: "
                    f"{', '.join(str(x) for x in self.updated_ids)}"
                )
            )
        if self.unupdated_ids:
            self.stdout.write(
                self.style.WARNING(
                    f"Failed to update {(unupdated_count:=len(self.unupdated_ids))} contribution{'' if unupdated_count == 1 else 's'}: "
                    f"{', '.join(str(x) for x in self.unupdated_ids)}"
                )
            )
        self.stdout.write(self.style.SUCCESS(f"`{self.name}` is done"))
