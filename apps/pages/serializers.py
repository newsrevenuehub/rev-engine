from rest_framework import serializers

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

    class Meta:
        model = DonationPage
        fields = "__all__"

    def get_styles(self, obj):
        return obj.styles.styles if obj.styles else {}


class DonationPageListSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonationPage
        fields = [
            "id",
            "heading",
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
            "heading",
            "header_bg_image",
            "header_logo",
            "header_link",
            "show_benefits",
            "organization",
        ]
