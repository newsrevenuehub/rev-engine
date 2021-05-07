from rest_framework import serializers

from apps.organizations.models import Feature, Organization, Plan, RevenueProgram


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = "__all__"


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = "__all__"


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = "__all__"


class RevenueProgramSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False)

    class Meta:
        model = RevenueProgram
        fields = "__all__"

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request", None)
        if request and getattr(request, "method", None) == "PATCH":
            fields["name"].read_only = True
            fields["slug"].read_only = True
            fields["organization"].read_only = True
        return fields
