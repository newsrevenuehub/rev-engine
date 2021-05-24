from django.conf import settings
from django.utils import timezone

import stripe

from apps.contributions.bad_actor import BadActorAPIError, make_bad_actor_request
from apps.contributions.models import Contribution, Contributor
from apps.contributions.serializers import StripePaymentIntentSerializer
from apps.contributions.utils import get_hub_stripe_api_key
from apps.organizations.models import RevenueProgram
from apps.pages.models import DonationPage


class PaymentProviderError(Exception):
    """
    A PaymentProviderError generalizes all the errors that might be returned by various Payment Providers.
    """

    pass


class PaymentIntentBadParamsError(Exception):
    """
    PaymentIntentBadParamsError represents a failure to find model instances from provided parameters.
    """

    pass


class PaymentIntent:
    serializer_class = None
    bad_actor_score = None
    bad_actor_response = None
    validated_data = None
    flagged = None
    contribution = None
    revenue_program = None

    def __init__(self, data=None, contribution=None):
        """
        The PaymentIntent class and its subclasses behave much like a ModelSerializer,
        but they operate on multiple local models as well as models held by the payment provider.

        A PaymentIntent instantiated with `data` acts as a serializer for that data.
        It is able to validate and process the data, creating new model instances both
        locally and with the payment provider.

        A PaymentIntent instantiated with a `Contribution` is like a ModelSerilizer receiving an update
        to an existing instance. Here we use this class to perform updates on existing local and payment-provider
        models.
        """
        if contribution and not isinstance(contribution, Contribution):
            raise ValueError("PaymentIntent contribution argument expected an instance of Contribution.")
        if contribution and data:
            raise ValueError("PaymentIntent must be initialized with either data or a contribution, not both.")
        self.contribution = contribution
        self.data = data

    def validate(self):
        serializer = self.serializer_class(data=self.data)
        serializer.is_valid(raise_exception=True)
        self.validated_data = serializer.data

    def get_bad_actor_score(self):
        if not self.validated_data:
            raise ValueError("PaymentIntent must call 'validate' before calling BadActor API")
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

    def get_or_create_contributor(self):
        contributor, _ = Contributor.objects.get_or_create(email=self.validated_data["email"])
        return contributor

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
            raise PaymentIntentBadParamsError("PaymentIntent could not find a revenue program with slug provided")

    def get_organization(self):
        revenue_program = self.get_revenue_program()
        return revenue_program.organization

    def get_donation_page(self):
        page_slug = self.validated_data.get("donation_page_slug")
        try:
            return DonationPage.objects.get(slug=page_slug) if page_slug else self.revenue_program.default_donation_page
        except DonationPage.DoesNotExist:
            raise PaymentIntentBadParamsError("PaymentIntent could not find a donation page with slug provided")

    def create_contribution(self, organization, payment_intent):
        if not self.payment_provider_name:
            raise ValueError("Subclass of PaymentIntent must set payment_provider_name property")

        contributor = self.get_or_create_contributor()
        donation_page = self.get_donation_page()
        Contribution.objects.create(
            amount=self.validated_data["amount"],
            donation_page=donation_page,
            organization=organization,
            contributor=contributor,
            payment_provider_used=self.payment_provider_name,
            payment_provider_data=payment_intent,
            provider_reference_id=payment_intent.id,
            payment_state=Contribution.FLAGGED[0] if self.flagged else Contribution.PROCESSING[0],
            bad_actor_score=self.bad_actor_score,
            bad_actor_response=self.bad_actor_response,
        )

    def ensure_bad_actor_score(self):
        if self.flagged is None:
            raise ValueError("PaymentIntent must call 'get_bad_actor_score' before creating payment intent")

    def get_subclass(self):
        if not self.contribution:
            raise ValueError(
                "Calling get_subclass requires PaymentIntent to be instantiated with a contribution instance."
            )

        pp_used = self.contribution.payment_provider_used
        if pp_used == "Stripe":
            return StripePaymentIntent

    def create_payment_intent(self):
        raise NotImplementedError("Subclass of PaymentIntent must implement create_payment_intent.")

    def create_one_time_payment_intent(self):  # pragma: no cover
        raise NotImplementedError("Subclass of PaymentIntent must implement create_one_time_payment_intent.")

    def create_recurring_payment_intent(self):  # pragma: no cover
        raise NotImplementedError("Subclass of PaymentIntent must implement create_recurring_payment_intent.")

    def complete_payment(self, **kwargs):  # pragma: no cover
        raise NotImplementedError("Subclass of PaymentIntent must implement complete_payment.")


class StripePaymentIntent(PaymentIntent):
    serializer_class = StripePaymentIntentSerializer
    payment_provider_name = "Stripe"

    def create_one_time_payment_intent(self):
        org = self.get_organization()
        capture_method = "manual" if self.flagged else "automatic"
        stripe_payment_intent = stripe.PaymentIntent.create(
            amount=self.validated_data["amount"],
            currency=settings.DEFAULT_CURRENCY,
            payment_method_types=["card"],
            api_key=get_hub_stripe_api_key(),
            stripe_account=org.stripe_account_id,
            capture_method=capture_method,
        )

        self.create_contribution(org, stripe_payment_intent)
        return stripe_payment_intent

    def create_recurring_payment_intent(self):  # pragma: no cover
        pass

    def create_payment_intent(self):
        self.ensure_bad_actor_score()
        if self.validated_data["payment_type"] == StripePaymentIntentSerializer.PAYMENT_TYPE_SINGLE[0]:
            stripe_payment_intent = self.create_one_time_payment_intent()
        else:  # pragma: no cover
            stripe_payment_intent = self.create_recurring_payment_intent()

        return stripe_payment_intent

    def complete_payment(self, reject=False):
        organization = self.contribution.organization
        previous_payment_state = self.contribution.payment_state
        self.contribution.payment_state = Contribution.PROCESSING[0]
        self.contribution.save()

        try:
            if reject:
                stripe.PaymentIntent.cancel(
                    self.contribution.provider_reference_id,
                    stripe_account=organization.stripe_account_id,
                    api_key=get_hub_stripe_api_key(),
                    cancellation_reason="fraudulent",
                )
            else:
                stripe.PaymentIntent.capture(
                    self.contribution.provider_reference_id,
                    stripe_account=organization.stripe_account_id,
                    api_key=get_hub_stripe_api_key(),
                )

        except stripe.error.InvalidRequestError as invalid_request_error:
            self.contribution.payment_state = previous_payment_state
            self.contribution.save()
            # ? Send email?
            # ? This error is possible if contribution.payment_state does not match what Stripe thinks.
            # ? Stripe will say "This payment could not be captured because it has already been [captured/canceled/failed]"
            raise PaymentProviderError(invalid_request_error)
        except stripe.error.StripeError as stripe_error:
            self.contribution.payment_state = previous_payment_state
            self.contribution.save()
            raise PaymentProviderError(stripe_error)
