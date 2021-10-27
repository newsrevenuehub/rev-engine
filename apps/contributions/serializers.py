from django.conf import settings

from rest_framework import serializers

from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionMetadata,
    ContributionStatus,
    Contributor,
)
from apps.contributions.utils import format_ambiguous_currency
from apps.pages.models import DonationPage


# See https://stripe.com/docs/api/payment_intents/object#payment_intent_object-amount
# Stripe allows a maximum of eight digits here
STRIPE_MAX_AMOUNT = 99999999

# Revengine has its own restrictions (greater than Stripe's restrictions) on the min amount.
# Remember that 100 here is $1.00
REVENGINE_MIN_AMOUNT = 100


class ContributionMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContributionMetadata
        fields = ["key", "label", "additional_help_text", "metadata_type", "donor_supplied"]
        read_only_fields = fields


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
        ]


class ContributorContributionSerializer(serializers.ModelSerializer):
    """
    A paired-down, read-only version of a Contribution serializer
    """

    status = serializers.SerializerMethodField()
    card_brand = serializers.SerializerMethodField()
    last4 = serializers.SerializerMethodField()
    org_stripe_id = serializers.SerializerMethodField()

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

    def get_org_stripe_id(self, obj):
        return obj.organization.stripe_account_id

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
            "org_stripe_id",
            "amount",
            "last_payment_date",
        ]
        read_only_fields = fields


class ContributorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contributor
        fields = "__all__"


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

    # organization_country tand currency are a different pattern, but important here.
    # They could be derived from the organization that this contribution is tied to,
    # but instead we send that info to each donation page load and pass it back as params;
    # that way we are certain that the currency and country used by payment provider in the
    # form is the one we use here.
    organization_country = serializers.CharField(max_length=2, required=True)
    currency = serializers.CharField(max_length=3, required=True)

    # DonorInfo
    first_name = serializers.CharField(max_length=40)
    last_name = serializers.CharField(max_length=80)
    email = serializers.EmailField(max_length=80)

    # DonorAddress
    mailing_postal_code = serializers.CharField(max_length=20)
    mailing_street = serializers.CharField(max_length=255)
    mailing_city = serializers.CharField(max_length=40)
    mailing_state = serializers.CharField(max_length=80)
    mailing_country = serializers.CharField(max_length=80)

    # Params/Pass-through
    sf_campaign_id = serializers.CharField(max_length=255, required=False, allow_blank=True)
    captcha_token = serializers.CharField(max_length=2550, required=False, allow_blank=True)

    # Tribute/Reason for Giving
    reason_for_giving = serializers.CharField(max_length=255, required=False, allow_blank=True)
    reason_other = serializers.CharField(max_length=255, required=False, allow_blank=True)

    tribute_type = serializers.CharField(max_length=255, required=False, allow_blank=True)
    honoree = serializers.CharField(max_length=255, required=False, allow_blank=True)
    in_memory_of = serializers.CharField(max_length=255, required=False, allow_blank=True)

    # Request metadata
    ip = serializers.IPAddressField()
    referer = serializers.URLField()

    # These are used to attach the contribution to the right organization,
    # and associate it with the page it came from.
    revenue_program_slug = serializers.SlugField()
    donation_page_slug = serializers.SlugField(required=False, allow_blank=True)

    # Page id is a nice shortcut
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
        amount = data.get("amount")
        if isinstance(amount, str):
            data["amount"] = self.convert_amount_to_cents(data["amount"])
        return super().to_internal_value(data)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["amount"].error_messages["invalid"] = "Enter a valid amount"
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
            self.fields[required_field].required = True
            self.fields[required_field].allow_blank = False

    def _validate_reason_for_giving(self, data):
        """
        If 'reason_for_giving' is "Other", then 'reason_other' may not be blank.
        """
        if data.get("reason_for_giving") == "Other" and not data.get("reason_other"):
            raise serializers.ValidationError({"reason_other": "This field may not be blank"})

    def _validate_tribute(self, data):
        """
        If 'tribute_type' is "type_honoree", then 'honoree' field may not be blank.
        If 'tribute_type' is "type_in_memory_of", then 'in_memory_of' field may not be blank.
        """
        if data.get("tribute_type") == "type_honoree" and not data.get("honoree"):
            raise serializers.ValidationError({"honoree": "This field may not be blank"})

        if data.get("tribute_type") == "type_in_memory_of" and not data.get("in_memory_of"):
            raise serializers.ValidationError({"in_memory_of": "This field may not be blank"})

    def validate(self, data):
        self._validate_reason_for_giving(data)
        self._validate_tribute(data)
        return data


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
