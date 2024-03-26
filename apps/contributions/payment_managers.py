import logging

from django.conf import settings

import reversion
import stripe

from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus
from apps.contributions.serializers import (
    StripeOneTimePaymentSerializer,
    StripeRecurringPaymentSerializer,
)
from apps.organizations.models import PaymentProvider


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

    def ensure_contribution(self):
        if not self.contribution:
            raise ValueError("Method requires PaymentManager to be instantiated with contribution instance")

    @staticmethod
    def get_subclass(contribution):
        payment_provider_used = contribution.payment_provider_used
        if payment_provider_used == PaymentProvider.STRIPE_LABEL:
            return StripePaymentManager


class StripePaymentManager(PaymentManager):
    payment_provider_name = PaymentProvider.STRIPE_LABEL

    def get_serializer_class(self, data=None, contribution=None):
        """
        Get serializer class based on whether data or contribution instance have interval of one-time,
        or something else.
        """
        interval = contribution.interval if contribution else data["interval"]
        if interval == ContributionInterval.ONE_TIME:
            return StripeOneTimePaymentSerializer
        return StripeRecurringPaymentSerializer

    def attach_payment_method_to_customer(self, stripe_customer_id, org_stripe_account, payment_method_id=None):
        try:
            stripe.PaymentMethod.attach(
                payment_method_id if payment_method_id else self.validated_data["payment_method_id"],
                customer=stripe_customer_id,
                stripe_account=org_stripe_account,
            )
        except (stripe.error.StripeError, stripe.error.InvalidRequestError):
            logger.exception(
                (
                    "`StripePaymentManager.attach_payment_method_to_customer` resulted in a StripeError for stripe_customer_id "
                    "%s org_stripe_account %s payment_method_id %s",
                ),
                stripe_customer_id,
                org_stripe_account,
                payment_method_id,
            )
            raise PaymentProviderError("Something went wrong with Stripe")

    def complete_payment(self, reject=False):
        if self.contribution.interval == ContributionInterval.ONE_TIME:
            self.complete_one_time_payment(reject)
        elif self.contribution.interval:
            self.complete_recurring_payment(reject)

    def complete_one_time_payment(self, reject=False):
        revenue_program = self.contribution.revenue_program
        update_data = {}
        if not (pi := self.contribution.stripe_payment_intent):
            logger.error(
                "`StripePaymentManager.complete_one_time_payment` cannot retrieve a payment intent for contribution with ID %s",
                self.contribution.id,
            )
            raise PaymentProviderError("Cannot retrieve payment data")
        if reject:
            try:
                logger.info(
                    "StripePaymentManager.complete_one_time_payment canceling Stripe PI %s for contribution %s",
                    pi.id,
                    self.contribution.pk,
                )
                pi.cancel(
                    self.contribution.provider_payment_id,
                    stripe_account=revenue_program.payment_provider.stripe_account_id,
                    cancellation_reason="fraudulent",
                )
                # we rely on Stripe webhook for payment_intent.canceled that updates status on contribution
                update_data["status"] = ContributionStatus.REJECTED
            except stripe.error.StripeError:
                logger.exception(
                    "`StripePaymentManager.complete_one_time_payment` canceling Stripe  PI %s for contribution %s",
                    self.contribution.provider_payment_id,
                    self.contribution.pk,
                )
                raise PaymentProviderError("Cannot cancel payment intent")
        else:
            try:
                logger.info("StripePaymentManager.complete_one_time_payment capturing Stripe PI %s", pi.id)
                pi.capture(
                    self.contribution.provider_payment_id,
                    stripe_account=revenue_program.payment_provider.stripe_account_id,
                )
                update_data["status"] = ContributionStatus.PAID
            except stripe.error.StripeError:
                logger.exception(
                    "`StripePaymentManager.complete_one_time_payment` error capturing payment intent for id (%s}",
                    self.contribution.pk,
                )
                raise PaymentProviderError("Something went wrong with Stripe")
        if update_data:
            with reversion.create_revision():
                for key, value in update_data.items():
                    setattr(self.contribution, key, value)
                reversion.set_comment("`StripePaymentManager.complete_one_time_payment` completed contribution")
                self.contribution.save(update_fields=set(update_data.keys()).union({"modified"}))
                logger.info(
                    "StripePaymentManager.complete_one_time_payment updated contribution with id %s",
                    self.contribution.id,
                )

    def complete_recurring_payment(self, reject=False):
        update_data = {}
        si = self.contribution.stripe_setup_intent
        pm = self.contribution.fetch_stripe_payment_method()
        if reject:
            if not pm:
                logger.error(
                    "`StripePaymentManager.complete_recurring_payment` cannot locate a payment method for contribution with ID %s",
                    self.contribution.id,
                )
                raise PaymentProviderError("Cannot retrieve payment data")
            try:
                logger.info(
                    "StripePaymentManager.complete_recurring_payment detaching Stripe PM %s for contribution %s",
                    pm.id,
                    self.contribution.id,
                )
                pm.detach()
                update_data["status"] = ContributionStatus.REJECTED
            except stripe.error.StripeError:
                logger.exception(
                    "`StripePaymentManager.complete_recurring_payment` error detaching payment method for contribution with ID %s",
                    self.contribution.id,
                )
                raise PaymentProviderError("Cannot retrieve payment data")

        else:
            if not si:
                logger.error(
                    "`StripePaymentManager.complete_recurring_payment` error retrieving setup intent for contribution with ID %s and setup intent ID %s",
                    self.contribution.id,
                    self.contribution.provider_setup_intent_id,
                )
                raise PaymentProviderError("Cannot retrieve payment data")
            try:
                logger.info(
                    "StripePaymentManager.complete_recurring_payment creating Stripe subscription for setupintent %s and contribution %s",
                    si.id,
                    self.contribution.id,
                )
                subscription = self.contribution.create_stripe_subscription(
                    off_session=True,
                    error_if_incomplete=True,
                    default_payment_method=si.payment_method,
                    metadata=si.metadata,
                )
                update_data.update(
                    {
                        "status": ContributionStatus.PAID,
                        # we conver to a dict because Stripe returns a dict/object type of data structure that we don't have
                        # an off-the-shelf way of mimicing in our tests at present. We use AttrDict in places to get some of
                        # the behavior, but in some cases, attrdict has different behaviors than needed and falls flat.
                        # In this case, in our tests, we pass mocked subscriptions as AttrDicts, but for some reason save fails
                        # if we don't explicitly convert to a dict
                        "payment_provider_data": dict(subscription),
                        "provider_subscription_id": subscription.id,
                        "provider_payment_id": subscription.latest_invoice.payment_intent.id,
                    }
                )
            except stripe.error.StripeError as stripe_error:
                message = stripe_error.error.message if stripe_error.error else "Could not complete payment"
                raise PaymentProviderError(message)

        if update_data:
            for key, value in update_data.items():
                setattr(self.contribution, key, value)
            with reversion.create_revision():
                reversion.set_comment("`StripePaymentManager.complete_recurring_payment` completed contribution")
                self.contribution.save(update_fields=set(update_data.keys()).union({"modified"}))
                logger.info(
                    "StripePaymentManager.complete_recurring_payment updated contribution with id %s",
                    self.contribution.id,
                )
                return
