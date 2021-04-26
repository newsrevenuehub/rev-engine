from rest_framework import serializers

from apps.organizations.models import Feature, Organization, Plan, RevenueProgram


class FeatureDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = "__all__"


class FeatureListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ["id", "name", "description", "plans"]


class PlanDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = "__all__"


class PlanListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ["id", "name", "features"]


class OrganizationDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = "__all__"


class OrganizationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "plan",
            "non_profit",
            "stripe_account",
            "org_addr1",
            "org_addr2",
            "org_city",
            "org_state",
            "org_zip",
            "salesforce_id",
        ]


class RevenueProgramDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueProgram
        fields = "__all__"


class RevenueProgramListSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueProgram
        fields = ["id", "name", "slug", "organization"]
