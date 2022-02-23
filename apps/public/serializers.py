from rest_framework import serializers

from apps.organizations.models import Benefit, BenefitLevel, RevenueProgram


class BenefitSerializer(serializers.ModelSerializer):
    """
    NOTE: PUBLIC API
    """

    class Meta:
        model = Benefit
        fields = [
            "name",
            "description",
        ]


class BenefitLevelSerializer(serializers.ModelSerializer):
    """
    NOTE: PUBLIC API
    """

    benefits = BenefitSerializer(many=True)

    class Meta:
        model = BenefitLevel
        fields = [
            "id",
            "name",
            "donation_range",
            "benefits",
        ]


class RevenueProgramDetailSerializer(serializers.ModelSerializer):
    """
    NOTE: PUBLIC API
    """

    organization = serializers.StringRelatedField()
    benefit_levels = BenefitLevelSerializer(many=True)

    class Meta:
        model = RevenueProgram
        fields = ["id", "name", "slug", "organization", "benefit_levels"]


class RevenueProgramListSerializer(serializers.HyperlinkedModelSerializer):
    """
    NOTE: PUBLIC API
    """

    organization = serializers.StringRelatedField()

    class Meta:
        model = RevenueProgram
        fields = ["id", "url", "name", "slug", "organization"]
