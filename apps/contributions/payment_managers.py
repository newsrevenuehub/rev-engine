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
        """Return serializer class based on whether data or contribution instance have interval of one-time, or something else."""
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
                "`StripePaymentManager.attach_payment_method_to_customer` resulted in a StripeError for stripe_customer_id"
                " %s org_stripe_account %s payment_method_id %s",
                stripe_customer_id,
                org_stripe_account,
                payment_method_id,
            )
            raise PaymentProviderError("Something went wrong with Stripe") from None

    def complete_payment(self, reject=False):
        if self.contribution.interval == ContributionInterval.ONE_TIME:
            self.complete_one_time_payment(reject)
        elif self.contribution.interval:
            self.complete_recurring_payment(reject)

    def complete_one_time_payment(self, reject=False) -> None:
        revenue_program = self.contribution.revenue_program
        update_data = {}
        try:
            match (
                reject,
                bool(self.contribution.provider_payment_id),
                bool(pi := self.contribution.stripe_payment_intent),
            ):
                # if there's no provider_payment_id and it's one-time flagged, something went wrong, as it
                # shouldn't be possible to get in this state via checkout flow. We mainly cover this edge
                # case out of defensive stance rather than specific knowledge of it happening.
                case (_, False, _):
                    # maybe have an additional check that it's older than a certain amount -- don't want edge case
                    logger.warning(
                        "One-time contribution %s is flagged and has no provider_payment_id..", self.contribution.id
                    )
                    update_data["status"] = ContributionStatus.REJECTED

                # in this case, we warn, but don't update status because inability to retrieve PI is not an inherent reason to reject
                case (False, True, False):
                    logger.warning(
                        "Unable to retrieve payment intent for contribution with ID %s", self.contribution.id
                    )
                    raise PaymentProviderError(
                        f"Cannot retrieve payment intent {self.contribution.provider_payment_id} for contribution {self.contribution.id}"
                    )

                # we're accepting the payment
                case (False, True, True):
                    logger.info("StripePaymentManager.complete_one_time_payment capturing Stripe PI %s", pi.id)
                    pi.capture(
                        self.contribution.provider_payment_id,
                        stripe_account=revenue_program.payment_provider.stripe_account_id,
                    )
                    # we only want to update the status after we've succeeded at capturing the payment
                    update_data["status"] = ContributionStatus.PAID

                # if we're rejecting
                case (True, True, True):
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
                    # should we also try to detach a PM?
                    # we only want to update the status if the payment was successfully canceled
                    update_data["status"] = ContributionStatus.REJECTED

        except stripe.error.StripeError as exc:
            message = exc.error.message if exc.error else "Could not complete payment"
            raise PaymentProviderError(message) from exc

        finally:
            if update_data:
                with reversion.create_revision():
                    for key, value in update_data.items():
                        setattr(self.contribution, key, value)
                    reversion.set_comment("`StripePaymentManager.complete_one_time_payment` updated contribution")
                    self.contribution.save(update_fields=set(update_data.keys()).union({"modified"}))
                    logger.info(
                        "StripePaymentManager.complete_one_time_payment updated contribution with id %s",
                        self.contribution.id,
                    )

    def complete_recurring_payment(self, reject=False) -> None:
        update_data = {}
        si = self.contribution.stripe_setup_intent
        pm = self.contribution.fetch_stripe_payment_method()
        # If we're rejecting, the critical thing is to change the status to rejected.
        try:
            if reject:
                update_data["status"] = ContributionStatus.REJECTED
                if pm:
                    logger.info(
                        "StripePaymentManager.complete_recurring_payment detaching Stripe PM %s for contribution %s",
                        pm.id,
                        self.contribution.id,
                    )
                    pm.detach()
            # if accept but we can't get SI, there's nothing more we can do.
            elif not si:
                logger.error(
                    "`StripePaymentManager.complete_recurring_payment` error retrieving setup intent for contribution"
                    " with ID %s and setup intent ID %s",
                    self.contribution.id,
                    self.contribution.provider_setup_intent_id,
                )
                raise PaymentProviderError("Cannot retrieve payment data")
            else:
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
                        "provider_subscription_id": subscription.id,
                        "provider_payment_id": subscription.latest_invoice.payment_intent.id,
                    }
                )
        except stripe.error.StripeError as exc:
            message = exc.error.message if exc.error else "Could not complete payment"
            raise PaymentProviderError(message) from exc
        finally:
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
