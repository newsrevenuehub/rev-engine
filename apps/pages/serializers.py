from apps.pages.models import Benefit, BenefitTier, DonorBenefit, Page, Style, Template
from rest_framework import serializers


class StyleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Style
        fields = "__all__"


class PageDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = "__all__"


class PageListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = [
            "id",
            "title",
            "header_bg_image",
            "header_logo",
            "header_link",
            "show_benefits",
            "slug",
            "revenue_program",
            "published_date",
            "organization",
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
            "title",
            "header_bg_image",
            "header_logo",
            "header_link",
            "show_benefits",
            "organization",
        ]


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
