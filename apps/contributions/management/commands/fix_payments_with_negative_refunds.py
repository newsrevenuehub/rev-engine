from django.core.management.base import BaseCommand

import reversion

from apps.contributions.models import Payment


class Command(BaseCommand):
    """Fix payments that have negative amount_refunded values."""

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Running `fix_payments_with_negative_refunds`"))
        payments_with_negative_amount_refunded = Payment.objects.filter(amount_refunded__lt=0)
        if not payments_with_negative_amount_refunded.exists():
            self.stdout.write(self.style.HTTP_INFO("No payments with negative refund amounts found, exiting"))
            return
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Found {(count:=payments_with_negative_amount_refunded.count())} eligible payment{'' if count == 1 else 's'} to fix"
            )
        )
        updated_ids = []
        for payment in payments_with_negative_amount_refunded.all():
            payment.amount_refunded = -payment.amount_refunded
            with reversion.create_revision():
                payment.save(update_fields={"modified", "amount_refunded"})
                reversion.set_comment("Updated by fix_payments_with_negative_refunds command")
            updated_ids.append(payment.id)
        self.stdout.write(
            self.style.SUCCESS(
                f"Updated `amount_refunded` on {len(updated_ids)} payment(s) out of {count} eligible payments. "
                f"The following payments were updated: {', '.join(map(str, updated_ids))}"
            )
        )
        self.stdout.write(self.style.SUCCESS("`fix_payments_with_negative_refunds` is done"))
