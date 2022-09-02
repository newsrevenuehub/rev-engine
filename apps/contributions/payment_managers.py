import logging

from django.conf import settings

import stripe

from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus
from apps.contributions.serializers import (
    StripeOneTimePaymentSerializer,
    StripeRecurringPaymentSerializer,
)


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class PaymentProviderError(Exception):
    """
    A PaymentProviderError generalizes all the errors that might be returned by various payment providers.
    """

    pass


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
        """
        The PaymentManager class and its subclasses behave much like a ModelSerializer,
        but they operate on multiple local models as well as models held by the payment provider.

        A PaymentManager instantiated with `data` acts as a serializer for that data.
        It is able to validate and process the data, creating new model instances both
        locally and with the payment provider.

        A PaymentManager instantiated with a `Contribution` is like a ModelSerilizer receiving an update
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

    def get_serializer_class(self, **kwargs):  # pragma: no cover
        raise NotImplementedError("Subclasses of PaymentManager must implement get_serializer_class")

    def ensure_contribution(self):
        if not self.contribution:
            raise ValueError("Method requires PaymentManager to be instantiated with contribution instance")

    @staticmethod
    def get_subclass(contribution):
        payment_provider_used = contribution.payment_provider_used
        if payment_provider_used == "Stripe":
            return StripePaymentManager


class StripePaymentManager(PaymentManager):
    payment_provider_name = "Stripe"

    def get_serializer_class(self, data=None, contribution=None):
        """
        Get serializer class based on whether data or contribution instance have interval of one-time,
        or something else.
        """
        interval = contribution.interval if contribution else data["interval"]
        if interval == ContributionInterval.ONE_TIME:
            return StripeOneTimePaymentSerializer
        return StripeRecurringPaymentSerializer

    def attach_payment_method_to_customer(self, stripe_customer_id, org_strip_account, payment_method_id=None):
        try:
            stripe.PaymentMethod.attach(
                payment_method_id if payment_method_id else self.validated_data["payment_method_id"],
                customer=stripe_customer_id,
                stripe_account=org_strip_account,
            )
        except stripe.error.StripeError as stripe_error:
            logger.exception("stripe.PaymentMethod.attach returned a StripeError")
            self._handle_stripe_error(stripe_error)

    def cancel_recurring_payment(self):
        self.ensure_contribution()
        revenue_program = self.contribution.revenue_program
        try:
            stripe.Subscription.delete(
                self.contribution.provider_subscription_id,
                stripe_account=revenue_program.payment_provider.stripe_account_id,
            )
        except stripe.error.StripeError as stripe_error:
            logger.exception("stripe.Subscription.modify returned a StripeError")
            self._handle_stripe_error(stripe_error)

    def update_payment_method(self, payment_method_id):
        self.ensure_contribution()

        customer_id = self.contribution.provider_customer_id
        revenue_program = self.contribution.revenue_program
        self.attach_payment_method_to_customer(
            customer_id, revenue_program.payment_provider.stripe_account_id, payment_method_id
        )
        try:
            stripe.Subscription.modify(
                self.contribution.provider_subscription_id,
                default_payment_method=payment_method_id,
                stripe_account=revenue_program.payment_provider.stripe_account_id,
            )
        except stripe.error.StripeError as stripe_error:
            logger.exception("stripe.Subscription.modify returned a StripeError")
            self._handle_stripe_error(stripe_error)

    def complete_payment(self, reject=False):
        if self.contribution.interval == ContributionInterval.ONE_TIME:
            self.complete_one_time_payment(reject)
        elif self.contribution.interval:
            self.complete_recurring_payment(reject)

    def complete_one_time_payment(self, reject=False):
        revenue_program = self.contribution.revenue_program
        previous_status = self.contribution.status
        self.contribution.status = ContributionStatus.PROCESSING
        self.contribution.save()

        try:
            if reject:
                stripe.PaymentIntent.cancel(
                    self.contribution.provider_payment_id,
                    stripe_account=revenue_program.payment_provider.stripe_account_id,
                    cancellation_reason="fraudulent",
                )
            else:
                stripe.PaymentIntent.capture(
                    self.contribution.provider_payment_id,
                    stripe_account=revenue_program.payment_provider.stripe_account_id,
                )

        except stripe.error.InvalidRequestError as invalid_request_error:
            self.contribution.status = previous_status
            self.contribution.save()
            logger.info("Contribution error for id (%s}", self.contribution.pk, exc_info=invalid_request_error)
            raise PaymentProviderError(invalid_request_error)
        except stripe.error.StripeError as stripe_error:
            self._handle_stripe_error(stripe_error, previous_status=previous_status)

    def complete_recurring_payment(self, reject=False):
        if reject:
            """
            If flagged, creation of the Stripe Subscription is deferred until it is "accepted".
            So to "reject", just don't create it. Set status of Contribution to "rejected"
            """
            self.contribution.status = ContributionStatus.REJECTED
            self.contribution.save()
            return

        revenue_program = self.contribution.revenue_program
        previous_status = self.contribution.status
        self.contribution.status = ContributionStatus.PROCESSING
        self.contribution.save()
        try:
            price_data = {
                "unit_amount": self.contribution.amount,
                "currency": self.contribution.currency,
                "product": revenue_program.payment_provider.stripe_product_id,
                "recurring": {
                    "interval": self.contribution.interval,
                },
            }
            subscription = stripe.Subscription.create(
                customer=self.contribution.provider_customer_id,
                default_payment_method=self.contribution.provider_payment_method_id,
                items=[{"price_data": price_data}],
                stripe_account=revenue_program.payment_provider.stripe_account_id,
                metadata=self.contribution.contribution_metadata,
            )
        except stripe.error.StripeError as stripe_error:
            self._handle_stripe_error(stripe_error, previous_status=previous_status)

        self.contribution.payment_provider_data = subscription
        self.contribution.provider_subscription_id = subscription.id
        self.contribution.save()
        return subscription

    def _handle_stripe_error(self, stripe_error, previous_status=None):
        if previous_status:
            self.contribution.status = previous_status
            self.contribution.save()
        message = stripe_error.error.message if stripe_error.error else "Could not complete payment"
        raise PaymentProviderError(message)
