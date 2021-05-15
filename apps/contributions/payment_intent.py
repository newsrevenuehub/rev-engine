from django.conf import settings

import stripe

from apps.contributions.bad_actor import BadActorAPIError, make_bad_actor_request
from apps.contributions.models import Contribution, Contributor
from apps.contributions.serializers import StripePaymentIntentSerializer
from apps.contributions.utils import get_hub_stripe_api_key
from apps.organizations.models import Organization
from apps.pages.models import DonationPage


class PaymentIntent:
    serializer_class = None
    bad_actor_score = None
    bad_actor_response = None
    validated_data = None
    flagged = None

    def __init__(self, data=None, **kwargs):
        self.data = data

    def validate(self):
        serializer = self.serializer_class(data=self.data)
        serializer.is_valid(raise_exception=True)
        self.validated_data = serializer.data

    def get_bad_actor_score(self):
        try:
            response = make_bad_actor_request(self.validated_data)
            self.bad_actor_score = response.json()["overall_judgment"]
            self.flagged = self.should_flag()
        except BadActorAPIError:
            self.flagged = False
        finally:
            self.bad_actor_response = response.json()

    def get_or_create_contributor(self):
        contributor, _ = Contributor.objects.get_or_create(email=self.validated_data["email"])
        return contributor

    def should_flag(self):
        return self.bad_actor_score >= 3

    def get_organization(self):
        try:
            return Organization.objects.get(slug=self.validated_data["organization_slug"])
        except Organization.DoesNotExist:
            raise ValueError("PaymentIntent could not find an organization with slug provided")

    def get_donation_page(self):
        try:
            return DonationPage.objects.get(slug=self.validated_data["donation_page_slug"])
        except DonationPage.DoesNotExist:
            raise ValueError("PaymentIntent could not find a donation page with slug provided")

    def create_contribution(self, organization, stripe_payment_intent):
        contributor = self.get_or_create_contributor()
        donation_page = self.get_donation_page()
        Contribution.objects.create(
            amount=self.validated_data["amount"],
            donation_page=donation_page,
            organization=organization,
            contributor=contributor,
            payment_provider_data=stripe_payment_intent,
            provider_reference_id=stripe_payment_intent.id,
            payment_state=Contribution.FLAGGED[0] if self.flagged else Contribution.PROCESSING[0],
            bad_actor_score=self.bad_actor_score,
            bad_actor_response=self.bad_actor_response,
        )

    def create_payment_intent(self):
        if self.flagged is None:
            raise ValueError("PaymentIntent must call 'get_bad_actor_score' before creating payment intent")
        if self.validated_data is None:
            raise ValueError("PaymentIntent must call 'validate' before creating payment intent")
        pass

    def make_one_time_payment(self):
        raise NotImplementedError("Subclass of PaymentIntent must implement this method.")

    def make_recurring_payment(self):
        raise NotImplementedError("Subclass of PaymentIntent must implement this method.")


class StripePaymentIntent(PaymentIntent):
    serializer_class = StripePaymentIntentSerializer

    def create_one_time_payment_intent(self):
        org = self.get_organization()
        capture_method = "manual" if self.flagged else "automatic"
        if self.flagged:
            capture_method = "manual"

        stripe_payment_intent = stripe.PaymentIntent.create(
            amount=self.validated_data["amount"],
            currency=settings.DEFAULT_CURRENCY,
            payment_method_types=["card"],
            api_key=get_hub_stripe_api_key(),
            stripe_account=org.stripe_account_id,
            capture_method=capture_method,
        )

        self.create_contribution()
        return stripe_payment_intent

    def create_recurring_payment_intent(self):
        pass

    def create_payment_intent(self):
        super().create_payment_intent()

        if self.payment_type == StripePaymentIntentSerializer.PAYMENT_TYPE_SINGLE[0]:
            stripe_payment_intent = self.create_one_time_payment_intent()
        else:
            stripe_payment_intent = self.create_recurring_payment_intent()

        return stripe_payment_intent
