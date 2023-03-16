import logging

from django.conf import settings

import reversion
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
        previous_status = self.contribution.status
        self.contribution.status = ContributionStatus.PROCESSING
        update_fields = set()
        try:
            if reject:
                stripe.PaymentIntent.cancel(
                    self.contribution.provider_payment_id,
                    stripe_account=revenue_program.payment_provider.stripe_account_id,
                    cancellation_reason="fraudulent",
                )
                # we rely on Stripe webhook for payment_intent.canceled that updates status on contribution
                self.contribution.status = ContributionStatus.REJECTED
                update_fields.add("status")
            else:
                stripe.PaymentIntent.capture(
                    self.contribution.provider_payment_id,
                    stripe_account=revenue_program.payment_provider.stripe_account_id,
                )
                self.contribution.status = ContributionStatus.PAID
                update_fields.add("status")

        except (stripe.error.StripeError, stripe.error.InvalidRequestError):
            self.contribution.status = previous_status
            logger.exception(
                "`StripePaymentManager.complete_one_time_payment` contribution error for id (%s}",
                self.contribution.pk,
            )
            raise PaymentProviderError("Something went wrong with Stripe")
        finally:
            if update_fields:
                with reversion.create_revision():
                    reversion.set_comment(
                        f"`StripePaymentManager.complete_one_time_payment` completed contribution with id {self.contribution.id} "
                        f"and status {self.contribution.status}"
                    )
                    self.contribution.save(update_fields=update_fields.union({"modified"}))

    def complete_recurring_payment(self, reject=False):
        update_fields = set()
        if reject:
            try:
                setup_intent = stripe.SetupIntent.retrieve(
                    self.contribution.provider_setup_intent_id,
                    stripe_account=self.contribution.donation_page.revenue_program.stripe_account_id,
                )
                logger.info(
                    "`StripePaymentManager.complete_recurring_payment` detaching payment method for contribution with id %s",
                    self.contribution.id,
                )
                stripe.PaymentMethod.retrieve(
                    setup_intent["payment_method"],
                    stripe_account=self.contribution.donation_page.revenue_program.stripe_account_id,
                ).detach()

            except stripe.error.StripeError:
                logger.exception(
                    (
                        "`StripePaymentManager.complete_recurring_payment` encountered an error trying to cancel a "
                        "setup intent with ID %s for contribution with ID %s"
                    ),
                    self.contribution.provider_setup_intent_id,
                    self.contribution.id,
                )
                raise PaymentProviderError(
                    "Something went wrong trying to delete Stripe setup intent with id: %s",
                    self.contribution.provider_setup_intent_id,
                )
            else:
                self.contribution.status = ContributionStatus.REJECTED
                update_fields.add("status")
                with reversion.create_revision():
                    reversion.set_comment(
                        f"`StripePaymentManager.complete_recurring_payment` completed contribution with id {self.contribution.id} "
                        f"and status {self.contribution.status}"
                    )
                    self.contribution.save(update_fields=update_fields.union({"modified"}))
                    return

        previous_status = self.contribution.status

        try:
            setup_intent = stripe.SetupIntent.retrieve(
                self.contribution.provider_setup_intent_id,
                stripe_account=self.contribution.donation_page.revenue_program.stripe_account_id,
            )
            self.contribution.status = ContributionStatus.PROCESSING
            update_fields.add("status")
            self.contribution.create_stripe_subscription(
                off_session=True,
                error_if_incomplete=True,
                default_payment_method=setup_intent["payment_method"],
                metadata=setup_intent["metadata"],
                save=False,
            )
            # these get updated in `create_stripe_subscription`
            update_fields = update_fields.union(
                {"payment_provider_data", "provider_subscription_id", "provider_payment_id"}
            )
            self.contribution.status = ContributionStatus.PAID

        except stripe.error.StripeError as stripe_error:
            self.contribution.status = previous_status
            update_fields.remove("status")
            message = stripe_error.error.message if stripe_error.error else "Could not complete payment"
            raise PaymentProviderError(message)
        finally:
            if len(update_fields):
                update_fields.add("modified")
                with reversion.create_revision():
                    reversion.set_comment(
                        f"`StripePaymentManager.complete_recurring_payment` completed contribution with id {self.contribution.id} "
                        f"and the following update fields: {', '.join(update_fields)}"
                    )
                    self.contribution.save(update_fields=update_fields)
