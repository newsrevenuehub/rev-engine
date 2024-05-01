import datetime
import logging
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand
from django.db.models import Q

import reversion
import stripe

from apps.contributions.models import Payment


# otherwise we get spammed by stripe info logs when running this command
stripe_logger = logging.getLogger("stripe")
stripe_logger.setLevel(logging.ERROR)


class Command(BaseCommand):
    """Try to populate null values for payment.transaction_time in db."""

    def get_stripe_accounts_and_their_connection_status(self, account_ids: list[str]) -> dict[str, bool]:
        """Given a list of stripe accounts, returns a dict with the account id as key and a boolean indicating if the account is connected and retrievable

        We do this so that we can later exclude payments that we might want to update but can't because the account is not connected to the platform.
        """
        self.stdout.write(self.style.HTTP_INFO("Retrieving stripe accounts and their connection status"))
        accounts = {}
        for account_id in account_ids:
            try:
                stripe.Account.retrieve(account_id)
                accounts[account_id] = True
            # if the account is not connected to the platform, we get a PermissionError
            except stripe.error.PermissionError as e:
                self.stdout.write(
                    self.style.WARNING(
                        f"Permission error while retrieving account {account_id}. This is likely because the account is not connected to the platform: {e}"
                    )
                )
                accounts[account_id] = False
            # In case of an unexpected Stripe error, we stdout as error
            except stripe.error.StripeError as e:
                self.stdout.write(self.style.ERROR(f"Error while retrieving account {account_id}: {e}"))
                accounts[account_id] = False
        return accounts

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Running `sync_payment_transaction_time`"))
        payments_missing_transaction_time = Payment.objects.filter(transaction_time__isnull=True)
        if not payments_missing_transaction_time.exists():
            self.stdout.write(self.style.HTTP_INFO("No payments with missing transaction time found, exiting"))
            return

        accounts = self.get_stripe_accounts_and_their_connection_status(
            payments_missing_transaction_time.values_list(
                "contribution__donation_page__revenue_program__payment_provider__stripe_account_id", flat=True
            ).distinct("contribution__donation_page__revenue_program__payment_provider__stripe_account_id")
        )
        unretrievable_accounts = [k for k, v in accounts.items() if not v]
        connected_accounts = [k for k, v in accounts.items() if v]
        fixable_payments = payments_missing_transaction_time.filter(
            Q(contribution__donation_page__revenue_program__payment_provider__stripe_account_id__in=connected_accounts)
            | Q(contribution___revenue_program__payment_provider__stripe_account_id__in=connected_accounts)
        )
        fixable_payments_count = fixable_payments.count()
        ineligible_because_of_account = payments_missing_transaction_time.filter(
            Q(
                contribution__donation_page__revenue_program__payment_provider__stripe_account_id__in=unretrievable_accounts
            )
            | Q(contribution___revenue_program__payment_provider__stripe_account_id__in=unretrievable_accounts)
        )
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {fixable_payments_count} eligible payment{'' if fixable_payments_count == 1 else 's'} to sync"
            )
        )
        if ineligible_because_of_account.exists():
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"Found {(_inel_account:=ineligible_because_of_account.count())} payment{'' if _inel_account == 1 else 's'} with "
                    f"null value for transaction time that cannot be updated because account is disconnected or some other problem "
                    f"retrieving account: {', '.join(str(x) for x in ineligible_because_of_account.values_list('id', flat=True))}"
                )
            )
        updated_ids = []
        for payment in fixable_payments.all():
            try:
                bt = stripe.BalanceTransaction.retrieve(
                    payment.stripe_balance_transaction_id, stripe_account=payment.contribution.stripe_account_id
                )
            except stripe.error.StripeError as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Error while retrieving balance transaction {payment.stripe_balance_transaction_id} for "
                        f"payment {payment.id} and stripe account {payment.contribution.stripe_account_id}: {e}"
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
                f"Updated {len(updated_ids)} payment(s) out of {fixable_payments_count} eligible payments. "
                f"The following payments were updated: {', '.join(map(str, updated_ids))}"
            )
        )
        self.stdout.write(self.style.SUCCESS("`sync_payment_transaction_time` is done"))
