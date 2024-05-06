import logging

from django.core.management.base import BaseCommand
from django.db.models import Q

import reversion
import stripe

from apps.common.utils import get_stripe_accounts_and_their_connection_status
from apps.contributions.models import Contribution


# otherwise we get spammed by stripe info logs when running this command
stripe_logger = logging.getLogger("stripe")
stripe_logger.setLevel(logging.ERROR)


class Command(BaseCommand):
    """Find recurring contributions with a `None` value for `provider_payment_id` and try to derive correct value and save it"""

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Running `fix_recurring_contribution_missing_provider_payment_id`"))
        contributions = Contribution.objects.recurring().filter(
            provider_payment_id=None, provider_subscription_id__isnull=False
        )
        if not contributions.exists():
            self.stdout.write(
                self.style.HTTP_INFO("No recurring contributions with missing provider payment ID found, exiting")
            )
            return
        account_ids = set(
            list(
                contributions.filter(donation_page__revenue_program__payment_provider__stripe_account_id__isnull=False)
                .values_list("donation_page__revenue_program__payment_provider__stripe_account_id", flat=True)
                .distinct()
            )
            + list(
                contributions.filter(_revenue_program__payment_provider__stripe_account_id__isnull=False)
                .values_list("_revenue_program__payment_provider__stripe_account_id", flat=True)
                .distinct()
            )
        )
        accounts = get_stripe_accounts_and_their_connection_status(account_ids)
        unretrievable_accounts = [k for k, v in accounts.items() if not v]
        connected_accounts = [k for k, v in accounts.items() if v]

        fixable_contributions = contributions.filter(
            Q(donation_page__revenue_program__payment_provider__stripe_account_id__in=connected_accounts)
            | Q(_revenue_program__payment_provider__stripe_account_id__in=connected_accounts)
        )
        fixable_contributions_count = fixable_contributions.count()
        ineligible_because_of_account = contributions.filter(
            Q(donation_page__revenue_program__payment_provider__stripe_account_id__in=unretrievable_accounts)
            | Q(_revenue_program__payment_provider__stripe_account_id__in=unretrievable_accounts),
        )
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {fixable_contributions_count} eligible contribution{'' if fixable_contributions_count == 1 else 's'} to fix"
            )
        )
        if ineligible_because_of_account.exists():
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"Found {(_inel_account:=ineligible_because_of_account.count())} contribution{'' if _inel_account == 1 else 's'} with "
                    f"null value for provider_payment_id that cannot be updated because account is disconnected or some other problem "
                    f"retrieving account: {', '.join(str(x) for x in ineligible_because_of_account.values_list('id', flat=True))}"
                )
            )
        updated_ids = []
        for contribution in fixable_contributions.all():
            try:
                subscription = stripe.Subscription.retrieve(
                    (sub_id := contribution.provider_subscription_id),
                    stripe_account=(acct_id := contribution.stripe_account_id),
                    expand=["latest_invoice"],
                )
            except stripe.error.StripeError as e:
                self.stdout.write(
                    self.style.ERROR(f"Error while retrieving subscription {sub_id} for stripe account {acct_id}: {e}")
                )
                continue
            if subscription.latest_invoice and (pi_id := subscription.latest_invoice.payment_intent):
                contribution.provider_payment_id = pi_id
                with reversion.create_revision():
                    contribution.save(update_fields={"modified", "provider_payment_id"})
                    reversion.set_comment("Updated by fix_recurring_contribution_missing_provider_payment_id command")
                updated_ids.append(contribution.id)
        self.stdout.write(
            self.style.SUCCESS(
                f"Updated {len(updated_ids)} contribution(s) out of {fixable_contributions_count} eligible contributions. "
                f"The following contributions were updated: {', '.join(map(str, updated_ids))}"
            )
        )
        self.stdout.write(self.style.SUCCESS("`fix_recurring_contribution_missing_provider_payment_id` is done"))
