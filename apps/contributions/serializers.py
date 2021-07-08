from django.conf import settings

from rest_framework import serializers

from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
)


class ContributionSerializer(serializers.ModelSerializer):
    contributor_email = serializers.StringRelatedField(read_only=True, source="contributor")
    auto_accepted_on = serializers.SerializerMethodField()

    def get_auto_accepted_on(self, obj):
        if obj.flagged_date:
            return obj.flagged_date + settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA

    class Meta:
        model = Contribution
        fields = [
            "contributor_email",
            "created",
            "amount",
            "currency",
            "interval",
            "last_payment_date",
            "bad_actor_score",
            "flagged_date",
            "auto_accepted_on",
            "status",
        ]


class ContributorContributionSerializer(serializers.ModelSerializer):
    """
    A paired-down, read-only version of a Contribution serializer
    """

    status = serializers.SerializerMethodField()

    def get_status(self, obj):
        if obj.status and obj.status in (
            ContributionStatus.FAILED,
            ContributionStatus.FLAGGED,
            ContributionStatus.REJECTED,
        ):
            return ContributionStatus.FAILED
        return obj.status

    class Meta:
        model = Contribution
        fields = ["id", "created", "interval", "status", "amount", "last_payment_date"]
        read_only_fields = fields


class ContributorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contributor
        fields = "__all__"


class AbstractPaymentSerializer(serializers.Serializer):
    # These are the fields required for the BadActor API
    email = serializers.EmailField()
    ip = serializers.IPAddressField()
    given_name = serializers.CharField(max_length=255)
    family_name = serializers.CharField(max_length=255)
    referer = serializers.URLField()
    amount = serializers.IntegerField()
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)

    # These are use to attach the contribution to the right organization,
    # and associate it with the page it came from.
    revenue_program_slug = serializers.SlugField()
    donation_page_slug = serializers.SlugField(required=False)

    interval = serializers.ChoiceField(choices=ContributionInterval.choices, default=ContributionInterval.ONE_TIME)

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
