from rest_framework import serializers

from apps.organizations.models import (
    Benefit,
    BenefitLevel,
    BenefitLevelBenefit,
    Feature,
    Organization,
    Plan,
    RevenueProgram,
    RevenueProgramBenefitLevel,
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
        fields = ["id", "slug"]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request", None)
        if request and getattr(request, "method", None) == "PATCH":
            fields["name"].read_only = True
            fields["slug"].read_only = True
            fields["organization"].read_only = True
        return fields


class BenefitDetailSerializer(serializers.ModelSerializer):
    order = serializers.SerializerMethodField()

    def get_order(self, obj):
        benefit_level_benefit = BenefitLevelBenefit.objects.get(benefit=obj)
        return benefit_level_benefit.order

    class Meta:
        model = Benefit
        fields = [
            "order",
            "name",
            "description",
        ]


class BenefitLevelDetailSerializer(serializers.ModelSerializer):
    benefits = BenefitDetailSerializer(many=True)
    level = serializers.SerializerMethodField()

    def get_level(self, obj):
        rp_bl = RevenueProgramBenefitLevel.objects.get(benefit_level=obj)
        return rp_bl.level

    class Meta:
        model = BenefitLevel
        fields = [
            "level",
            "name",
            "donation_range",
            "benefits",
        ]
