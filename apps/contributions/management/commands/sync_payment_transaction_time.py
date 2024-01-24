import datetime

from django.core.management.base import BaseCommand

import stripe

from apps.contributions.models import Payment


class Command(BaseCommand):
    """Try to populate null values for payment.transaction_time in db."""

    # TODO: [DEV-4403] Make sync_payment_transaction_time command resilient vs. Stripe API errors (esp. no longer-connected accounts)
    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Running `sync_payment_transaction_time`"))
        queryset = Payment.objects.filter(transaction_time__isnull=True)
        self.stdout.write(self.style.HTTP_INFO(f"Found {queryset.count()} payments to sync"))
        for payment in queryset.all():
            bt = stripe.BalanceTransaction.retrieve(
                payment.stripe_balance_transaction_id, stripe_account=payment.contribution.stripe_account_id
            )
            payment.transaction_time = datetime.datetime.fromtimestamp(bt.created)
            payment.save(update_fields={"modified", "transaction_time"})
        self.stdout.write(self.style.SUCCESS("`sync_payment_transaction_time` is done"))
