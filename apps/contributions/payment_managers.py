import logging

from django.conf import settings

import reversion
import stripe

from apps.contributions.choices import QuarantineStatus
from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus
from apps.contributions.serializers import (
    StripeOneTimePaymentSerializer,
    StripeRecurringPaymentSerializer,
)
from apps.contributions.stripe_import import StripeTransactionsImporter
from apps.organizations.models import PaymentProvider


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class PaymentProviderError(Exception):
    """A PaymentProviderError generalizes all the errors that might be returned by various payment providers."""


class PaymentManager:
    serializer_class = None
    bad_actor_score = None
    bad_actor_response = None
    validated_data = None
    flagged = None
    contribution = None
    revenue_program = None
    flagged_date = None

    def __init__(self, data=None, contribution=None):
        """PaymentManager class and its subclasses behave much like a ModelSerializer.

        But they operate on multiple local models as well as models held by the payment provider.

        A PaymentManager instantiated with `data` acts as a serializer for that data.
        It is able to validate and process the data, creating new model instances both
        locally and with the payment provider.

        A PaymentManager instantiated with a `Contribution` is like a ModelSerializer receiving an update
        to an existing instance. Here we use this class to perform updates on existing local and payment-provider
        models.
        """
        if contribution and not isinstance(contribution, Contribution):
            raise ValueError("PaymentManager contribution argument expected an instance of Contribution.")
        if contribution and data:
            raise ValueError("PaymentManager must be initialized with either data or a contribution, not both.")

        self.contribution = contribution
        self.data = data
        self.serializer_class = self.get_serializer_class(data=data, contribution=contribution)

    def get_serializer_class(self, **kwargs):  # pragma: no cover Abstract method
        raise NotImplementedError("Subclasses of PaymentManager must implement get_serializer_class")


class StripePaymentManager(PaymentManager):
    payment_provider_name = PaymentProvider.STRIPE_LABEL

    def get_serializer_class(self, data=None, contribution=None):
        """Return serializer class based on whether data or contribution instance have interval of one-time, or something else."""
        interval = contribution.interval if contribution else data["interval"]
        if interval == ContributionInterval.ONE_TIME:
            return StripeOneTimePaymentSerializer
        return StripeRecurringPaymentSerializer

    def complete_payment(self, new_quarantine_status: QuarantineStatus, reject: bool = False):
        if self.contribution.interval == ContributionInterval.ONE_TIME:
            self.complete_one_time_payment(new_quarantine_status, reject)
        else:
            self.complete_recurring_payment(new_quarantine_status, reject)

    def _handle_one_time_acceptance(self, pi, update_data) -> dict:
        """Capture the payment intent and update the contribution status to PAID."""
        logger.info("StripePaymentManager.complete_one_time_payment capturing Stripe PI %s", pi.id)
        pi.capture(
            self.contribution.provider_payment_id,
            stripe_account=self.contribution.revenue_program.payment_provider.stripe_account_id,
        )
        update_data["status"] = ContributionStatus.PAID
        return update_data

    def _handle_one_time_rejection(self, payment_intent, update_data) -> dict:
        """Cancel the payment intent and update the contribution status to REJECTED."""
        logger.info(
            "StripePaymentManager.complete_one_time_payment canceling Stripe PI %s for contribution %s",
            payment_intent.id,
            self.contribution.pk,
        )
        payment_intent.cancel(
            self.contribution.provider_payment_id,
            stripe_account=self.contribution.revenue_program.payment_provider.stripe_account_id,
            cancellation_reason="fraudulent",
        )
        update_data["status"] = ContributionStatus.REJECTED
        return update_data

    def complete_one_time_payment(self, new_quarantine_status: QuarantineStatus, reject: bool = False) -> None:
        """Attempt to complete a one-time payment.

        If we're approving and we can't get the payment intent we raise an error.
        If we're approving and we can get the payment intent, we capture the payment intent and update contribution status to paid.
        If we're rejecting, we cancel the payment intent.
        """
        update_data = {"quarantine_status": new_quarantine_status}
        if not self.contribution.provider_payment_id or not (pi := self.contribution.stripe_payment_intent):
            logger.error(
                "`StripePaymentManager.complete_one_time_payment` error retrieving payment intent for contribution"
                " with ID %s and payment intent ID %s",
                self.contribution.id,
                self.contribution.provider_payment_id,
            )
            raise PaymentProviderError("Cannot retrieve payment data")
        try:
            if reject:
                update_data = self._handle_one_time_rejection(pi, update_data)
            else:
                update_data = self._handle_one_time_acceptance(pi, update_data)
        except stripe.error.StripeError as exc:
            message = exc.error.message if exc.error else "Could not complete payment"
            logger.exception("`StripePaymentManager.complete_one_time_payment` raised StripeError")
            raise PaymentProviderError(message) from exc
        else:
            self._handle_contribution_update(
                update_data=update_data, caller="StripePaymentManager.complete_one_time_payment"
            )

    def _handle_subscription_creation(
        self, setup_intent: stripe.SetupIntent, pm: stripe.PaymentMethod, update_data: dict
    ) -> dict:
        """Try to create the subscription and if stripe error, raise a PaymentProviderError. Otherwise, update the contribution."""
        logger.info(
            "StripePaymentManager.complete_recurring_payment creating Stripe subscription for setupintent %s and contribution %s",
            setup_intent.id,
            self.contribution.id,
        )
        try:
            subscription = self.contribution.create_stripe_subscription(
                off_session=True,
                error_if_incomplete=True,
                default_payment_method=setup_intent.payment_method,
                metadata=setup_intent.metadata,
            )
        except stripe.error.StripeError as exc:
            logger.exception(
                "`StripePaymentManager.complete_recurring_payment` raised StripeError for setupintent %s and contribution %s",
                setup_intent.id,
                self.contribution.id,
            )
            raise PaymentProviderError("Cannot create subscription") from exc
        else:
            update_data.update(
                {
                    "status": ContributionStatus.PAID,
                    "provider_subscription_id": subscription.id,
                    "provider_payment_id": subscription.latest_invoice.payment_intent.id,
                }
            )
        return update_data

    def _handle_when_existing_subscription_with_si_pm(
        self, subscription: stripe.Subscription, setup_intent: stripe.SetupIntent, update_data: dict
    ) -> dict:
        """Handle when there's an existing subscription with the same payment method as the setupintent.

        In this case, we don't want to create a new subscription.

        If the subscription is not already associated with a revengine contribution, we update the contribution with the subscription

        If the subscription is already associated with another revengine contribution, we raise an error.
        """
        logger.warning(
            "StripePaymentManager.complete_recurring_payment found existing subscription %s for setupintent %s and contribution %s."
            "Will not create an additional subscription.",
            subscription.id,
            setup_intent.id,
            self.contribution.id,
        )
        self.contribution.refresh_from_db()
        if (
            existing := Contribution.objects.filter(provider_subscription_id=subscription.id).exclude(
                id=self.contribution.id
            )
        ).exists():
            logger.error(
                "StripePaymentManager.complete_recurring_payment found existing subscription %s for setupintent %s and contribution %s,"
                "but another contribution already has this subscription.",
                subscription.id,
                setup_intent.id,
                self.contribution.id,
            )
            raise PaymentProviderError(
                f"Subscription {subscription.id} already exists on contribution{'s' if existing.count() != 1 else ''} "
                f"{existing.values_list('id', flat=True)}"
            )
        update_data["status"] = StripeTransactionsImporter.get_status_for_subscription(subscription.status)
        if not self.contribution.provider_subscription_id:
            update_data.update(
                {
                    "provider_subscription_id": subscription.id,
                    "provider_payment_id": subscription.latest_invoice.payment_intent.id,
                }
            )
        else:
            logger.error("Contribution %s already has a subscription %s", self.contribution.id, subscription.id)
            raise PaymentProviderError("Contribution already has a subscription")

        return update_data

    def _handle_recurring_rejection(self, update_data: dict, payment_method: stripe.PaymentMethod | None) -> dict:
        """Handle when we're rejecting a recurring payment.

        If we're rejecting, we try to detach the payment method and update the contribution status to REJECTED. If detachment fails,
        we still update the status to REJECTED.
        """
        update_data["status"] = ContributionStatus.REJECTED
        if payment_method:
            logger.info(
                "Detaching Stripe PM %s for contribution %s",
                payment_method.id,
                self.contribution.id,
            )
            try:
                payment_method.detach()
            except stripe.error.StripeError:
                logger.exception(
                    "error detaching payment method %s for contribution %s",
                    payment_method.id,
                    self.contribution.id,
                )
        return update_data

    def complete_recurring_payment(self, new_quarantine_status: QuarantineStatus, reject: bool = False) -> None:
        """Attempt to complete a recurring payment.

        If we're rejecting, we try to detach the payment method and update the contribution status to REJECTED. If detachment fails,
        we still update the status to REJECTED.

        If we're accpeting and we can't get the setupintent, we raise an error.

        If we're accepting and there's an existing subscription with the same payment method as the setupintent, and that subscription
        is not associated with any other revengine contribution, we update the contribution with this subsription data and update status.

        If we're accepting and there's an existing subscription with the same payment method as the setupintent, but that subscription
        is already associated with another revengine contribution, we raise an error.

        If we're accepting and it's the happy path, we create a stripe subscription using the payment method from the setup intent,
        save back data and status on the contribution.
        """
        update_data = {"quarantine_status": new_quarantine_status}
        si = self.contribution.stripe_setup_intent
        pm = self.contribution.fetch_stripe_payment_method(self.contribution.provider_payment_method_id)
        if reject:
            update_data = self._handle_recurring_rejection(update_data=update_data, payment_method=pm)
        elif not si:
            logger.error(
                "`StripePaymentManager.complete_recurring_payment` error retrieving setup intent for contribution"
                " with ID %s and setup intent ID %s",
                self.contribution.id,
                self.contribution.provider_setup_intent_id,
            )
            raise PaymentProviderError("Cannot retrieve payment data")
        elif existing := next(
            (
                sub
                for sub in self.contribution.stripe_subscriptions_for_customer
                if sub.payment_method == si.payment_method
            ),
            None,
        ):

            update_data = self._handle_when_existing_subscription_with_si_pm(existing, si, update_data)
        else:
            update_data = self._handle_subscription_creation(si, pm, update_data)
        self._handle_contribution_update(
            update_data=update_data, caller="StripePaymentManager.complete_recurring_payment"
        )

    def _handle_contribution_update(self, update_data: dict, caller=str) -> None:
        """Update the contribution with the data in `update_data` and log the update."""
        if update_data:
            for key, value in update_data.items():
                setattr(self.contribution, key, value)
            with reversion.create_revision():
                reversion.set_comment(f"`{caller}` completed contribution")
                self.contribution.save(update_fields=set(update_data.keys()).union({"modified"}))
                logger.info(
                    "%s updated contribution with id %s",
                    caller,
                    self.contribution.id,
                )
        else:
            logger.warning(
                "%s did not update contribution with id %s",
                caller,
                self.contribution.id,
            )
