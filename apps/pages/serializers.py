from rest_framework import serializers
from sorl_thumbnail_serializer.fields import HyperlinkedSorlImageField

from apps.organizations.models import Organization, RevenueProgram
from apps.pages.models import Benefit, BenefitTier, DonationPage, DonorBenefit, Style, Template


class BenefitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Benefit
        fields = [
            "id",
            "name",
        ]


class BenefitTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = BenefitTier
        fields = ["id", "name", "description", "benefits"]
        depth = 1


class DonorBenefitDetailSerializer(serializers.ModelSerializer):
    tiers = BenefitTierSerializer(many=True)

    class Meta:
        model = DonorBenefit
        fields = [
            "id",
            "name",
            "blurb",
            "tiers",
        ]


class DonorBenefitListSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonorBenefit
        fields = [
            "id",
            "name",
            "blurb",
        ]


class StyleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Style
        fields = "__all__"


class DonationPageDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonationPage
        fields = "__all__"


class DonationPageFullDetailSerializer(serializers.ModelSerializer):
    styles = serializers.SerializerMethodField()
    donor_benefits = DonorBenefitDetailSerializer()

    graphic_thumbnail = HyperlinkedSorlImageField("300", source="graphic", read_only=True)
    header_bg_image_thumbnail = HyperlinkedSorlImageField("300", source="header_bg_image", read_only=True)
    header_logo_thumbnail = HyperlinkedSorlImageField("300", source="header_logo", read_only=True)

    class Meta:
        model = DonationPage
        fields = "__all__"

    def get_styles(self, obj):
        return obj.styles.styles if obj.styles else {}


class DonationPageListSerializer(serializers.ModelSerializer):
    revenue_program = serializers.PrimaryKeyRelatedField(queryset=RevenueProgram.objects.all())
    organization = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.all())

    class Meta:
        model = DonationPage
        fields = [
            "id",
            "name",
            "heading",
            "slug",
            "derived_slug",
            "revenue_program",
            "organization",
            "published_date",
            "is_live",
        ]


class TemplateDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = "__all__"


class TemplateListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = [
            "id",
            "name",
            "heading",
            "header_bg_image",
            "header_logo",
            "header_link",
            "organization",
        ]
