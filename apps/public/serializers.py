from rest_framework import serializers

from apps.organizations.models import Benefit, BenefitLevel, PaymentProvider, RevenueProgram


class BenefitSerializer(serializers.ModelSerializer):
    """NOTE: PUBLIC API."""

    class Meta:
        model = Benefit
        fields = [
            "name",
            "description",
        ]


class BenefitLevelSerializer(serializers.ModelSerializer):
    """NOTE: PUBLIC API."""

    benefits = BenefitSerializer(many=True)

    class Meta:
        model = BenefitLevel
        fields = [
            "id",
            "name",
            "donation_range",
            "lower_limit",
            "upper_limit",
            "benefits",
            "level",
        ]


class PublicPaymentProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentProvider
        fields = ["stripe_account_id"]


class RevenueProgramDetailSerializer(serializers.ModelSerializer):
    """NOTE: PUBLIC API."""

    organization = serializers.StringRelatedField()
    benefit_levels = BenefitLevelSerializer(source="benefitlevel_set", many=True)
    payment_provider = PublicPaymentProviderSerializer()

    class Meta:
        model = RevenueProgram
        fields = ["id", "name", "slug", "organization", "benefit_levels", "payment_provider", "non_profit"]


class RevenueProgramListSerializer(serializers.HyperlinkedModelSerializer):
    """NOTE: PUBLIC API."""

    organization = serializers.StringRelatedField()
    payment_provider = PublicPaymentProviderSerializer()

    class Meta:
        model = RevenueProgram
        fields = ["id", "url", "name", "slug", "organization", "payment_provider"]
