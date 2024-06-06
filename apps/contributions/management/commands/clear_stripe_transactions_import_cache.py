from django.core.management.base import BaseCommand

from apps.contributions.stripe_import import StripeTransactionsImporter


class Command(BaseCommand):
    """Allows user to delete all entries from cache related to Stripe transactions import."""

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Running `clear_stripe_transactions_import_cache`"))
        StripeTransactionsImporter.clear_all_stripe_transactions_cache()
        self.stdout.write(self.style.SUCCESS("`clear_stripe_transactions_import_cache` is done"))
