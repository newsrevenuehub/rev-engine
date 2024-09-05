import logging
from datetime import datetime, timedelta

from django.conf import settings
from django.db.models import TextChoices
from django.utils import timezone

import reversion
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, PermissionDenied
from stripe.error import StripeError

from apps.api.error_messages import GENERIC_BLANK, GENERIC_UNEXPECTED_VALUE
from apps.common.utils import get_original_ip_from_request
from apps.contributions.choices import CardBrand, PaymentType
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
    Payment,
)
from apps.contributions.types import StripePaymentMetadataSchemaV1_4
from apps.contributions.utils import format_ambiguous_currency, get_sha256_hash
from apps.organizations.models import PaymentProvider, RevenueProgram
from apps.organizations.serializers import RevenueProgramSerializer
from apps.pages.models import DonationPage

from .bad_actor import BadActorAPIError, make_bad_actor_request
from .fields import StripeAmountField


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
    """Used when organizations are viewing a Contribution."""

    contributor_email = serializers.StringRelatedField(read_only=True, source="contributor")

    auto_accepted_on = serializers.SerializerMethodField()
    formatted_payment_provider_used = serializers.SerializerMethodField()
    provider_payment_url = serializers.SerializerMethodField()
    provider_subscription_url = serializers.SerializerMethodField()
    provider_customer_url = serializers.SerializerMethodField()
    revenue_program = RevenueProgramSerializer(read_only=True)

    def get_auto_accepted_on(self, obj):
        """Note.

        This value is not read when making the actual auto-accept determination, where `flagged_date` is used and the
        math re-calculated. This is just to improve front-end visibility of the "deadline" for examining flagged contributions.
        """
        if obj.flagged_date:
            return obj.flagged_date + timedelta(settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA)

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
        if obj.payment_provider_used == PaymentProvider.STRIPE_LABEL:
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
            "amount",
            "auto_accepted_on",
            "bad_actor_score",
            "contributor_email",
            "created",
            "currency",
            "donation_page_id",
            "flagged_date",
            "formatted_payment_provider_used",
            "id",
            "interval",
            "last_payment_date",
            "provider_customer_url",
            "provider_payment_url",
            "provider_subscription_url",
            "revenue_program",
            "status",
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

    # Contributor info
    first_name = serializers.CharField(max_length=40)
    last_name = serializers.CharField(max_length=80)
    email = serializers.EmailField(max_length=80)
    street = serializers.CharField(max_length=255, required=False, default="", allow_blank=True)
    complement = serializers.CharField(max_length=255, required=False, default="", allow_blank=True)
    city = serializers.CharField(max_length=40, required=False, default="", allow_blank=True)
    state = serializers.CharField(max_length=80, required=False, default="", allow_blank=True)
    country = serializers.CharField(max_length=80, required=False, default="", allow_blank=True)
    zipcode = serializers.CharField(max_length=20, required=False, default="", allow_blank=True)
    country_code = serializers.CharField(max_length=10, required=False, default="", allow_blank=True)

    # Third-party risk assessment
    captcha_token = serializers.CharField(max_length=2550, required=False, allow_blank=True)

    # Request metadata
    ip = serializers.IPAddressField()
    referer = serializers.URLField()

    # Contribution additional
    reason_for_giving = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")

    def to_internal_value(self, data):
        data["street"] = data.get("mailing_street")
        data["complement"] = data.get("mailing_complement")
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
    # but instead we send that info to each contribution page load and pass it back as params;
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

    def convert_amount_to_cents(self, amount):
        """Stripe stores payment amounts in cents."""
        return int(float(amount) * 100)

    def to_internal_value(self, data):
        # Incoming "amount" will be a money-like string, like "12.99".
        # Stripe wants 1299
        amount = data.get("amount")
        if isinstance(amount, str):
            data["amount"] = self.convert_amount_to_cents(data["amount"])
        return super().to_internal_value(data)


class BaseCreatePaymentSerializer(serializers.Serializer):
    """Base serializer for the `CreateOneTimePaymentSerializer` and `CreateRecurringPaymentSerializer`.

    This base serializer contains extensive field level validation and several methods for causing side effects like the
    creation of NRE and Stripe entities.

    NB: This serializer accomodates a handful of fields that are conditionally requirable, meaning that an org can
    configure a contribution page to include/not include and require/not require those fields. In the field definitions
    below, the definitions for `phone`, `reason_for_giving`, and `reason_other` are involved in this logic. These fields
    are unique in that we pass `default=''`. We do this because we want to guarantee that there will always be keys for
    `reason_other`, `reason_for_giving`, and `phone` in the instantiated serializer's initial data, even if those fields
    were not sent in the request data. This allows us to avoid writing code to deal with the case of, say, `phone` is
    conditionally required, but no key/value pair is provided in the request data.

    Additionally, we have default values for "honoree" and "in_memory_of" to guarantee there are keys for those
    parameters to assist in validating `tribute_type`.
    """

    amount = StripeAmountField(
        min_value=REVENGINE_MIN_AMOUNT,
        max_value=STRIPE_MAX_AMOUNT,
        error_messages={
            "max_value": f"We can only accept contributions less than or equal to {format_ambiguous_currency(STRIPE_MAX_AMOUNT)}",
            "min_value": f"We can only accept contributions greater than or equal to {format_ambiguous_currency(REVENGINE_MIN_AMOUNT)}",
        },
        write_only=True,
    )
    interval = serializers.ChoiceField(
        choices=ContributionInterval.choices, default=ContributionInterval.ONE_TIME, write_only=True
    )
    email = serializers.EmailField(max_length=80, write_only=True)
    page = serializers.PrimaryKeyRelatedField(many=False, queryset=DonationPage.objects.all(), write_only=True)
    first_name = serializers.CharField(max_length=40, write_only=True)
    last_name = serializers.CharField(max_length=80, write_only=True)
    # TODO @MariclareHall: handle address structure & validation in a better way.
    # DEV-3440
    mailing_postal_code = serializers.CharField(
        max_length=20, write_only=True, required=False, allow_blank=True, default=""
    )
    mailing_street = serializers.CharField(
        max_length=255, write_only=True, required=False, allow_blank=True, default=""
    )
    mailing_complement = serializers.CharField(
        max_length=255, write_only=True, required=False, allow_blank=True, default=""
    )
    mailing_city = serializers.CharField(max_length=40, write_only=True, required=False, allow_blank=True, default="")
    mailing_state = serializers.CharField(max_length=80, write_only=True, required=False, allow_blank=True, default="")
    mailing_country = serializers.CharField(
        max_length=80, write_only=True, required=False, allow_blank=True, default=""
    )
    agreed_to_pay_fees = serializers.BooleanField(default=False, write_only=True)
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True, write_only=True, default="")
    reason_for_giving = serializers.CharField(
        max_length=255, required=False, allow_blank=True, write_only=True, default=""
    )

    reason_other = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True, default="")
    tribute_type = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True)
    honoree = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True, default="")
    in_memory_of = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True, default="")
    swag_opt_out = serializers.BooleanField(required=False, default=False, write_only=True)
    swag_choices = serializers.CharField(
        max_length=settings.METADATA_MAX_SWAG_CHOICES_LENGTH, required=False, write_only=True, default=""
    )
    comp_subscription = serializers.ChoiceField(
        choices=CompSubscriptions.choices, required=False, allow_blank=True, write_only=True, default=""
    )
    sf_campaign_id = serializers.CharField(
        max_length=255, required=False, allow_blank=True, write_only=True, default=""
    )
    captcha_token = serializers.CharField(max_length=2550, allow_blank=True, write_only=True)
    email_hash = serializers.CharField(read_only=True)
    donor_selected_amount = serializers.FloatField(write_only=True)
    client_secret = serializers.CharField(max_length=255, read_only=True, required=False)
    # This provides a way for the SPA to signal to the server that a contribution has been canceled,
    # without relying on easy-to-guess, integer ID value.
    uuid = serializers.CharField(read_only=True)

    def validate_tribute_type(self, value):
        """Ensure there are no unexpected values for tribute_type."""
        if value and value not in ("type_in_memory_of", "type_honoree"):
            raise serializers.ValidationError(GENERIC_UNEXPECTED_VALUE)
        return value

    def validate_honoree(self, value):
        """If tribute_type is `type_honoree` but no value has been provided for `honoree`, it's invalid."""
        if self.initial_data.get("tribute_type", None) == "type_honoree" and not value:
            raise serializers.ValidationError(GENERIC_BLANK)
        return value

    def validate_in_memory_of(self, value):
        """If tribute_type is `type_in_memory_of` but no value has been provided for `honoree`, it's invalid."""
        if self.initial_data.get("tribute_type", None) == "type_in_memory_of" and not value:
            raise serializers.ValidationError(GENERIC_BLANK)
        return value

    def validate_reason_other(self, value):
        """Guarantee there's a value if `reason_for_giving` is 'Other'."""
        if self.initial_data.get("reason_for_giving") == "Other" and not value:
            raise serializers.ValidationError(GENERIC_BLANK)
        return value

    def resolve_reason_for_giving(self, reason_for_giving, reason_other, preset_reasons):
        """If `reason_for_giving` value is "Other", then we update it to the value for `reason_other` from the form data. Plus...

        We validate that if `reason_for_giving` is not "Other" that it is one of the preset options (if any) on the page. This can't happen
        in the initial field level validation for `reason_for_giving` because we need the value for `data["page]` to be resolved, and that
        will only happen after all field-level validations have run.

        Additionally, if the request data contains `reason_other`, but no value for `reason_for_giving`, we also
        update `reason_for_giving` to the `reason_other` value. This can happen when an org has configured a page
        to ask contributors their reason for giving, but without providing a dropdown of pre-set options. In this case,
        the SPA only sends a value for `reason_other` and `reason_for_giving` will not be a field in the request body.
        """
        if all([reason_for_giving, reason_for_giving != "Other", reason_for_giving not in preset_reasons]):
            raise serializers.ValidationError({"reason_for_giving": GENERIC_UNEXPECTED_VALUE})
        if any(
            [
                reason_for_giving == "Other" and reason_other,
                # Given expected usage by SPA, "" would be the value when the serializer has provided its default value for
                # reason_for_giving because that field was not in the request data. If that happens and the SPA has included
                # `reason_other` as an entry in the request data, that means that the page has configured to require a reason_for_giving,
                # but a dropdown of preset choices has not been configured.
                "reason_for_giving" not in self.initial_data and "reason_other" in self.initial_data and reason_other,
            ]
        ):
            return reason_other
        return reason_for_giving

    def do_conditional_validation(self, data):
        """Handle validation of conditionally requirable fields."""
        errors = {}
        for element in [x for x in data["page"].elements if len(x.get("requiredFields", []))]:
            for field in element["requiredFields"]:
                # if it's blank or none or no key for it in data
                if data.get(field, None) in (None, ""):
                    errors[field] = GENERIC_BLANK
        if errors:
            raise serializers.ValidationError(errors)

    def validate(self, data):
        """Validate any fields whose "is_required" behavior is determined dynamically by the org.

        Some fields are statically (aka, always) required and we can specify that by setting `required=True` on the field definition
        (or by not setting at all, because required is True by default).

        However, RevEngine allows users to configure a subset of fields as required or not required, and that
        can only be known by retrieving the associated contribution page data.

        So in this `validate` method, we find any contribution page elements that are dynamically requirable and ensure that the submitted
        data contains non blank values.


        We also resolve `data["reason_for_giving"]`'s value in case it is "Other". This is not strictly speaking
        validation, but it can only happen after field level validations have run, so this is place in DRF serializer flow
        it should happen. The method we use for this (resolve_reason_for_giving) can result in a validation error in some cases.
        """
        preset_options = next(
            (elem["content"]["reasons"] for elem in data["page"].elements if elem["type"] == "DReason"), []
        )
        data["reason_for_giving"] = self.resolve_reason_for_giving(
            data.get("reason_for_giving"), data.get("reason_other"), preset_options
        )
        self.do_conditional_validation(data)
        return data

    def get_bad_actor_score(self, data):
        """Based on validated data, make a request to bad actor API and return its response."""
        data = data | {
            # we use a PrimaryKeyRelated serializer field for page in BaseCreatePaymentSerializer
            # but BadActorSerializer wants to pk, so we reformat here.
            "page": data["page"].id,
            "referer": self.context["request"].META.get("HTTP_REFERER"),
            "ip": get_original_ip_from_request(self.context["request"]),
        }

        country_code = self.context["request"].headers.get("Cf-Ipcountry", None)
        if country_code:
            data["country_code"] = country_code
        logger.info("BadActorSerializer data: %s", data)
        serializer = BadActorSerializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as exc:
            logger.warning("BadActor serializer raised a ValidationError", exc_info=exc)
            return None
        try:
            return make_bad_actor_request(data).json()
        except BadActorAPIError:
            return None

    def should_reject(self, bad_actor_score):
        """Determine if bad actor score should lead to contribution being rejected."""
        return bad_actor_score == settings.BAD_ACTOR_REJECT_SCORE

    def should_flag(self, bad_actor_score):
        """Determine if bad actor score should lead to contribution being flagged."""
        return bad_actor_score == settings.BAD_ACTOR_FLAG_SCORE

    def build_contribution(self, contributor, validated_data, bad_actor_response=None):
        """Create an NRE contribution using validated data."""
        contribution_data = {
            "amount": validated_data["amount"],
            "interval": validated_data["interval"],
            "currency": validated_data["page"].revenue_program.payment_provider.currency,
            "status": ContributionStatus.PROCESSING,
            "donation_page": validated_data["page"],
            "contributor": contributor,
            "payment_provider_used": PaymentProvider.STRIPE_LABEL,
        }
        if bad_actor_response:
            contribution_data["bad_actor_score"] = bad_actor_response["overall_judgment"]
            contribution_data["bad_actor_response"] = bad_actor_response
            if self.should_reject(contribution_data["bad_actor_score"]):
                contribution_data["status"] = ContributionStatus.REJECTED
            elif self.should_flag(contribution_data["bad_actor_score"]):
                contribution_data["status"] = ContributionStatus.FLAGGED
                contribution_data["flagged_date"] = timezone.now()
        return Contribution(**contribution_data)

    def generate_stripe_metadata(self, contribution: Contribution) -> StripePaymentMetadataSchemaV1_4:
        """Generate Stripe metadata for a contribution based on validated data."""
        logger.info("Generating stripe metadata for contribution %s", contribution.id)
        return StripePaymentMetadataSchemaV1_4(
            agreed_to_pay_fees=self.validated_data["agreed_to_pay_fees"],
            contributor_id=contribution.contributor.id,
            # the `or None` pattern here and below because in validated data, these fields are allowed to be blank, but in
            # the Stripe metadata, we want to send null, not blank.
            # TODO @BW: Coordinate comp_subscription between server and SPA
            # DEV-3827
            comp_subscription=self.validated_data["comp_subscription"] or None,
            donor_selected_amount=self.validated_data["donor_selected_amount"],
            honoree=self.validated_data["honoree"] or None,
            in_memory_of=self.validated_data["in_memory_of"] or None,
            reason_for_giving=self.validated_data["reason_for_giving"] or None,
            referer=self._context["request"].META["HTTP_REFERER"],
            revenue_program_id=self.validated_data["page"].revenue_program.id,
            revenue_program_slug=self.validated_data["page"].revenue_program.slug,
            sf_campaign_id=self.validated_data["sf_campaign_id"] or None,
            swag_choices=self.validated_data["swag_choices"] or None,
            swag_opt_out=self.validated_data["swag_opt_out"],
            source="rev-engine",
            schema_version="1.4",
        )


class CreateOneTimePaymentSerializer(BaseCreatePaymentSerializer):
    """Serializer to enable creating a contribution + one-time payment."""

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
        logger.info("`CreateOneTimePaymentSerializer.create` called with validated data: %s", validated_data)
        contributor, _ = Contributor.objects.get_or_create(email=validated_data["email"])
        bad_actor_response = self.get_bad_actor_score(validated_data)
        contribution = self.build_contribution(contributor, validated_data, bad_actor_response)
        if contribution.status == ContributionStatus.REJECTED:
            logger.info("`CreateOneTimePaymentSerializer.create` is saving a new contribution with REJECTED status")
            contribution.save()
            logger.info(
                "`CreateOneTimePaymentSerializer.create` saved a new contribution with REJECTED status with ID %s",
                contribution.id,
            )
            # In the case of a rejected contribution, we don't create a Stripe customer or
            # Stripe payment intent, so we raise exception, and leave to SPA to handle accordingly
            raise PermissionDenied("Cannot authorize contribution")

        try:
            logger.info("`CreateOneTimePaymentSerializer.create` is attempting to create a Stripe customer")
            customer = contribution.create_stripe_customer(**validated_data, save=False)
            logger.info(
                "`CreateOneTimePaymentSerializer.create` successfully created a Stripe customer with id %s", customer.id
            )
            contribution.provider_customer_id = customer["id"]
        except StripeError:
            logger.info(
                "`CreateOneTimePaymentSerializer.create` is saving a new contribution after encountering a Stripe error"
            )
            contribution.save()
            logger.exception(
                "CreateOneTimePaymentSerializer.create encountered a Stripe error while attempting to create a Stripe"
                " customer for contributor with id %s",
                contributor.id,
            )
            raise GenericPaymentError() from None

        try:
            contribution.contribution_metadata = self.generate_stripe_metadata(contribution).model_dump(mode="json")
        except ValueError:
            logger.exception("Unable to create valid Stripe metadata")
            raise APIException("Cannot authorize contribution") from None

        try:
            logger.info("`CreateOneTimePaymentSerializer.create` is attempting to create a Stripe payment intent")
            payment_intent = contribution.create_stripe_one_time_payment_intent(
                save=False, metadata=contribution.contribution_metadata
            )
            logger.info(
                "`CreateOneTimePaymentSerializer.create` successfully created a Stripe payment intent with id %s",
                payment_intent.id,
            )
        except StripeError:
            logger.exception(
                "CreateOneTimePaymentSerializer.create encountered a Stripe error while attempting to create a payment"
                " intent for contribution with id %s",
                contribution.id,
            )
            logger.info(
                "`CreateOneTimePaymentSerializer.create` is saving a new contribution after encountering a Stripe error"
                " attempting to create a Stripe Payment intent"
            )
            contribution.save()
            logger.info(
                "`CreateOneTimePaymentSerializer.create` created a contribution with id %s",
                contribution.id,
            )
            raise GenericPaymentError() from None

        contribution.provider_payment_id = payment_intent.id
        logger.info("`CreateOneTimePaymentSerializer.create` is saving a new contribution")

        contribution.save()
        logger.info("`CreateOneTimePaymentSerializer.create` saved a new contribution with ID %s", contribution.id)

        return {
            "uuid": str(contribution.uuid),
            "client_secret": payment_intent["client_secret"],
            "email_hash": get_sha256_hash(contributor.email),
        }


class CreateRecurringPaymentSerializer(BaseCreatePaymentSerializer):
    """Serializer to enable creating a contribution + recurring payment."""

    interval = serializers.ChoiceField(
        choices=[ContributionInterval.MONTHLY, ContributionInterval.YEARLY], write_only=True
    )

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
        logger.info("`CreateRecurringPaymentSerializer.create` called with validated data: %s", validated_data)
        contributor, _ = Contributor.objects.get_or_create(email=validated_data["email"])
        bad_actor_response = self.get_bad_actor_score(validated_data)
        logger.info("`CreateRecurringPaymentSerializer.create` is building a contribution")
        contribution = self.build_contribution(contributor, validated_data, bad_actor_response)
        if contribution.status == ContributionStatus.REJECTED:
            logger.info(
                "`CreateRecurringPaymentSerializer.create` is saving a new contribution with REJECTED status for contributor with ID %s",
                contributor.id,
            )
            contribution.save()
            # In the case of a rejected contribution, we don't create a Stripe customer or
            # Stripe payment intent, so we raise exception, and leave to SPA to handle accordingly
            logger.info(
                "`CreateRecurringPaymentSerializer.create` created a new rejected contribution with ID %s",
                contribution.id,
            )
            raise PermissionDenied("Cannot authorize contribution")

        try:
            contribution.contribution_metadata = self.generate_stripe_metadata(contribution).model_dump(mode="json")
        except ValueError:
            logger.exception("Unable to create valid Stripe metadata")
            raise APIException("Cannot authorize contribution") from None

        try:
            logger.info(
                "`CreateRecurringPaymentSerializer.create` is attempting to create a Stripe customer for contributor with ID %s",
                contributor.id,
            )
            customer = contribution.create_stripe_customer(**validated_data)
            logger.info(
                "`CreateRecurringPaymentSerializer.create` successfully created a Stripe customer with ID %s",
                customer.id,
            )
        except StripeError:
            logger.exception(
                "RecurringPaymentSerializer.create encountered a Stripe error while attempting to create a stripe customer"
                " for contributor with id %s",
                contributor.id,
            )
            logger.info(
                "`CreateRecurringPaymentSerializer.create` is saving a new contribution for contributor with ID %s "
                "after encountering an error creating a Stripe customer",
                contributor.id,
            )
            contribution.save()
            logger.info(
                "`CreateRecurringPaymentSerializer.create` created a new contribution with ID %s", contribution.id
            )
            raise GenericPaymentError() from None

        contribution.provider_customer_id = customer.id

        try:
            if contribution.status == ContributionStatus.FLAGGED:
                logger.info("`CreateRecurringPaymentSerializer.create` is attempting to create a Stripe setup intent")
                setup_intent = contribution.create_stripe_setup_intent(metadata=contribution.contribution_metadata)

                contribution.provider_setup_intent_id = setup_intent.id
                client_secret = setup_intent.client_secret

                logger.info(
                    "`CreateRecurringPaymentSerializer.create` successfully created a Stripe setup intent with ID %s"
                    " for contribution with ID %s",
                    setup_intent.id,
                    contribution.id,
                )

            else:
                logger.info(
                    "`CreateRecurringPaymentSerializer.create` is attempting to create a Stripe subscription for contributor with ID %s",
                    contributor.id,
                )
                subscription = contribution.create_stripe_subscription(metadata=contribution.contribution_metadata)

                contribution.provider_subscription_id = subscription.id
                contribution.provider_payment_id = subscription.latest_invoice.payment_intent.id
                client_secret = subscription.latest_invoice.payment_intent.client_secret

                logger.info(
                    "`CreateRecurringPaymentSerializer.create` successfully created a Stripe subscription with ID %s"
                    " for contribution with ID %s",
                    subscription.id,
                    contribution.id,
                )

        except StripeError:
            logger.exception(
                "RecurringPaymentSerializer.create encountered a Stripe error while attempting to create client_secret"
                " for contribution with id %s",
                contribution.id,
            )
            logger.info(
                "`CreateRecurringPaymentSerializer.create` is saving a new contribution for "
                "contributor with ID %s after encountering an error creating a Stripe %s",
                contributor.id,
                "setup intent" if contribution.status == ContributionStatus.FLAGGED else "subscription",
            )
            contribution.save()
            logger.info(
                "`CreateRecurringPaymentSerializer.create` saved a new contribution with ID %s", contribution.id
            )
            raise GenericPaymentError() from None

        logger.info("`CreateRecurringPaymentSerializer.create` is saving a new contribution")
        contribution.save()
        logger.info("`CreateRecurringPaymentSerializer.create` saved a new contribution with ID %s", contribution.id)
        return {
            "uuid": str(contribution.uuid),
            "client_secret": client_secret,
            "email_hash": get_sha256_hash(contributor.email),
        }


class StripeOneTimePaymentSerializer(AbstractPaymentSerializer):
    """A Stripe one-time payment is a light-weight, low-state payment.

    It utilizes Stripe's PaymentIntent for an ad-hoc contribution.
    """


class StripeRecurringPaymentSerializer(AbstractPaymentSerializer):
    """A Stripe recurring payment tracks payment information using a Stripe PaymentMethod."""

    payment_method_id = serializers.CharField(max_length=255)


class PaymentProviderContributionSerializer(serializers.Serializer):
    """Payments provider serializer, payment provider Eg: Stripe."""

    # id will be payment intent object id in our case, which will start with ch_ and doesn't exceed 255 chars
    # https://stripe.com/docs/upgrades#what-changes-does-stripe-consider-to-be-backwards-compatible
    id = serializers.CharField(max_length=255)
    subscription_id = serializers.CharField(
        max_length=255, required=False, allow_blank=True, help_text="Stripe Subscription ID"
    )
    # TODO @DC: remove these two booleans after the frontend is fully using the Subscriptions API
    # DEV-2320
    is_modifiable = serializers.BooleanField(
        required=True, help_text="if recurring then can the payment method be modified"
    )
    is_cancelable = serializers.BooleanField(
        required=True, help_text="if recurring then can the payment method be canceled"
    )
    status = serializers.ChoiceField(choices=ContributionStatus.choices)
    card_brand = serializers.ChoiceField(choices=CardBrand.choices, required=False, allow_null=True)
    last4 = serializers.IntegerField()
    payment_type = serializers.ChoiceField(choices=PaymentType.choices, required=False, allow_null=True)
    interval = serializers.ChoiceField(choices=ContributionInterval.choices)
    revenue_program = serializers.CharField(max_length=63)
    amount = serializers.IntegerField()
    provider_customer_id = serializers.CharField(max_length=255)
    credit_card_expiration_date = serializers.CharField(max_length=7)
    created = serializers.DateTimeField()
    # we allow_null and set default to None because apps.contributions.stripe_contributions_provider.StripePaymentIntent
    # is used for both Stripe payment intents (main use case) and for wrapping Stripe subscriptions
    # that don't have invoices (that is, subscriptions with a future first charge date)
    last_payment_date = serializers.DateTimeField(allow_null=True, default=None)
    stripe_account_id = serializers.CharField(max_length=255, required=False, allow_blank=True)


class SubscriptionsSerializer(serializers.Serializer):
    """Serializer for Stripe Subscriptions."""

    id = serializers.SerializerMethodField()
    is_modifiable = serializers.SerializerMethodField()
    is_cancelable = serializers.SerializerMethodField()
    status = serializers.ChoiceField(choices=ContributionStatus.choices)
    card_brand = serializers.SerializerMethodField()
    last4 = serializers.SerializerMethodField()
    payment_type = serializers.SerializerMethodField()
    next_payment_date = serializers.SerializerMethodField()
    interval = serializers.SerializerMethodField()
    revenue_program_slug = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()
    customer_id = serializers.SerializerMethodField()
    credit_card_expiration_date = serializers.SerializerMethodField()
    created = serializers.SerializerMethodField()
    last_payment_date = serializers.SerializerMethodField()
    stripe_account_id = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def _card(self, instance):
        return instance.default_payment_method.card

    def get_id(self, instance):
        return instance.id

    def get_card_brand(self, instance):
        return self._card(instance).brand

    def get_next_payment_date(self, instance):
        return datetime.fromtimestamp(int(instance.current_period_end), tz=timezone.utc)

    def get_last_payment_date(self, instance):
        return datetime.fromtimestamp(int(instance.current_period_start), tz=timezone.utc)

    def get_created(self, instance):
        return datetime.fromtimestamp(int(instance.created), tz=timezone.utc)

    def get_last4(self, instance):
        return instance.default_payment_method.card.last4

    def get_credit_card_expiration_date(self, instance):
        return (
            f"{self._card(instance).exp_month}/{self._card(instance).exp_year}"
            if self._card(instance).exp_month
            else None
        )

    def get_is_modifiable(self, instance):
        return instance.status not in ["incomplete_expired", "canceled", "unpaid"]

    def get_is_cancelable(self, instance):
        return instance.status not in ["incomplete", "incomplete_expired", "canceled", "unpaid"]

    def get_interval(self, instance):
        plan = instance.get("plan")
        interval = plan.get("interval")
        interval_count = plan.get("interval_count")
        if interval == "year" and interval_count == 1:
            return ContributionInterval.YEARLY
        if interval == "month" and interval_count == 1:
            return ContributionInterval.MONTHLY
        raise serializers.ValidationError(f"Invalid interval: {plan.id}{interval}/{interval_count}")

    def get_revenue_program_slug(self, instance):
        metadata = instance.get("metadata")
        if not metadata or "revenue_program_slug" not in metadata:
            raise serializers.ValidationError(f"Metadata is invalid for subscription: {instance.id}")
        return metadata["revenue_program_slug"]

    def get_amount(self, instance):
        return instance.plan.amount

    def get_customer_id(self, instance):
        return instance.get("customer")

    def get_payment_type(self, instance):
        return instance.default_payment_method.type


PORTAL_CONTRIBUTION_BASE_SERIALIZER_FIELDS = [
    "id",
    "amount",
    "card_brand",
    "card_expiration_date",
    "card_last_4",
    "created",
    "first_payment_date",
    "interval",
    "is_cancelable",
    "is_modifiable",
    "last_payment_date",
    "next_payment_date",
    "payment_type",
    "revenue_program",
    "status",
]


class PortalContributionBaseSerializer(serializers.ModelSerializer):
    card_brand = serializers.CharField(read_only=True, allow_blank=True)
    card_expiration_date = serializers.CharField(read_only=True, allow_blank=True)
    card_last_4 = serializers.CharField(read_only=True, allow_blank=True)
    last_payment_date = serializers.DateTimeField(source="_last_payment_date", read_only=True, allow_null=True)
    next_payment_date = serializers.DateTimeField(read_only=True, allow_null=True)
    first_payment_date = serializers.SerializerMethodField()
    revenue_program = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Contribution
        fields = PORTAL_CONTRIBUTION_BASE_SERIALIZER_FIELDS
        read_only_fields = PORTAL_CONTRIBUTION_BASE_SERIALIZER_FIELDS

    def get_first_payment_date(self, instance) -> datetime:
        first_payment = instance.payment_set.order_by("transaction_time").first()
        return first_payment.transaction_time if first_payment and first_payment.transaction_time else instance.created

    def create(self, validated_data):
        logger.info("create called but not supported. this will be a no-op")
        raise NotImplementedError("create is not supported on this serializer")

    def delete(self, instance):
        logger.info("delete called but not supported. this will be a no-op")
        raise NotImplementedError("delete is not supported on this serializer")

    def update(self, instance, validated_data):
        logger.info("update called but not supported. this will be a no-op")
        raise NotImplementedError("update is not supported on this serializer")


PORTAL_CONTRIBIBUTION_PAYMENT_SERIALIZER_DB_FIELDS = [
    "id",
    "amount_refunded",
    "created",
    "transaction_time",
    "gross_amount_paid",
    "net_amount_paid",
]


class PortalContributionPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = PORTAL_CONTRIBIBUTION_PAYMENT_SERIALIZER_DB_FIELDS
        read_only_fields = PORTAL_CONTRIBIBUTION_PAYMENT_SERIALIZER_DB_FIELDS


PORTAL_CONTRIBUTION_DETAIL_SERIALIZER_DB_FIELDS = [
    *PORTAL_CONTRIBUTION_BASE_SERIALIZER_FIELDS,
    "payments",
    "paid_fees",
    "canceled_at",
    "card_owner_name",
    "stripe_account_id",
]


class PortalContributionDetailSerializer(PortalContributionBaseSerializer):
    card_owner_name = serializers.CharField(read_only=True, allow_blank=True)
    payments = PortalContributionPaymentSerializer(many=True, read_only=True, source="payment_set")
    provider_payment_method_id = serializers.CharField(write_only=True, required=False)
    amount = serializers.IntegerField(
        required=False,
        min_value=REVENGINE_MIN_AMOUNT,
        max_value=STRIPE_MAX_AMOUNT,
        error_messages={
            "max_value": f"We can only accept contributions less than or equal to {format_ambiguous_currency(STRIPE_MAX_AMOUNT)}",
            "min_value": f"We can only accept contributions greater than or equal to {format_ambiguous_currency(REVENGINE_MIN_AMOUNT)}",
        },
    )

    class Meta:
        model = Contribution
        fields = [*PORTAL_CONTRIBUTION_DETAIL_SERIALIZER_DB_FIELDS, "provider_payment_method_id"]
        read_only_fields = PORTAL_CONTRIBUTION_DETAIL_SERIALIZER_DB_FIELDS

    def update(self, instance: Contribution, validated_data) -> Contribution:
        if validated_data:
            if provider_payment_method_id := validated_data.get("provider_payment_method_id", None):
                instance.update_payment_method_for_subscription(
                    provider_payment_method_id=provider_payment_method_id,
                )
            if amount := validated_data.get("amount", None):
                instance.update_subscription_amount(
                    amount=amount,
                )
            for key, value in validated_data.items():
                setattr(instance, key, value)
            with reversion.create_revision():
                instance.save(update_fields={*validated_data.keys(), "modified"})
                reversion.set_comment("Updated by PortalContributionDetailSerializer.update")
        return instance


class PortalContributionListSerializer(PortalContributionBaseSerializer):
    class Meta:
        model = Contribution
        fields = PORTAL_CONTRIBUTION_BASE_SERIALIZER_FIELDS
        read_only_fields = PORTAL_CONTRIBUTION_BASE_SERIALIZER_FIELDS


class SwitchboardContributionSerializer(serializers.ModelSerializer):
    revenue_program = serializers.PrimaryKeyRelatedField(
        queryset=RevenueProgram.objects.all(), source="_revenue_program"
    )

    class Meta:
        model = Contribution
        fields = ["revenue_program", "id"]
        read_only_fields = ["id"]

    def update(self, instance, validated_data):
        """Update the revenue program of a contribution.

        Here, if _revenue_program is being set and instance currently has donation_page set,
        we also set donation_page to None because of our constraint on the model.

        Note that at present we only allow updpating the ._revenue_program field of a contribution. If this changes in future
        this update override will need to be modified accordingly.
        """
        logger.debug("Updating contribution %s with validated data %s", instance, validated_data)
        if (rp := validated_data.pop("_revenue_program", None)) and instance._revenue_program != rp:
            update_fields = {"modified", "_revenue_program"}
            instance._revenue_program = rp
            if instance.donation_page:
                instance.donation_page = None
                update_fields.add("donation_page")
            with reversion.create_revision():
                instance.save(update_fields=update_fields)
                reversion.set_comment("Updated by SwitchboardContributionSerializer.update")
        return instance

    def validate_revenue_program(self, value: RevenueProgram) -> None:
        """Ensure that the revenue program being set is from the same organization as the current revenue program.

        Note that the actual model attribute here is `._revenue_program`.
        """
        logger.debug("Validating revenue program %s", value)
        if (rp := self.instance.revenue_program) and rp.organization != value.organization:
            raise serializers.ValidationError(
                "Cannot assign contribution to a revenue program from a different organization",
                code=status.HTTP_400_BAD_REQUEST,
            )
        return value
