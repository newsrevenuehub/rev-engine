import logging
from datetime import timedelta
from enum import Enum
from typing import Literal

from django.conf import settings
from django.db.models import TextChoices
from django.utils import timezone

import reversion
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, PermissionDenied
from stripe.error import StripeError

from apps.api.error_messages import GENERIC_BLANK, GENERIC_UNEXPECTED_VALUE
from apps.common.utils import get_original_ip_from_request
from apps.contributions.bad_actor import BadActorOverallScore
from apps.contributions.choices import BadActorAction
from apps.contributions.exceptions import InvalidMetadataError
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
    Payment,
)
from apps.contributions.typings import StripePaymentMetadataSchemaV1_4, validate_stripe_metadata
from apps.contributions.utils import format_ambiguous_currency, get_sha256_hash
from apps.organizations.models import PaymentProvider, RevenueProgram
from apps.organizations.serializers import RevenueProgramSerializer
from apps.pages.models import DonationPage

from .bad_actor import BadActorAPIError, get_bad_actor_score
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
    first_payment_date = serializers.DateTimeField()
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
            "first_payment_date",
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
    action = serializers.ChoiceField(choices=BadActorAction.choices, required=False, default="", allow_blank=True)
    org = serializers.CharField(max_length=255, required=False, default="", allow_blank=True)
    street = serializers.CharField(max_length=255, required=False, default="", allow_blank=True)
    complement = serializers.CharField(max_length=255, required=False, default="", allow_blank=True)
    city = serializers.CharField(
        max_length=40,
        required=False,
        default="",
        allow_blank=True,
    )
    state = serializers.CharField(
        max_length=80,
        required=False,
        default="",
        allow_blank=True,
    )
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
    below, the definitions for `phone` is involved in this logic. These fields are unique in that we pass `default=''`.
    We do this because we want to guarantee that there will always be keys for `phone` in the instantiated serializer's
    initial data, even if those fields were not sent in the request data. This allows us to avoid writing code to deal
    with the case of, say, `phone` is conditionally required, but no key/value pair is provided in the request data.

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
    mc_campaign_id = serializers.CharField(
        max_length=255, required=False, allow_blank=True, write_only=True, default=""
    )
    captcha_token = serializers.CharField(max_length=2550, allow_blank=True, write_only=True, default="")
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

    def validate(self, data):
        """Validate any fields whose "is_required" behavior is determined dynamically by the org.

        Some fields are statically (aka, always) required and we can specify that by setting `required=True` on the field definition
        (or by not setting at all, because required is True by default).

        However, RevEngine allows users to configure a subset of fields as required or not required, and that
        can only be known by retrieving the associated contribution page data.

        So in this `validate` method, we find any contribution page elements that are dynamically requirable and ensure that the submitted
        data contains non blank values.
        """
        errors = {}
        for element in (x for x in data["page"].elements if x.get("requiredFields")):
            if required_missing_value := next(
                (field for field in element["requiredFields"] if data.get(field) in (None, "")), None
            ):
                errors[required_missing_value] = GENERIC_BLANK
        if errors:
            raise serializers.ValidationError(errors)
        return data

    def get_bad_actor_score(self, data, action: BadActorAction) -> BadActorOverallScore | None:
        """Based on validated data, make a request to bad actor API and return its response.

        Note that this method is meant to be ironclad against exceptions. If anything goes wrong, it should return None.
        """
        try:
            serializer_data = {
                "amount": data["amount"],
                "first_name": data["first_name"],
                "last_name": data["last_name"],
                "email": data["email"],
                "action": action,
                "org": data["page"].organization.id,
                "street": data["mailing_street"],
                "complement": data["mailing_complement"],
                "city": data["mailing_city"],
                "state": data["mailing_state"],
                "country": data["mailing_country"],
                "zipcode": data["mailing_postal_code"],
                "captcha_token": data["captcha_token"],
                "ip": get_original_ip_from_request(self.context["request"]),
                "referer": self.context["request"].META.get("HTTP_REFERER"),
                "reason_for_giving": data["reason_for_giving"],
                "page": data["page"].id,
            }
            if country_code := self.context["request"].headers.get("Cf-Ipcountry", None):
                serializer_data["country_code"] = country_code
            logger.info("BadActorSerializer data: %s", serializer_data)
            serializer = BadActorSerializer(data=serializer_data)
            serializer.is_valid(raise_exception=True)
            return get_bad_actor_score(serializer.validated_data)
        except serializers.ValidationError as exc:
            logger.warning(
                "BadActor serializer raised a ValidationError. `data` passed to func was %s\n data passed to `get_bad_actor_score` was %s ",
                data,
                serializer_data,
                exc_info=exc,
            )
            return None
        except BadActorAPIError:
            logger.exception("BadActor API request failed communicating with API")
            return None
        except Exception:
            logger.exception("Something unexpected happened trying to get bad actor sore")
            return None

    def should_reject(self, bad_actor_score):
        """Determine if bad actor score should lead to contribution being rejected."""
        return bad_actor_score == settings.BAD_ACTOR_REJECT_SCORE

    def should_flag(self, bad_actor_score):
        """Determine if bad actor score should lead to contribution being flagged."""
        return bad_actor_score == settings.BAD_ACTOR_FLAG_SCORE

    def build_contribution(
        self, contributor: Contributor, validated_data: dict, bad_actor_response: BadActorOverallScore | None
    ):
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
            contribution_data["bad_actor_score"] = bad_actor_response.overall_judgment
            contribution_data["bad_actor_response"] = bad_actor_response.dict()
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
            mc_campaign_id=self.validated_data["mc_campaign_id"] or None,
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
        contributor, _ = Contributor.get_or_create_contributor_by_email(validated_data["email"])
        contribution = self.build_contribution(
            contributor,
            validated_data,
            self.get_bad_actor_score(validated_data, action=BadActorAction.CONTRIBUTION.value),
        )
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
        contributor, _ = Contributor.get_or_create_contributor_by_email(validated_data["email"])
        logger.info("`CreateRecurringPaymentSerializer.create` is building a contribution")
        contribution = self.build_contribution(
            contributor,
            validated_data,
            self.get_bad_actor_score(validated_data, action=BadActorAction.CONTRIBUTION.value),
        )
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
    first_payment_date = serializers.DateTimeField()
    last_payment_date = serializers.DateTimeField(source="_last_payment_date", read_only=True, allow_null=True)
    next_payment_date = serializers.DateTimeField(read_only=True, allow_null=True)
    revenue_program = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Contribution
        fields = PORTAL_CONTRIBUTION_BASE_SERIALIZER_FIELDS
        read_only_fields = PORTAL_CONTRIBUTION_BASE_SERIALIZER_FIELDS

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
    "status",
]

PAYMENT_PAID = "paid"
PAYMENT_REFUNDED = "refunded"


class PortalContributionPaymentSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Payment
        fields = PORTAL_CONTRIBIBUTION_PAYMENT_SERIALIZER_DB_FIELDS
        read_only_fields = PORTAL_CONTRIBIBUTION_PAYMENT_SERIALIZER_DB_FIELDS

    @staticmethod
    def get_status(payment: Payment) -> Literal["paid", "refunded"]:
        # If the amount refunded is 0, then the payment status is "paid", otherwise it is "refunded"
        return PAYMENT_PAID if payment.amount_refunded == 0 else PAYMENT_REFUNDED


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
    # Note that amount is int cents, not float dollars.
    amount = serializers.IntegerField(
        required=False,
        min_value=REVENGINE_MIN_AMOUNT,
        max_value=STRIPE_MAX_AMOUNT,
        error_messages={
            "max_value": f"We can only accept contributions less than or equal to {format_ambiguous_currency(STRIPE_MAX_AMOUNT)}",
            "min_value": f"We can only accept contributions greater than or equal to {format_ambiguous_currency(REVENGINE_MIN_AMOUNT)}",
        },
    )
    # Note that donor_selected_amount is float dollars, not int cents. This
    # value is persisted in Stripe as a string.
    donor_selected_amount = serializers.FloatField(
        required=False,
        min_value=REVENGINE_MIN_AMOUNT / 100,
        max_value=STRIPE_MAX_AMOUNT / 100,
        error_messages={
            "max_value": f"We can only accept contributions less than or equal to {format_ambiguous_currency(STRIPE_MAX_AMOUNT)}",
            "min_value": f"We can only accept contributions greater than or equal to {format_ambiguous_currency(REVENGINE_MIN_AMOUNT)}",
        },
        write_only=True,
    )

    class Meta:
        model = Contribution
        fields = [
            *PORTAL_CONTRIBUTION_DETAIL_SERIALIZER_DB_FIELDS,
            "donor_selected_amount",
            "provider_payment_method_id",
        ]
        read_only_fields = PORTAL_CONTRIBUTION_DETAIL_SERIALIZER_DB_FIELDS

    def update(self, instance: Contribution, validated_data) -> Contribution:
        if validated_data:
            if provider_payment_method_id := validated_data.get("provider_payment_method_id", None):
                instance.update_payment_method_for_subscription(
                    provider_payment_method_id=provider_payment_method_id,
                )
            # Need to pop donor_selected_amount so it doesn't get sent when saving changes.
            donor_selected_amount = validated_data.pop("donor_selected_amount", None)

            if amount := validated_data.get("amount", None):
                if not donor_selected_amount:
                    # amount and donor_selected_amount should always be set in tandem in real life thanks to validate(),
                    # but we want to be certain.
                    raise serializers.ValidationError(
                        "If amount is updated, donor_selected_amount must be set as well."
                    )
                instance.update_subscription_amount(amount=amount, donor_selected_amount=donor_selected_amount)
            for key, value in validated_data.items():
                setattr(instance, key, value)
            with reversion.create_revision():
                instance.save(update_fields={*validated_data.keys(), "modified"})
                reversion.set_comment("Updated by PortalContributionDetailSerializer.update")
        return instance

    def validate(self, data):
        data = super().validate(data)
        self.validate_amount_and_donor_selected_amount(data)
        return data

    def validate_amount_and_donor_selected_amount(self, data):
        if "amount" in data and "donor_selected_amount" not in data:
            raise serializers.ValidationError(
                {"amount": "If this field is updated, donor_selected_amount must be provided as well."}
            )
        if "donor_selected_amount" in data and "amount" not in data:
            raise serializers.ValidationError(
                {"donor_selected_amount": "If this field is updated, amount must be provided as well."}
            )


class PortalContributionListSerializer(PortalContributionBaseSerializer):
    class Meta:
        model = Contribution
        fields = PORTAL_CONTRIBUTION_BASE_SERIALIZER_FIELDS
        read_only_fields = PORTAL_CONTRIBUTION_BASE_SERIALIZER_FIELDS


class SwitchboardContributionRevenueProgramSourceValues(str, Enum):
    VIA_PAGE = "via_page"
    DIRECT = "direct"


class SwitchboardContributionSerializer(serializers.ModelSerializer):
    revenue_program = serializers.PrimaryKeyRelatedField(
        queryset=RevenueProgram.objects.all(),
        required=False,
        allow_null=True,
    )
    revenue_program_source = serializers.SerializerMethodField(read_only=True)
    # TODO @BW: Remove this once Contribution.contributor is non-nullable
    # DEV-5953
    contributor = serializers.PrimaryKeyRelatedField(queryset=Contributor.objects.all(), allow_null=False)

    class Meta:
        model = Contribution
        fields = [
            "amount",
            "contribution_metadata",
            "contributor",
            "currency",
            "donation_page",
            "id",
            "interval",
            "last_payment_date",
            "payment_provider_used",
            "provider_customer_id",
            "provider_payment_id",
            "provider_payment_method_details",
            "provider_payment_method_id",
            "provider_setup_intent_id",
            "provider_subscription_id",
            "revenue_program",
            "revenue_program_source",
            "status",
            # TODO @BW: Add "quarantine_status" after it is added to the model
            # https://news-revenue-hub.atlassian.net/browse/DEV-5696
        ]
        read_only_fields = [
            "id",
            "last_payment_date",
        ]

    def get_revenue_program_source(
        self, instance: Contribution
    ) -> SwitchboardContributionRevenueProgramSourceValues | None:
        if not instance._revenue_program and not instance.donation_page:
            logger.warning("Method called on instance with no revenue program or donation page: %s", instance)
            return None
        if instance._revenue_program:
            return SwitchboardContributionRevenueProgramSourceValues.DIRECT
        return SwitchboardContributionRevenueProgramSourceValues.VIA_PAGE

    def validate_contribution_metadata(self, value: dict) -> dict:
        """Ensure that the contribution metadata is a valid JSON object."""
        try:
            validate_stripe_metadata(value)
        except InvalidMetadataError as exc:
            raise serializers.ValidationError(
                "does not conform to a known schema", code=status.HTTP_400_BAD_REQUEST
            ) from exc
        return value

    def validate_revenue_program(self, value: RevenueProgram) -> RevenueProgram:
        """Ensure that the revenue program being set is from the same organization as the current revenue program.

        Note that the actual model attribute here is `._revenue_program`.
        """
        logger.debug("Validating revenue program %s", value)
        if self.instance and (rp := self.instance.revenue_program) and rp.organization != value.organization:
            raise serializers.ValidationError(
                "Cannot assign contribution to a revenue program from a different organization",
                code=status.HTTP_400_BAD_REQUEST,
            )
        return value

    # TODO @BW: Add validation to ensure provider_customer_id is set if send_receipt is true in request context
    # DEV-5961
    def validate(self, data):
        """Ensure that either a revenue program or a donation page is set on the contribution, but not both."""
        data = super().validate(data)
        resulting_state = data
        if self.instance:
            resulting_state = {
                "donation_page": self.instance.donation_page,
                "revenue_program": self.instance._revenue_program,
                **data,
            }
        if resulting_state.get("revenue_program") and resulting_state.get("donation_page"):
            raise serializers.ValidationError(
                "Cannot set both revenue_program and donation_page on a contribution",
                code=status.HTTP_400_BAD_REQUEST,
            )
        if not (resulting_state.get("revenue_program") or resulting_state.get("donation_page")):
            raise serializers.ValidationError(
                "Must set either revenue_program or donation_page on a contribution",
                code=status.HTTP_400_BAD_REQUEST,
            )
        return data


class SwitchboardContributorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contributor
        fields = ["id", "email"]
        read_only_fields = ["id"]


class SwitchboardPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "contribution",
            "net_amount_paid",
            "gross_amount_paid",
            "amount_refunded",
            "stripe_balance_transaction_id",
            "transaction_time",
        ]
        read_only_fields = ["id"]

    def validate(self, data):
        amount_refunded = data.get("amount_refunded", 0)
        net_amount_paid = data.get("net_amount_paid", 0)
        gross_amount_paid = data.get("gross_amount_paid", 0)

        if amount_refunded > 0 and (net_amount_paid > 0 or gross_amount_paid > 0):
            raise serializers.ValidationError(
                "Amount refunded cannot be positive when net_amount_paid or gross_amount_paid are positive"
            )
        return data

    def validate_net_amount_paid(self, value):
        self._validate_amount_is_positive(value)
        return value

    def validate_gross_amount_paid(self, value):
        self._validate_amount_is_positive(value)
        return value

    @staticmethod
    def _validate_amount_is_positive(value):
        if value < 0:
            raise serializers.ValidationError("Amount must be positive")
