import logging

from django.conf import settings
from django.db.models import TextChoices
from django.utils import timezone

import stripe
from rest_framework import serializers
from rest_framework.exceptions import APIException, PermissionDenied

from apps.api.error_messages import GENERIC_BLANK
from apps.contributions.models import (
    CardBrand,
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
    PaymentType,
)
from apps.contributions.utils import format_ambiguous_currency
from apps.pages.models import DonationPage

from .bad_actor import BadActorAPIError, make_bad_actor_request
from .fields import StripeAmountField


# this is an non-exhaustive list of Stripe errors that might
# occur when creating/updating payment intent or subscription.
# we use this below to avoid using a bare except
stripe_errors = (
    stripe.error.stripe.error.InvalidRequestError,
    stripe.error.stripe.error.APIConnectionError,
    stripe.error.APIError,
    stripe.error.AuthenticationError,
    stripe.error.PermissionError,
    stripe.error.RateLimitError,
)


class GenericPaymentError(APIException):
    status_code = 500
    default_detail = "Something unexpected happened"
    default_code = "unexpected_error"


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


# See https://stripe.com/docs/api/payment_intents/object#payment_intent_object-amount
# See https://stripe.com/docs/api/payment_intents/object#payment_intent_object-amount
# Stripe allows a maximum of eight digits here
STRIPE_MAX_AMOUNT = 99999999

# Revengine has its own restrictions (greater than Stripe's restrictions) on the min amount.
# Remember that 100 here is $1.00
REVENGINE_MIN_AMOUNT = 100


class ContributionSerializer(serializers.ModelSerializer):
    """
    Used when organizations are viewing a Contribution
    """

    contributor_email = serializers.StringRelatedField(read_only=True, source="contributor")

    auto_accepted_on = serializers.SerializerMethodField()
    formatted_payment_provider_used = serializers.SerializerMethodField()
    provider_payment_url = serializers.SerializerMethodField()
    provider_subscription_url = serializers.SerializerMethodField()
    provider_customer_url = serializers.SerializerMethodField()

    def get_auto_accepted_on(self, obj):
        """
        Note that this value is not read when making the actual auto-accept determination, where `flagged_date` is used and the math re-calculated.
        This is just to improve front-end visibility of the "deadline" for examining flagged contributions.
        """
        if obj.flagged_date:
            return obj.flagged_date + settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA

    def get_formatted_payment_provider_used(self, obj):
        if not obj.payment_provider_used:
            return ""
        return obj.payment_provider_used.title()

    def get_provider_payment_url(self, obj):
        if not obj.provider_payment_id:
            return ""
        return f"{self._get_resource_url(obj, 'provider_payment_id')}/{obj.provider_payment_id}"

    def get_provider_subscription_url(self, obj):
        if not obj.provider_subscription_id:
            return ""
        return f"{self._get_resource_url(obj, 'provider_subscription_id')}/{obj.provider_subscription_id}"

    def get_provider_customer_url(self, obj):
        if not obj.provider_customer_id:
            return ""
        return f"{self._get_resource_url(obj, 'provider_customer_id')}/{obj.provider_customer_id}"

    def _get_base_provider_url(self, obj):
        base = "https://"
        if obj.payment_provider_used == "Stripe":
            return base + "dashboard.stripe.com"

    def _get_resource_url(self, obj, resource):
        provider_url = self._get_base_provider_url(obj)
        if not provider_url:
            return ""
        if resource == "provider_payment_id":
            resource_url = "/payments"
        if resource == "provider_subscription_id":
            resource_url = "/subscriptions"
        if resource == "provider_customer_id":
            resource_url = "/customers"
        return provider_url + resource_url

    class Meta:
        model = Contribution
        fields = [
            "id",
            "contributor_email",
            "created",
            "amount",
            "currency",
            "interval",
            "last_payment_date",
            "bad_actor_score",
            "flagged_date",
            "auto_accepted_on",
            "formatted_payment_provider_used",
            "provider_payment_url",
            "provider_subscription_url",
            "provider_customer_url",
            "status",
            "donation_page_id",
        ]


class ContributorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contributor
        fields = "__all__"


class CompSubscriptions(TextChoices):
    NYT = "nyt", "nyt"


class BadActorSerializer(serializers.Serializer):
    # Donation info
    amount = serializers.CharField(max_length=12)

    # Donor info
    first_name = serializers.CharField(max_length=40)
    last_name = serializers.CharField(max_length=80)
    email = serializers.EmailField(max_length=80)
    street = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=40)
    state = serializers.CharField(max_length=80)
    country = serializers.CharField(max_length=80)
    zipcode = serializers.CharField(max_length=20)

    # Third-party risk assessment
    captcha_token = serializers.CharField(max_length=2550, required=False, allow_blank=True)

    # Request metadata
    ip = serializers.IPAddressField()
    referer = serializers.URLField()

    # Donation additional
    reason_for_giving = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)

    def to_internal_value(self, data):
        data["street"] = data.get("mailing_street")
        data["city"] = data.get("mailing_city")
        data["state"] = data.get("mailing_state")
        data["zipcode"] = data.get("mailing_postal_code")
        data["country"] = data.get("mailing_country")
        data["reason"] = data.get("reason_for_giving")
        return super().to_internal_value(data)


class AbstractPaymentSerializer(serializers.Serializer):
    # Payment details
    amount = serializers.IntegerField(
        min_value=REVENGINE_MIN_AMOUNT,
        max_value=STRIPE_MAX_AMOUNT,
        error_messages={
            "max_value": f"We can only accept contributions less than or equal to {format_ambiguous_currency(STRIPE_MAX_AMOUNT)}",
            "min_value": f"We can only accept contributions greater than or equal to {format_ambiguous_currency(REVENGINE_MIN_AMOUNT)}",
        },
    )
    interval = serializers.ChoiceField(choices=ContributionInterval.choices, default=ContributionInterval.ONE_TIME)
    # revenue_program_country tand currency are a different pattern, but important here.
    # They could be derived from the organization that this contribution is tied to,
    # but instead we send that info to each donation page load and pass it back as params;
    # that way we are certain that the currency and country used by payment provider in the
    # form is the one we use here.
    revenue_program_country = serializers.CharField(max_length=2, required=True)
    currency = serializers.CharField(max_length=3, required=True)

    # DonorInfo
    email = serializers.EmailField(max_length=80)

    # These are used to attach the contribution to the right organization,
    # and associate it with the page it came from.
    revenue_program_slug = serializers.SlugField()
    donation_page_slug = serializers.SlugField(required=False, allow_blank=True)

    # Page id is a nice shortcut for getting the page, instead of page_slug + rp_slug
    page_id = serializers.IntegerField(required=False)
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True)

    @classmethod
    def convert_cents_to_amount(self, cents):
        return str(float(cents / 100))

    def convert_amount_to_cents(self, amount):
        """
        Stripe stores payment amounts in cents.
        """
        return int(float(amount) * 100)

    def to_internal_value(self, data):
        # Incoming "amount" will be a money-like string, like "12.99".
        # Stripe wants 1299
        amount = data.get("amount")
        if isinstance(amount, str):
            data["amount"] = self.convert_amount_to_cents(data["amount"])
        return super().to_internal_value(data)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["amount"].error_messages["invalid"] = "Enter a valid amount"


class BaseCreatePaymentSerializer(serializers.Serializer):
    amount = StripeAmountField(
        min_value=REVENGINE_MIN_AMOUNT,
        max_value=STRIPE_MAX_AMOUNT,
        error_messages={
            "max_value": f"We can only accept contributions less than or equal to {format_ambiguous_currency(STRIPE_MAX_AMOUNT)}",
            "min_value": f"We can only accept contributions greater than or equal to {format_ambiguous_currency(REVENGINE_MIN_AMOUNT)}",
        },
        write_only=True,
    )
    interval = serializers.ChoiceField(choices=ContributionInterval.choices, default=ContributionInterval.ONE_TIME)
    email = serializers.EmailField(max_length=80, write_only=True)
    page = serializers.PrimaryKeyRelatedField(many=False, queryset=DonationPage.objects.all(), write_only=True)
    first_name = serializers.CharField(max_length=40, write_only=True)
    last_name = serializers.CharField(max_length=80, write_only=True)
    mailing_postal_code = serializers.CharField(max_length=20, write_only=True)
    mailing_street = serializers.CharField(max_length=255, write_only=True)
    mailing_city = serializers.CharField(max_length=40, write_only=True)
    mailing_state = serializers.CharField(max_length=80, write_only=True)
    mailing_country = serializers.CharField(max_length=80, write_only=True)
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True, write_only=True)
    agreed_to_pay_fees = serializers.BooleanField(default=False, write_only=True)
    reason_for_giving = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True)
    reason_other = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True)
    tribute_type = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True)
    honoree = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True)
    in_memory_of = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True)
    swag_opt_out = serializers.BooleanField(required=False, default=False, write_only=True)
    comp_subscription = serializers.ChoiceField(
        choices=CompSubscriptions.choices, required=False, allow_blank=True, write_only=True
    )
    sf_campaign_id = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True)
    captcha_token = serializers.CharField(max_length=2550, allow_blank=True, write_only=True)
    provider_client_secret_id = serializers.CharField(read_only=True)

    def validate_reason_for_giving(self, value):
        if value == "Other" and not self.initial_data.get("reason_other", None):
            raise serializers.ValidationError({"reason_other": GENERIC_BLANK})
        return value

    def validate_honoree(self, value):
        if self.initial_data.get("tribute_type", None) == "type_honoree" and not value:
            raise serializers.ValidationError({"honoree": GENERIC_BLANK})
        return value

    def validate_in_memory_of(self, value):
        if self.initial_data.get("tribute_type", None) == "type_in_memory_of" and not value:
            raise serializers.ValidationError({"in_memory_of": GENERIC_BLANK})
        return value

    def resolve_reason_for_giving(self, reason_for_giving, reason_other):
        """If `reason_for_giving` value is "Other", then we update it to the value for `reason_other`...

        ...from the form data. We assume this gets run in `.validate()` after field-level validations
        have run, which will guarantee that "reason_other" has a value if "reason_for_giving" is "Other".
        """
        return reason_other if reason_for_giving == "Other" else reason_for_giving

    def validate(self, data):
        """Validate any fields whose "is_required" behavior is determined dynamically by the org

        Some fields are statically (aka, always) required and we can specify that by setting `required=True` on the field definition
        (or by not setting at all, because required is True by default).

        However, RevEngine allows users to configure a subset of fields as required or not required, and that
        can only be known by retrieving the associated donation page data.

        So in this `validate` method, we find any donation page elements that are dynamically requirable and ensure that the submitted
        data contains non blank values.

        Additionally, we update `data["reason_for_giving"]`'s value in case it is "Other". This is not strictly speaking
        validation, but it can only happen after field level validations have run, so this is place in DRF serializer flow
        it should happen.
        """
        additional_errors = {}
        for element in [elem for elem in data["page"].elements if len(elem["requiredFields"])]:
            for field in element["requiredFields"]:
                # if it's blank or none or no key for it in data
                if data.get(field, None) in (None, ""):
                    additional_errors[field] = GENERIC_BLANK
        if additional_errors:
            raise serializers.ValidationError(additional_errors)
        data["reason_for_giving"] = self.resolve_reason_for_giving(
            data.get("reason_for_giving"), data.get("reason_other")
        )
        return data

    def get_bad_actor_score(self, data):
        """Based on validated data, make a request to bad actor API and return its response"""
        serializer = BadActorSerializer(
            data=(
                data
                | {
                    "referer": self.context["request"].META.get("HTTP_REFERER"),
                    "ip": self.context["request"].META.get("REMOTE_ADDR"),
                }
            )
        )
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as exc:
            logger.warning("BadActor serializer raised a ValidationError", exc_info=exc)
            return None
        try:
            return make_bad_actor_request(data).json()
        except BadActorAPIError:
            return None

    def should_flag(self, bad_actor_score):
        """Determine if bad actor score should lead to contribution being flagged"""
        return bad_actor_score >= settings.BAD_ACTOR_FAILURE_THRESHOLD

    def get_stripe_payment_metadata(self, contributor, validated_data):
        """Generate dict of metadata to be sent to Stripe when creating a PaymentIntent or Subscription"""
        return {
            # TODO: confirm business requirements around these first two keys/vals
            "source": settings.METADATA_SOURCE,
            "schema_version": settings.METADATA_SCHEMA_VERSION,
            "contributor_id": contributor.id,
            "agreed_to_pay_fees": validated_data["agreed_to_pay_fees"],
            "donor_selected_amount": validated_data["amount"],
            "reason_for_giving": validated_data["reason_for_giving"],
            "honoree": validated_data.get("honoree"),
            "in_memory_of": validated_data.get("in_memory_of"),
            "comp_subscription": validated_data.get("comp_subscription"),
            "swag_opt_out": validated_data.get("swag_opt_out"),
            "swag_choice": validated_data.get("swag_choice"),
            "referer": self.context["request"].META.get("HTTP_REFERER"),
            "revenue_program_id": validated_data["page"].revenue_program.id,
            "sf_campaign_id": validated_data.get("sf_campaign_id"),
        }

    def create_stripe_customer(self, contributor, validated_data):
        """Create a Stripe customer using validated data"""
        return contributor.create_stripe_customer(
            validated_data["page"].revenue_program.stripe_account_id,
            customer_name=f"{validated_data.get('first_name', '')} {validated_data.get('last_name', '')}".strip(),
            phone=validated_data["phone"],
            street=validated_data["mailing_street"],
            city=validated_data["mailing_city"],
            state=validated_data["mailing_state"],
            postal_code=validated_data["mailing_postal_code"],
            country=validated_data["mailing_country"],
            metadata={
                "source": settings.METADATA_SOURCE,
                "schema_version": settings.METADATA_SCHEMA_VERSION,
                "contributor_id": contributor.id,
            },
        )

    def create_contribution(self, contributor, validated_data, bad_actor_response=None):
        """Create an NRE contribution using validated data"""
        contribution_data = {
            "amount": validated_data["amount"],
            "interval": validated_data["interval"],
            "currency": validated_data["page"].revenue_program.payment_provider.currency,
            # TODO: Determine if this requires a different, new 'pre-processing' status
            "status": ContributionStatus.PROCESSING,
            "donation_page": validated_data["page"],
            "contributor": contributor,
            "payment_provider_used": "Stripe",
        }
        if bad_actor_response:
            contribution_data["bad_actor_score"] = bad_actor_response["overall_judgment"]
            contribution_data["bad_actor_response"] = bad_actor_response
            if self.should_flag(contribution_data["bad_actor_score"]):
                contribution_data["status"] = ContributionStatus.FLAGGED
                contribution_data["flagged_date"] = timezone.now()
        return Contribution.objects.create(**contribution_data)


class CreateOneTimePaymentSerializer(BaseCreatePaymentSerializer):
    """Serializer to enable creating a contribution + one time payment"""

    def create(self, validated_data):
        """Create a one-time contribution...

        Plus:
        - Contributor (if not already exist)
        - Get bad actor score based on submitted data
        - Stripe Customer
        - Stripe PaymentIntent

        In success case, this method returns a the client_secret from the Stripe PaymentIntent,
        which is used to initialize the StripeElement in the SPA.

        If the contribution gets flagged after making bad actor API request,
        we raise a PermissionDenied exception, which will signal to the SPA
        that the PaymentElement should not be loaded.

        """
        contributor, _ = Contributor.objects.get_or_create(email=validated_data["email"])
        bad_actor_response = self.get_bad_actor_score(validated_data)
        contribution = self.create_contribution(contributor, validated_data, bad_actor_response)
        if contribution.status == ContributionStatus.FLAGGED:
            # In the case of a flagged contribution, we don't create a Stripe customer or
            # Stripe payment intent, so we raise exception, and leave to SPA to handle accordingly
            raise PermissionDenied("Cannot authorize contribution")
        customer = self.create_stripe_customer(contributor, validated_data)
        try:
            payment_intent = contribution.create_stripe_one_time_payment_intent(
                stripe_customer_id=customer["id"],
                metadata=self.get_stripe_payment_metadata(contributor, validated_data),
            )
        except stripe_errors:
            logger.exception(
                "CreateOneTimePaymentSerializer.create encountered a Stripe error while attempting to create a payment intent for contribution with id %s",
                contribution.id,
            )
            raise GenericPaymentError()
        return {"provider_client_secret_id": payment_intent["client_secret"]}


class CreateRecurringPaymentSerializer(BaseCreatePaymentSerializer):
    """Serializer to enable creating a contribution + recurring payment"""

    interval = serializers.ChoiceField(choices=[ContributionInterval.MONTHLY, ContributionInterval.YEARLY])

    def create(self, validated_data):
        """Create a recurring contribution...

        Plus:
        - Contributor (if not already exist)
        - Get bad actor score based on submitted data
        - Stripe Customer
        - Stripe Subscription

        In success case, this method returns a the client_secret from the Stripe Subcription,
        which is used to initialize the StripeElement in the SPA.

        If the contribution gets flagged after making bad actor API request,
        we raise a PermissionDenied exception, which will signal to the SPA
        that the PaymentElement should not be loaded.
        """
        contributor, _ = Contributor.objects.get_or_create(email=validated_data["email"])
        bad_actor_response = self.get_bad_actor_score(validated_data)
        contribution = self.create_contribution(contributor, validated_data, bad_actor_response)
        if contribution.status == ContributionStatus.FLAGGED:
            # In the case of a flagged contribution, we don't create a Stripe customer or
            # Stripe payment intent, so we raise exception, and leave to SPA to handle accordingly
            raise PermissionDenied("Cannot authorize contribution")
        customer = self.create_stripe_customer(contributor, validated_data)
        try:
            subscription = contribution.create_stripe_subscription(
                stripe_customer_id=customer["id"],
                metadata=self.get_stripe_payment_metadata(contributor, validated_data),
            )
        except stripe_errors:
            logger.exception(
                "RecurringPaymentSerializer.create encountered a Stripe error while attempting to create a subscription for contribution with id %s",
                contribution.id,
            )
            raise GenericPaymentError()
        return {"provider_client_secret_id": subscription.latest_invoice.payment_intent.client_secret}


class StripeOneTimePaymentSerializer(AbstractPaymentSerializer):
    """
    A Stripe one-time payment is a light-weight, low-state payment. It utilizes
    Stripe's PaymentIntent for an ad-hoc contribution.
    """

    payment_method_id = serializers.CharField(max_length=255)


class StripeRecurringPaymentSerializer(AbstractPaymentSerializer):
    """
    A Stripe recurring payment tracks payment information using a Stripe
    PaymentMethod.
    """


class PaymentProviderContributionSerializer(serializers.Serializer):
    """
    Payments provider serializer, payment provider Eg: Stripe.
    """

    # id will be charge object id in our case, which will start with ch_ and doesn't exceed 255 chars
    # https://stripe.com/docs/upgrades#what-changes-does-stripe-consider-to-be-backwards-compatible
    id = serializers.CharField(max_length=255)
    status = serializers.ChoiceField(choices=ContributionStatus.choices)
    card_brand = serializers.ChoiceField(choices=CardBrand.choices, required=False, allow_null=True)
    last4 = serializers.IntegerField()
    payment_type = serializers.ChoiceField(choices=PaymentType.choices, required=False, allow_null=True)
    next_payment_date = serializers.DateTimeField()
    interval = serializers.ChoiceField(choices=ContributionInterval.choices)
    revenue_program = serializers.CharField(max_length=63)
    amount = serializers.IntegerField()
    provider_customer_id = serializers.CharField(max_length=255)
    credit_card_expiration_date = serializers.CharField(max_length=7)
    created = serializers.DateTimeField()
    last_payment_date = serializers.DateTimeField()
