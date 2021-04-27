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
        fields = ["id", "name"]


class OrganizationDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = "__all__"


class OrganizationListSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False)

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

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request", None)
        if request and getattr(request, "method", None) == "PATCH":
            fields["name"].read_only = True
            fields["slug"].read_only = True
        return fields


class RevenueProgramDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueProgram
        fields = "__all__"


class RevenueProgramListSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False)

    class Meta:
        model = RevenueProgram
        fields = ["id", "name", "slug", "organization"]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request", None)
        if request and getattr(request, "method", None) == "PATCH":
            fields["name"].read_only = True
            fields["slug"].read_only = True
            fields["organization"].read_only = True
        return fields
