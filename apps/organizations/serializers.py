from dataclasses import asdict

from rest_framework import serializers

from apps.organizations.models import (
    Benefit,
    BenefitLevel,
    Organization,
    PaymentProvider,
    RevenueProgram,
)


class OrganizationSerializer(serializers.ModelSerializer):
    plan = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = "__all__"

    def get_plan(self, obj):
        return asdict(obj.plan)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        revenue_program = instance.revenueprogram_set.first()
        if revenue_program:
            payment_provider = revenue_program.payment_provider
            data = PaymentProviderSerializer(payment_provider).data
            data.pop("id")
            representation.update(**data)
            # TODO: [DEV-1886] remove this after the FE no longer relies on it
            representation["non_profit"] = revenue_program.non_profit
            representation["domain_apple_verified_date"] = revenue_program.domain_apple_verified_date
        return representation


class OrganizationInlineSerializer(serializers.ModelSerializer):
    plan = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ["id", "name", "slug", "plan"]

    def get_plan(self, obj):
        return asdict(obj.plan)


class RevenueProgramListInlineSerializer(serializers.ModelSerializer):
    """
    I am needed for Page creation. In particular, if "slug" is not provided,
    the user is redirected to `/edit/undefined/page-slug` after page creation.
    """

    class Meta:
        model = RevenueProgram
        fields = [
            "id",
            "name",
            "slug",
            "twitter_handle",
            "website_url",
            "contact_email",
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
        fields = ["id", "name", "slug", "organization", "payment_provider_stripe_verified"]


class RevenueProgramSerializer(serializers.ModelSerializer):
    """
    This is the RevenueProgram serializer you should consider updating.
    """

    slug = serializers.SlugField(required=False)

    class Meta:
        model = RevenueProgram
        fields = ["id", "name", "slug", "tax_id"]


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


class PaymentProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentProvider
        fields = "__all__"
