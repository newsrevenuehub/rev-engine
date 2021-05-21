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


class StripePaymentIntentSerializer(serializers.Serializer):
    email = serializers.EmailField()
    ip = serializers.IPAddressField()
    given_name = serializers.CharField(max_length=255)
    family_name = serializers.CharField(max_length=255)
    referer = serializers.URLField()
    amount = serializers.IntegerField()
    reason = serializers.CharField(max_length=255)

    organization_slug = serializers.SlugField()
    donation_page_slug = serializers.SlugField()

    PAYMENT_TYPE_SINGLE = (
        "single",
        "Single payment",
    )
    PAYMENT_TYPE_RECURRING = (
        "recurring",
        "Recurring payment",
    )
    PAYMENT_TYPE_CHOICES = (
        PAYMENT_TYPE_SINGLE,
        PAYMENT_TYPE_RECURRING,
    )
    payment_type = serializers.ChoiceField(choices=PAYMENT_TYPE_CHOICES)
