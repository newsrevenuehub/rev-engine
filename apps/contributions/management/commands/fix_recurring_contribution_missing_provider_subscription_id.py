from pathlib import Path

from django.core.management.base import BaseCommand

import reversion
import stripe

from apps.contributions.models import Contribution


class Command(BaseCommand):
    @property
    def name(self):
        return Path(__file__).name

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(f"Running {self.name}"))
        contributions = Contribution.objects.recurring().filter(provider_subscription_id=None)
        if not contributions.exists():
            self.stdout.write(
                self.style.HTTP_INFO("No recurring contributions with missing provider subscription ID found")
            )
            return
        self.stdout.write(
            self.style.HTTP_INFO(f"{len(contributions)} recurring contributions are missing provider subscription IDs")
        )
        fixed = 0
        for contribution in contributions:
            # The general approach here is to find the subscription ID by walking through the Stripe data:
            # payment intent -> invoice -> subscription

            self.stdout.write(self.style.HTTP_INFO(f"Investigating contribution ID {contribution.id}"))
            if not contribution.stripe_account_id:
                self.stdout.write(self.style.WARNING("Contribution has no Stripe account ID, skipping"))
                continue
            if not contribution.provider_payment_id:
                self.stdout.write(self.style.WARNING("Contribution has no provider payment intent ID, skipping"))
                continue
            try:
                intent = stripe.PaymentIntent.retrieve(
                    contribution.provider_payment_id, stripe_account=contribution.stripe_account_id, expand=["invoice"]
                )
            except stripe.error.InvalidRequestError:
                account_id = contribution.stripe_account_id
                self.stdout.write(
                    self.style.ERROR(
                        f"Couldn't retrieve payment intent {contribution.provider_payment_id} for account {account_id}, skipping"
                    )
                )
                continue
            if not getattr(intent, "invoice", None):
                self.stdout.write(self.style.WARNING("Payment intent has no invoice, skipping"))
                continue
            # Right now we don't enforce uniqueness for contribution subscription IDs, so a manual check
            # is needed here. Can be removed once DEV-4882 is done.
            if not getattr(intent.invoice, "subscription", None):
                self.stdout.write(self.style.WARNING("Invoice has no subscription ID, skipping"))
                continue
            if Contribution.objects.filter(provider_subscription_id=intent.invoice.subscription).exists():
                self.stdout.write(
                    self.style.ERROR(
                        f"Invoice has subscription ID {intent.invoice.subscription} but another contribution already is linked to it"
                    )
                )
                continue
            with reversion.create_revision():
                contribution.provider_subscription_id = intent.invoice.subscription
                contribution.save(update_fields={"modified", "provider_subscription_id"})
                reversion.set_comment("Updated by fix_recurring_contribution_missing_provider_subscription_id command")
            self.stdout.write(
                self.style.SUCCESS(
                    f"Set subscription ID {contribution.provider_subscription_id} on contribution {contribution.id}"
                )
            )
            fixed += 1
        self.stdout.write(
            self.style.HTTP_INFO(f"{self.name} finished: {fixed} of {len(contributions)} contributions fixed")
        )
