import logging

from django.conf import settings
from django.utils import timezone

import stripe

from apps.contributions.bad_actor import BadActorAPIError, make_bad_actor_request
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
)
from apps.contributions.serializers import (
    StripeOneTimePaymentSerializer,
    StripeRecurringPaymentSerializer,
)
from apps.contributions.utils import get_hub_stripe_api_key
from apps.organizations.models import RevenueProgram
from apps.pages.models import DonationPage


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class PaymentProviderError(Exception):
    """
    A PaymentProviderError generalizes all the errors that might be returned by various payment providers.
    """

    pass


class PaymentBadParamsError(Exception):
    """
    PaymentBadParamsError represents a failure to find model instances from provided parameters.
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

    def validate(self):
        serializer = self.serializer_class(data=self.data)
        serializer.is_valid(raise_exception=True)
        self.validated_data = serializer.data

    def ensure_validated_data(self):
        if not self.validated_data:
            raise ValueError("PaymentManager must call 'validate' before performing this action")

    def get_bad_actor_score(self):
        self.ensure_validated_data()

        try:
            response = make_bad_actor_request(self.validated_data)
            self.bad_actor_score = response.json()["overall_judgment"]
            self.bad_actor_response = response.json()
            if self.should_flag():
                self.flagged = True
                self.flagged_date = timezone.now()
            else:
                self.flagged = False
        except BadActorAPIError:
            self.flagged = False

    def ensure_bad_actor_score(self):
        if self.flagged is None:
            raise ValueError("PaymentManager must call 'get_bad_actor_score' before performing this action")

    def ensure_contribution(self):
        if not self.contribution:
            raise ValueError("Method requires PaymentManager to be instantiated with contribution instance")

    def should_flag(self):
        """
        BadActor API returns an "overall_judgement", between 0-5.
        """
        return self.bad_actor_score >= settings.BAD_ACTOR_FAIL_ABOVE

    def get_revenue_program(self):
        try:
            self.revenue_program = (
                self.revenue_program
                if self.revenue_program
                else RevenueProgram.objects.get(slug=self.validated_data["revenue_program_slug"])
            )
            return self.revenue_program
        except RevenueProgram.DoesNotExist:
            raise PaymentBadParamsError("PaymentManager could not find a revenue program with slug provided")

    def get_organization(self):
        revenue_program = self.get_revenue_program()
        return revenue_program.organization

    def get_donation_page(self):
        page_slug = self.validated_data.get("donation_page_slug")
        try:
            return DonationPage.objects.get(slug=page_slug) if page_slug else self.revenue_program.default_donation_page
        except DonationPage.DoesNotExist:
            raise PaymentBadParamsError("PaymentManager could not find a donation page with slug provided")

    def get_or_create_contributor(self):
        contributor, _ = Contributor.objects.get_or_create(email=self.validated_data["email"])
        return contributor

    def create_contribution(self, organization, provider_reference_instance=None, provider_customer_id=""):
        if not self.payment_provider_name:  # pragma: no cover
            raise ValueError("Subclass of PaymentManager must set payment_provider_name property")

        status = ContributionStatus.FLAGGED if self.flagged else ContributionStatus.PROCESSING
        contributor = self.get_or_create_contributor()
        donation_page = self.get_donation_page()
        provider_payment_id = provider_reference_instance.id if provider_reference_instance else None
        provider_payment_method_id = self.validated_data.get("payment_method_id", "")

        return Contribution.objects.create(
            amount=self.validated_data["amount"],
            reason=self.validated_data["reason"],
            interval=self.validated_data["interval"],
            status=status,
            donation_page=donation_page,
            organization=organization,
            contributor=contributor,
            payment_provider_used=self.payment_provider_name,
            payment_provider_data=provider_reference_instance,
            provider_payment_id=provider_payment_id,
            provider_customer_id=provider_customer_id,
            provider_payment_method_id=provider_payment_method_id,
            flagged_date=self.flagged_date,
            bad_actor_score=self.bad_actor_score,
            bad_actor_response=self.bad_actor_response,
        )

    @staticmethod
    def get_subclass(contribution):
        payment_provider_used = contribution.payment_provider_used
        if payment_provider_used == "Stripe":
            return StripePaymentManager

    def complete_payment(self, **kwargs):  # pragma: no cover
        raise NotImplementedError("Subclass of PaymentManager must implement complete_payment.")


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

    def create_one_time_payment(self):
        """
        A one-time payment creates a simple Stripe PaymentIntent. This PaymentIntent can be
        executed immediately with `capture_method="automatic"`, or capture can be deferred. If
        `capture_method` is set to "manual", Stripe will hold the funds in the customer's bank
        for seven days.
        """
        self.ensure_validated_data()
        self.ensure_bad_actor_score()
        organization = self.get_organization()
        capture_method = "manual" if self.flagged else "automatic"
        stripe_payment_intent = stripe.PaymentIntent.create(
            amount=self.validated_data["amount"],
            currency=settings.DEFAULT_CURRENCY,
            payment_method_types=["card"],
            api_key=get_hub_stripe_api_key(),
            stripe_account=organization.stripe_account_id,
            capture_method=capture_method,
            receipt_email=self.validated_data["email"],
        )

        self.create_contribution(organization, provider_reference_instance=stripe_payment_intent)
        return stripe_payment_intent

    def create_subscription(self):
        """
        Unlike PaymentIntents, Stripe Subscriptions do not have a concept of a "capture_method".
        So far, it seems like the best way to delay the "capture" of a flagged contribution is to
        simply not create it until it's been approved.
        """
        self.ensure_validated_data()
        self.ensure_bad_actor_score()
        organization = self.get_organization()

        # Create customer on org...
        stripe_customer = self.create_organization_customer(organization)
        # ...attach paymentMethod to that customer.
        self.attach_payment_method_to_customer(stripe_customer.id, organization.stripe_account_id)

        contribution = self.create_contribution(organization, provider_customer_id=stripe_customer.id)
        if not self.flagged:
            self.contribution = contribution
            self.complete_payment(reject=False)

    def create_organization_customer(self, organization):
        return stripe.Customer.create(
            email=self.validated_data["email"],
            api_key=get_hub_stripe_api_key(),
            stripe_account=organization.stripe_account_id,
        )

    def attach_payment_method_to_customer(self, stripe_customer_id, org_strip_account, payment_method_id=None):
        try:
            stripe.PaymentMethod.attach(
                payment_method_id if payment_method_id else self.validated_data["payment_method_id"],
                customer=stripe_customer_id,
                api_key=get_hub_stripe_api_key(),
                stripe_account=org_strip_account,
            )
        except stripe.error.StripeError as stripe_error:
            logger.error(f"stripe.PaymentMethod.attach returned a StripeError: {str(stripe_error)}")
            self._handle_stripe_error(stripe_error)

    def cancel_recurring_payment(self):
        self.ensure_contribution()
        organization = self.contribution.organization
        try:
            stripe.Subscription.delete(
                self.contribution.provider_subscription_id,
                api_key=get_hub_stripe_api_key(),
                stripe_account=organization.stripe_account_id,
            )
        except stripe.error.StripeError as stripe_error:
            logger.error(f"stripe.Subscription.modify returned a StripeError: {str(stripe_error)}")
            self._handle_stripe_error(stripe_error)

    def update_payment_method(self, payment_method_id):
        self.ensure_contribution()

        customer_id = self.contribution.provider_customer_id
        organization = self.contribution.organization
        self.attach_payment_method_to_customer(customer_id, organization.stripe_account_id, payment_method_id)
        try:
            stripe.Subscription.modify(
                self.contribution.provider_subscription_id,
                default_payment_method=payment_method_id,
                stripe_account=organization.stripe_account_id,
                api_key=get_hub_stripe_api_key(),
            )
        except stripe.error.StripeError as stripe_error:
            logger.error(f"stripe.Subscription.modify returned a StripeError: {str(stripe_error)}")
            self._handle_stripe_error(stripe_error)

    def complete_payment(self, reject=False):
        if self.contribution.interval == ContributionInterval.ONE_TIME:
            self.complete_one_time_payment(reject)
        elif self.contribution.interval:
            self.complete_recurring_payment(reject)

    def complete_one_time_payment(self, reject=False):
        organization = self.contribution.organization
        previous_status = self.contribution.status
        self.contribution.status = ContributionStatus.PROCESSING
        self.contribution.save()

        try:
            if reject:
                stripe.PaymentIntent.cancel(
                    self.contribution.provider_payment_id,
                    stripe_account=organization.stripe_account_id,
                    api_key=get_hub_stripe_api_key(),
                    cancellation_reason="fraudulent",
                )
            else:
                stripe.PaymentIntent.capture(
                    self.contribution.provider_payment_id,
                    stripe_account=organization.stripe_account_id,
                    api_key=get_hub_stripe_api_key(),
                )

        except stripe.error.InvalidRequestError as invalid_request_error:
            self.contribution.status = previous_status
            self.contribution.save()
            logger.warning(
                f"Stripe returned an InvalidRequestError at {timezone.now}. This was caused by attempting to {'reject' if reject else 'capture'} a payment that was flagged in our system, but was already captured or rejected in Stripe's system.",
            )
            raise PaymentProviderError(invalid_request_error)
        except stripe.error.StripeError as stripe_error:
            self._handle_stripe_error(stripe_error, previous_status=previous_status)

    def complete_recurring_payment(self, reject=False):
        if reject:
            """
            If flagged, creation of the Stripe Subscription is defered until it is "accepted".
            So to "reject", just don't create it. Set status of Contribution to "rejected"
            """
            self.contribution.status = ContributionStatus.REJECTED
            self.contribution.save()
            return

        organization = self.contribution.organization
        previous_status = self.contribution.status
        self.contribution.status = ContributionStatus.PROCESSING
        self.contribution.save()

        try:
            price_data = {
                "unit_amount": self.contribution.amount,
                "currency": self.contribution.currency,
                "product": organization.stripe_product_id,
                "recurring": {
                    "interval": self.contribution.interval,
                },
            }
            subscription = stripe.Subscription.create(
                customer=self.contribution.provider_customer_id,
                default_payment_method=self.contribution.provider_payment_method_id,
                items=[{"price_data": price_data}],
                stripe_account=organization.stripe_account_id,
                api_key=get_hub_stripe_api_key(),
            )
        except stripe.error.StripeError as stripe_error:
            self._handle_stripe_error(stripe_error, previous_status=previous_status)

        self.contribution.payment_provider_data = subscription
        self.contribution.provider_subscription_id = subscription.id
        self.contribution.save()

    def _handle_stripe_error(self, stripe_error, previous_status=None):
        if previous_status:
            self.contribution.status = previous_status
            self.contribution.save()
        message = stripe_error.error.message if stripe_error.error else "Could not complete payment"
        raise PaymentProviderError(message)

    def _get_interval(self):  # pragma: no cover
        """
        Utility to permit toggled debug intervals for testing.
        Unfortunately, Stripe has a narrow range of supported intervals here.
        Switching 'monthly' to 'daily' and 'yearly' to 'weekly' is ok, but not great.
        It would be really swell if there was a way to set it to minutes/hours.
        """
        if not settings.USE_DEBUG_INTERVALS == "True":
            return self.contribution.interval
        logger.warn("Using debug intervals for Stripe Subscriptions")
        if self.contribution.interval == Contribution.INTERVAL_MONTHLY:
            return "daily"

        if self.contribution.interval == Contribution.INTERVAL_YEARLY:
            return "weekly"
