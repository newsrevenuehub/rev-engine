from rest_framework import serializers

from apps.contributions.models import Contribution, Contributor


class ContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contribution
        fields = "__all__"


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
    reason = serializers.CharField(max_length=255)

    revenue_program_slug = serializers.SlugField()
    donation_page_slug = serializers.SlugField(required=False)

    PAYMENT_TYPE_ONE_TIME = (
        "one_time",
        "One-time payment",
    )
    PAYMENT_TYPE_RECURRING = (
        "recurring",
        "Recurring payment",
    )

    def convert_amount_to_cents(self, amount):
        """
        Stripe stores payment amounts in cents.
        """
        return int(float(amount) * 100)

    def to_internal_value(self, data):
        if data.get("amount"):
            data["amount"] = self.convert_amount_to_cents(data["amount"])
        return super().to_internal_value(data)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["amount"].error_messages["invalid"] = "Enter a valid amount"


class StripeOneTimePaymentSerializer(AbstractPaymentSerializer):
    """
    A Stripe one-time payment requires minimal information--- do I need the customer?
    """


class StripeRecurringPaymentSerializer(AbstractPaymentSerializer):
    """
    paymentMethodId: paymentMethod.id,
    interval: paymentInterval,
    """

    payment_method_id = serializers.CharField(max_length=255)

    INTERVAL_MONTHLY = ("monthly", "Monthly")
    INTERVAL_YEARLY = ("yearly", "Yearly")
    INTERVAL_CHOICES = [INTERVAL_MONTHLY, INTERVAL_YEARLY]
    interval = serializers.ChoiceField(choices=INTERVAL_CHOICES)
