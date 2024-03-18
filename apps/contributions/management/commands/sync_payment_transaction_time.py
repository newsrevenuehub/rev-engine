import datetime
import logging
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand

import reversion
import stripe

from apps.contributions.models import Payment


# otherwise we get spammed by stripe info logs when running this command
stripe_logger = logging.getLogger("stripe")
stripe_logger.setLevel(logging.ERROR)


class Command(BaseCommand):
    """Try to populate null values for payment.transaction_time in db."""

    def get_stripe_accounts_and_their_connection_status(self, account_ids: list[str] = None) -> dict[str, bool]:
        self.stdout.write(self.style.HTTP_INFO("Retrieving stripe accounts and their connection status"))
        accounts = {}
        for account_id in account_ids:
            try:
                account = stripe.Account.retrieve(account_id)
                accounts[account_id] = account.charges_enabled
            except stripe.error.StripeError as e:
                self.stdout.write(self.style.ERROR(f"Error while retrieving account {account_id}: {e}"))
                accounts[account_id] = False
        return accounts

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Running `sync_payment_transaction_time`"))
        if not Payment.objects.filter(transaction_time__isnull=True).exists():
            self.stdout.write(self.style.HTTP_INFO("No payments with missing transaction time found, exiting"))
            return
        eligible_payments = Payment.objects.filter(
            contribution__donation_page__isnull=False,
            transaction_time__isnull=True,
        )
        account_ids = self.get_stripe_accounts_and_their_connection_status(
            eligible_payments.values_list(
                "contribution__donation_page__revenue_program__payment_provider__stripe_account_id", flat=True
            )
        )
        accounts = self.get_stripe_accounts_and_their_connection_status(account_ids)
        disconnected_accounts = [k for k, v in accounts.items() if not v]
        connected_accounts = [k for k, v in accounts.items() if v]
        eligible_payments = eligible_payments.filter(
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id__in=connected_accounts
        )
        eligible_payments_count = eligible_payments.count()
        ineligible_because_of_account = Payment.objects.filter(
            contribution__donation_page__revenue_program__payment_provider__stripe_account_id__in=disconnected_accounts,
            transaction_time__isnull=True,
        )
        ineligible_because_no_donation_page = Payment.objects.filter(
            contribution__donation_page__isnull=True, transaction_time__isnull=True
        )
        self.stdout.write(self.style.HTTP_INFO(f"Found {eligible_payments_count} eligible payments to sync"))
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {ineligible_because_of_account.count()} payment(s) with null value for transaction time that cannot be updated "
                f"because account is disconnected:{', '.join(str(x) for x in ineligible_because_of_account.values_list('id', flat=True))}"
            )
        )
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {ineligible_because_no_donation_page.count()} payment(s) with null value for transaction time that cannot be updated "
                f"because their contribution is not linked to a donation page: "
                f"{', '.join(str(x) for x in ineligible_because_no_donation_page.values_list('id', flat=True))}"
            )
        )
        updated_ids = []
        for payment in eligible_payments.all():
            try:
                bt = stripe.BalanceTransaction.retrieve(
                    payment.stripe_balance_transaction_id, stripe_account=payment.stripe_account_id
                )
            except stripe.error.StripeError as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Error while retrieving balance transaction {payment.stripe_balance_transaction_id} for "
                        f"payment {payment.id} and stripe account {payment.stripe_account_id}: {e}"
                    )
                )
                continue
            payment.transaction_time = datetime.datetime.fromtimestamp(bt.created, tz=ZoneInfo("UTC"))
            with reversion.create_revision():
                payment.save(update_fields={"modified", "transaction_time"})
                reversion.set_comment("Updated by sync_payment_transaction_time command")
            updated_ids.append(payment.id)
        self.stdout.write(
            self.style.SUCCESS(
                f"Updated {len(updated_ids)} payment(s) out of {eligible_payments_count} eligible payments. The following payments were updated: {', '.join(map(str, updated_ids))}"
            )
        )
        self.stdout.write(self.style.SUCCESS("`sync_payment_transaction_time` is done"))
