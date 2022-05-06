import logging

from django.conf import settings
from django.utils import timezone

import stripe
from rest_framework import serializers as drf_serializers

from apps.contributions.bad_actor import BadActorAPIError, make_bad_actor_request
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
)
from apps.contributions.serializers import (
    BadActorSerializer,
    ContributionMetadataSerializer,
    StripeOneTimePaymentSerializer,
    StripeRecurringPaymentSerializer,
)
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

    def bundle_metadata(self, processor_obj: str):
        self.ensure_validated_data()

        if not self.data.get("contributor_id"):
            self.get_or_create_contributor()

        self.metadata_serializer.validate_secondary_metadata(self.data)
        return self.metadata_serializer.bundle_metadata(processor_obj)

    def _serialize_data(self):
        self.data_serializer = self.serializer_class(data=self.data)
        return self.data_serializer

    def _serialize_metadata(self):
        if not self.data.get("revenue_program_id"):
            self.get_revenue_program()

        self.metadata_serializer = ContributionMetadataSerializer(data=self.data)
        return self.metadata_serializer

    def validate(self):
        data_serializer = self._serialize_data()
        data_serializer.is_valid(raise_exception=False)

        metadata_serializer = self._serialize_metadata()
        metadata_serializer.is_valid(raise_exception=False)

        if data_serializer.errors or metadata_serializer.errors:
            errors = {**data_serializer.errors, **metadata_serializer.errors}
            raise drf_serializers.ValidationError(errors)

        self.validated_data = data_serializer.data

    def validate_badactor_data(self):
        # validate_badactor_data should not be called without first validating payment data.
        self.ensure_validated_data()
        serializer = BadActorSerializer(data=self.data)
        try:
            # Here we raise an exception and catch it to handle it on our own,
            # rather than let it pass through to the user.
            serializer.is_valid(raise_exception=True)
        except drf_serializers.ValidationError as ba_validation_error:
            logger.warning(f"BadActor serializer raised a ValidationError: {str(ba_validation_error)}")
        self.validated_badactor_data = serializer.data

    def ensure_validated_data(self):
        if not self.validated_data:
            raise ValueError("PaymentManager must call 'validate' before performing this action")

    def get_bad_actor_score(self):
        self.validate_badactor_data()

        try:
            response = make_bad_actor_request(self.validated_badactor_data)
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
        if self.contribution:
            revenue_program = self.revenue_program = self.contribution.donation_page.revenue_program
        else:
            try:
                revenue_program = self.revenue_program = (
                    self.revenue_program
                    if self.revenue_program
                    else RevenueProgram.objects.get(slug=self.data.get("revenue_program_slug"))
                )
            except RevenueProgram.DoesNotExist:
                raise PaymentBadParamsError("PaymentManager could not find a revenue program with slug provided")
        self.data["revenue_program_id"] = revenue_program.pk
        return revenue_program

    def get_organization(self):
        revenue_program = self.get_revenue_program()
        return revenue_program.organization

    def get_donation_page(self):
        """
        A PaymentManager can retrieve a donation page for any given contribution.
        If validated_data is present, then the contribution has yet to be created. So grab it from the validated data.
        Otherwise, grab it from the existing contribution.
        """
        if self.contribution:
            return self.contribution.donation_page

        rev_program = self.get_revenue_program()
        if page_slug := self.data.get("donation_page_slug"):
            if donation_page := DonationPage.objects.filter(revenue_program=rev_program, slug=page_slug).first():
                return donation_page
            raise PaymentBadParamsError("PaymentManager could not find a donation page with slug provided")
        return rev_program.default_donation_page

    def get_or_create_contributor(self):
        contributor, _ = Contributor.objects.get_or_create(email=self.validated_data["email"])
        self.data["contributor_id"] = contributor.pk
        return contributor

    def create_contribution(
        self, revenue_program, contributor, provider_reference_instance=None, provider_customer_id="", metadata={}
    ):
        if not self.payment_provider_name:
            raise ValueError("Subclass of PaymentManager must set payment_provider_name property")

        status = ContributionStatus.FLAGGED if self.flagged else ContributionStatus.PROCESSING
        donation_page = self.get_donation_page()
        provider_payment_id = provider_reference_instance.id if provider_reference_instance else None
        provider_payment_method_id = self.validated_data.get("payment_method_id", "")
        return Contribution.objects.create(
            amount=self.validated_data["amount"],
            interval=self.validated_data["interval"],
            currency=self.validated_data["currency"],
            status=status,
            donation_page=donation_page,
            revenue_program=revenue_program,
            contributor=contributor,
            payment_provider_used=self.payment_provider_name,
            payment_provider_data=provider_reference_instance,
            provider_payment_id=provider_payment_id,
            provider_customer_id=provider_customer_id,
            provider_payment_method_id=provider_payment_method_id,
            flagged_date=self.flagged_date,
            bad_actor_score=self.bad_actor_score,
            bad_actor_response=self.bad_actor_response,
            contribution_metadata=metadata,
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
        revenue_program = self.get_revenue_program()
        contributor = self.get_or_create_contributor()
        stripe_customer = self.create_stripe_customer(revenue_program)
        capture_method = "manual" if self.flagged else "automatic"
        metadata = self.bundle_metadata(ContributionMetadataSerializer.PAYMENT)
        stripe_payment_intent = stripe.PaymentIntent.create(
            amount=self.validated_data["amount"],
            currency=self.validated_data["currency"],
            customer=stripe_customer.id,
            payment_method_types=["card"],
            stripe_account=revenue_program.payment_provider.stripe_account_id,
            capture_method=capture_method,
            statement_descriptor_suffix=revenue_program.stripe_statement_descriptor_suffix,
            receipt_email=self.validated_data["email"],
            metadata=metadata,
        )
        self.create_contribution(
            revenue_program,
            contributor,
            provider_reference_instance=stripe_payment_intent,
            provider_customer_id=stripe_customer.id,
            metadata=metadata,
        )
        return stripe_payment_intent

    def create_subscription(self):
        """
        Unlike PaymentIntents, Stripe Subscriptions do not have a concept of a "capture_method".
        So far, it seems like the best way to delay the "capture" of a flagged contribution is to
        simply not create it until it's been approved.
        """
        self.ensure_validated_data()
        self.ensure_bad_actor_score()
        revenue_program = self.get_revenue_program()

        # Create customer on org...
        contributor = self.get_or_create_contributor()
        stripe_customer = self.create_stripe_customer(revenue_program)
        # ...attach paymentMethod to that customer.
        self.attach_payment_method_to_customer(stripe_customer.id, revenue_program.payment_provider.stripe_account_id)
        metadata = self.bundle_metadata(ContributionMetadataSerializer.PAYMENT)
        contribution = self.create_contribution(
            revenue_program, contributor, provider_customer_id=stripe_customer.id, metadata=metadata
        )
        if not self.flagged:
            self.contribution = contribution
            self.complete_payment(reject=False)

    def create_stripe_customer(self, revenue_program: RevenueProgram):
        meta = self.bundle_metadata(ContributionMetadataSerializer.CUSTOMER)
        return stripe.Customer.create(
            email=self.validated_data["email"],
            stripe_account=revenue_program.payment_provider.stripe_account_id,
            metadata=meta,
        )

    def attach_payment_method_to_customer(self, stripe_customer_id, org_strip_account, payment_method_id=None):
        try:
            stripe.PaymentMethod.attach(
                payment_method_id if payment_method_id else self.validated_data["payment_method_id"],
                customer=stripe_customer_id,
                stripe_account=org_strip_account,
            )
        except stripe.error.StripeError as stripe_error:
            logger.error(f"stripe.PaymentMethod.attach returned a StripeError: {str(stripe_error)}")
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
            logger.error(f"stripe.Subscription.modify returned a StripeError: {str(stripe_error)}")
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
            logger.error(f"stripe.Subscription.modify returned a StripeError: {str(stripe_error)}")
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
            logger.info(f"Contribution error for id({self.contribution.pk}): {str(invalid_request_error)}")
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
        logger.warning("Using debug intervals for Stripe Subscriptions")
        if self.contribution.interval == Contribution.INTERVAL_MONTHLY:
            return "daily"

        if self.contribution.interval == Contribution.INTERVAL_YEARLY:
            return "weekly"
