from django.conf import settings
from django.db.models import TextChoices

from rest_framework import serializers

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


class ContributorContributionSerializer(serializers.ModelSerializer):
    """
    A paired-down, read-only version of a Contribution serializer
    """

    status = serializers.SerializerMethodField()
    card_brand = serializers.SerializerMethodField()
    last4 = serializers.SerializerMethodField()
    stripe_id = serializers.SerializerMethodField()

    def get_status(self, obj):
        if obj.status and obj.status in (
            ContributionStatus.FAILED,
            ContributionStatus.FLAGGED,
            ContributionStatus.REJECTED,
        ):
            return ContributionStatus.FAILED
        return obj.status

    def _get_card_details(self, obj):
        if obj.provider_payment_method_details:
            return obj.provider_payment_method_details.get("card", None)

    def get_card_brand(self, obj):
        if card := self._get_card_details(obj):
            return card["brand"]

    def get_last4(self, obj):
        if card := self._get_card_details(obj):
            return card["last4"]

    def get_stripe_id(self, obj):
        return obj.stripe_account_id or ""

    class Meta:
        model = Contribution
        fields = [
            "id",
            "created",
            "interval",
            "status",
            "card_brand",
            "last4",
            "provider_customer_id",
            "stripe_id",
            "amount",
            "last_payment_date",
        ]
        read_only_fields = fields


class ContributorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contributor
        fields = "__all__"


class CompSubscriptions(TextChoices):
    NYT = "nyt", "nyt"


class ConditionalRequirementsSerializerMixin(serializers.Serializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._update_field_properties_from_page_elements()

    def _update_field_properties_from_page_elements(self):
        page = DonationPage.objects.get(pk=self.initial_data["page_id"])
        self._set_conditionally_required_fields(page.elements)

    def _set_conditionally_required_fields(self, page_elements):
        """
        Elements may define a "requiredFields" key, which is a list of field names that may not be blank or absent when submitting a donation.
        """
        # Get list of lists of required fields
        required_fields = [element.get("requiredFields", []) for element in page_elements]
        # Flatten to single list of required fields
        required_fields = [item for fieldsList in required_fields for item in fieldsList]
        # For every required field, update the field definition
        for required_field in required_fields:
            if required_field in self.fields:
                self.fields[required_field].required = True
                self.fields[required_field].allow_blank = False


class ContributionMetadataSerializer(ConditionalRequirementsSerializerMixin):
    """
    payment_managers use this serializer to key incoming contribution data to the expected metadata key.
    The metadata is then added to the metadata field for the appropriate Stripe object. ProcessorObjects
    defines options for Stripe Objects.

    The validation on these fields is important and represents downstream requirements.
    """

    source = serializers.CharField(max_length=100, default=settings.METADATA_SOURCE)
    schema_version = serializers.CharField(max_length=12, default=settings.METADATA_SCHEMA_VERSION)

    contributor_id = serializers.IntegerField(required=False)
    first_name = serializers.CharField(max_length=40)
    last_name = serializers.CharField(max_length=80)

    mailing_postal_code = serializers.CharField(max_length=20)
    mailing_street = serializers.CharField(max_length=255)
    mailing_city = serializers.CharField(max_length=40)
    mailing_state = serializers.CharField(max_length=80)
    mailing_country = serializers.CharField(max_length=80)
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True)

    agreed_to_pay_fees = serializers.BooleanField(default=False)
    donor_selected_amount = serializers.CharField(max_length=255)

    # Reason for Giving
    reason_for_giving = serializers.CharField(max_length=255, required=False, allow_blank=True)
    reason_other = serializers.CharField(max_length=255, required=False, allow_blank=True)
    tribute_type = serializers.CharField(max_length=255, required=False, allow_blank=True)
    honoree = serializers.CharField(max_length=255, required=False, allow_blank=True)
    in_memory_of = serializers.CharField(max_length=255, required=False, allow_blank=True)

    # Swag
    swag_opt_out = serializers.BooleanField(default=False)
    comp_subscription = serializers.ChoiceField(choices=CompSubscriptions.choices, required=False, allow_blank=True)
    t_shirt_size = serializers.CharField(max_length=500, required=False, allow_blank=True)

    sf_campaign_id = serializers.CharField(max_length=255, required=False, allow_blank=True)
    referer = serializers.URLField()
    revenue_program_id = serializers.IntegerField()
    revenue_program_slug = serializers.SlugField()

    PAYMENT = "PAYMENT"
    CUSTOMER = "CUSTOMER"
    ALL = "ALL"

    PROCESSOR_MAPPING = {
        "source": ALL,
        "schema_version": ALL,
        "contributor_id": ALL,
        "first_name": CUSTOMER,
        "last_name": CUSTOMER,
        "mailing_postal_code": CUSTOMER,
        "mailing_street": CUSTOMER,
        "mailing_city": CUSTOMER,
        "mailing_state": CUSTOMER,
        "mailing_country": CUSTOMER,
        "phone": CUSTOMER,
        "agreed_to_pay_fees": PAYMENT,
        "donor_selected_amount": PAYMENT,
        "reason_for_giving": PAYMENT,
        "honoree": PAYMENT,
        "in_memory_of": PAYMENT,
        "comp_subscription": PAYMENT,
        "swag_opt_out": PAYMENT,
        "t_shirt_size": PAYMENT,
        "referer": PAYMENT,
        "revenue_program_id": PAYMENT,
        "revenue_program_slug": PAYMENT,
        "sf_campaign_id": PAYMENT,
    }

    SWAG_CHOICE_KEY_PREFIX = "swag_choice"

    def _get_option_name_from_swag_key(self, key):
        return key.split(f"{self.SWAG_CHOICE_KEY_PREFIX}_")[1]

    def _get_swag_choices(self, data):
        return [
            (self._get_option_name_from_swag_key(key), data[key])
            for key in data
            if self.SWAG_CHOICE_KEY_PREFIX in key.lower()
        ]

    def _parse_pi_data_for_swag_options(self, data):
        swag_choices = self._get_swag_choices(data)
        # For now, comp_subscription is a special field that only applies to NYT subscriptions.
        # This is hopefully an edge case we can remove entirely when it gets handled in a different way.
        if data.get("comp_subscription"):
            data["comp_subscription"] = "nyt"
        if swag_choices:
            # For now, we only accept one and we force it in to "t_shirt_size"
            data["t_shirt_size"] = f"{swag_choices[0][0]} -- {swag_choices[0][1]}"

    def _parse_reason_other(self, data):
        """
        If "reason_other" has a value, it should be renamed "reason_for_giving"
        """
        if reason_other := data.get("reason_other"):
            data["reason_for_giving"] = reason_other

    def to_internal_value(self, data):
        self._parse_reason_other(data)
        self._parse_pi_data_for_swag_options(data)
        return super().to_internal_value(data)

    def _validate_reason_for_giving(self, data):
        """
        If 'reason_for_giving' is "Other", then 'reason_other' may not be blank.
        """
        if data.get("reason_for_giving") == "Other" and not data.get("reason_other"):
            self._errors.update({"reason_other": GENERIC_BLANK})

    def _validate_tribute(self, data):
        """
        If 'tribute_type' is "type_honoree", then 'honoree' field may not be blank.
        If 'tribute_type' is "type_in_memory_of", then 'in_memory_of' field may not be blank.
        """
        if data.get("tribute_type") == "type_honoree" and not data.get("honoree"):
            self._errors.update({"honoree": GENERIC_BLANK})

        if data.get("tribute_type") == "type_in_memory_of" and not data.get("in_memory_of"):
            self._errors.update({"in_memory_of": GENERIC_BLANK})

    def is_valid(self, raise_exception=False, **kwargs):
        is_valid = super().is_valid(raise_exception, **kwargs)
        self._validate_reason_for_giving(self.initial_data)
        self._validate_tribute(self.initial_data)

        if self._errors and raise_exception:
            raise serializers.ValidationError(self.errors)

        return not bool(self._errors) and is_valid

    def validate_secondary_metadata(self, secondary_metadata):
        """
        Validation for values not present at the time of original validation. Generally, these values must be derived from
        values created after that initial validation. contributor_id is the only example of this so far.
        """
        assert hasattr(
            self, "_validated_data"
        ), "Cannot call `.validate_secondary_metadata()` without first calling `.is_valid()`"
        # "Reset" data to validate
        self.initial_data = secondary_metadata
        # "Reset" validation
        delattr(self, "_validated_data")
        # Set secondary validation rules
        self.fields["contributor_id"].required = True
        # Re-run validation
        return self.is_valid(raise_exception=True)

    def _should_include_metadata(self, k, v, processor_obj):
        """
        Include metadata in bundle if:
        value is not blank,
        metadata key is in "All",
        metadata key is in target "processor_obj"
        """
        includes_all = self.PROCESSOR_MAPPING.get(k) == self.ALL
        includes_process_obj = self.PROCESSOR_MAPPING.get(k) == processor_obj
        return v != "" and (includes_all or includes_process_obj)

    def bundle_metadata(self, processor_obj):
        """
        Validating the data first is important. Downstream applications have their own requirements and limits for these values, so skipping validation will break those integrations. Luckily, inheriting from serializers.Serializer gives us this check for free.
        Here we use the PROCESSOR_MAPPING property of this serializer to get the appropriate metadata based on the reported processor_obj, plus "All"
        """
        return {k: v for k, v in self.data.items() if self._should_include_metadata(k, v, processor_obj)}


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
    reason_for_giving = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def to_internal_value(self, data):
        data["street"] = data.get("mailing_street")
        data["city"] = data.get("mailing_city")
        data["state"] = data.get("mailing_state")
        data["zipcode"] = data.get("mailing_postal_code")
        data["country"] = data.get("mailing_country")
        data["reason"] = data.get("reason_for_giving")
        return super().to_internal_value(data)


class AbstractPaymentSerializer(ConditionalRequirementsSerializerMixin):
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
    # organization_country tand currency are a different pattern, but important here.
    # They could be derived from the organization that this contribution is tied to,
    # but instead we send that info to each donation page load and pass it back as params;
    # that way we are certain that the currency and country used by payment provider in the
    # form is the one we use here.
    organization_country = serializers.CharField(max_length=2, required=True)
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


class StripeOneTimePaymentSerializer(AbstractPaymentSerializer):
    """
    A Stripe one-time payment is a light-weight, low-state payment. It utilizes
    Stripe's PaymentIntent for an ad-hoc contribution.
    """


class StripeRecurringPaymentSerializer(AbstractPaymentSerializer):
    """
    A Stripe recurring payment tracks payment information using a Stripe
    PaymentMethod.
    """

    payment_method_id = serializers.CharField(max_length=255)


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
