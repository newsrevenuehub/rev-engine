from rest_framework import serializers

from apps.organizations.models import (
    Benefit,
    BenefitLevel,
    Feature,
    Organization,
    Plan,
    RevenueProgram,
)


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = "__all__"


class PlanSerializer(serializers.ModelSerializer):
    features = FeatureSerializer(many=True, read_only=True)

    class Meta:
        model = Plan
        fields = "__all__"


class OrganizationSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(many=False, read_only=True)

    class Meta:
        model = Organization
        fields = "__all__"


class RevenueProgramListInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueProgram
        fields = [
            "id",
            "name",
        ]


class RevenueProgramSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False)

    class Meta:
        model = RevenueProgram
        fields = ["id", "name", "slug"]

    def get_fields(self):  # pragma: no cover
        fields = super().get_fields()
        request = self.context.get("request", None)
        if request and getattr(request, "method", None) == "PATCH":
            if fields.get("name"):
                fields["name"].read_only = True
            if fields.get("slug"):
                fields["slug"].read_only = True
            if fields.get("organization"):
                fields["organization"].read_only = True
        return fields


class BenefitDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Benefit
        fields = [
            "name",
            "description",
        ]


class BenefitLevelDetailSerializer(serializers.ModelSerializer):
    benefits = BenefitDetailSerializer(many=True)

    class Meta:
        model = BenefitLevel
        fields = [
            "name",
            "donation_range",
            "benefits",
        ]
