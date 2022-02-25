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


class OrganizationInlineSerializer(serializers.ModelSerializer):
    needs_payment_provider = serializers.SerializerMethodField(method_name="get_needs_payment_provider")

    def get_needs_payment_provider(self, obj):
        return obj.needs_payment_provider

    class Meta:
        model = Organization
        fields = ["id", "name", "slug", "needs_payment_provider"]


class RevenueProgramListInlineSerializer(serializers.ModelSerializer):
    """
    I am needed for Page creation. In particular, if "slug" is not provided,
    the user is redirected to `/edit/undefined/page-slug` after page creation.
    """

    address = serializers.SerializerMethodField()

    def get_address(self, obj):
        if hasattr(obj, "address"):
            return str(obj.address)
        return ""

    class Meta:
        model = RevenueProgram
        fields = [
            "id",
            "name",
            "slug",
            "twitter_handle",
            "website_url",
            "contact_email",
            "address",
            "google_analytics_v3_domain",
            "google_analytics_v3_id",
            "google_analytics_v4_id",
            "facebook_pixel_id",
        ]


class RevenueProgramInlineSerializer(serializers.ModelSerializer):
    """
    Used by the UserSerializer when users log in.
    """

    class Meta:
        model = RevenueProgram
        fields = [
            "id",
            "name",
            "slug",
            "organization",
        ]


class RevenueProgramSerializer(serializers.ModelSerializer):
    """
    This is the RevenueProgram serializer you should consider updating.
    """

    slug = serializers.SlugField(required=False)

    class Meta:
        model = RevenueProgram
        fields = [
            "id",
            "name",
            "slug",
        ]


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
