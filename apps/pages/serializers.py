import logging

from django.conf import settings
from django.utils import timezone

from drf_extra_fields.relations import PresentablePrimaryKeyRelatedField
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from sorl_thumbnail_serializer.fields import HyperlinkedSorlImageField

from apps.api.error_messages import UNIQUE_PAGE_SLUG
from apps.common.validators import ValidateFkReferenceOwnership
from apps.organizations.models import RevenueProgram
from apps.organizations.serializers import (
    BenefitLevelDetailSerializer,
    RevenueProgramInlineSerializer,
    RevenueProgramListInlineSerializer,
)
from apps.pages.models import DonationPage, Font, Style, Template


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class StyleInlineSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        styles = instance.styles if instance.styles else {}
        representation = super().to_representation(instance)
        representation.update(**styles)
        return representation

    class Meta:
        model = Style
        fields = (
            "id",
            "created",
            "modified",
            "name",
            "styles",
        )


class StyleListSerializer(StyleInlineSerializer):

    revenue_program = PresentablePrimaryKeyRelatedField(
        queryset=RevenueProgram.objects.all(),
        presentation_serializer=RevenueProgramInlineSerializer,
        read_source=None,
    )
    used_live = serializers.SerializerMethodField()

    def get_used_live(self, obj):
        return DonationPage.objects.filter(styles=obj, published_date__lte=timezone.now()).exists()

    def to_internal_value(self, data):
        """
        Data comes in as a dict with name and styles flattened. We need
        to stick styles in its own value and pull out name.
        """
        name = data.pop("name", None)
        revenue_program = data.pop("revenue_program", None)
        data = {
            "name": name,
            "revenue_program": revenue_program,
            "styles": data,
        }
        return super().to_internal_value(data)

    class Meta:
        model = Style
        fields = (
            "id",
            "created",
            "modified",
            "name",
            "styles",
            "revenue_program",
            "used_live",
        )
        validators = [
            ValidateFkReferenceOwnership(fk_attribute="revenue_program"),
            UniqueTogetherValidator(queryset=Style.objects.all(), fields=["revenue_program", "name"]),
        ]


class DonationPageFullDetailSerializer(serializers.ModelSerializer):

    styles = PresentablePrimaryKeyRelatedField(
        queryset=Style.objects.all(),
        presentation_serializer=StyleInlineSerializer,
        read_source=None,
        allow_null=True,
        required=False,
    )
    revenue_program = PresentablePrimaryKeyRelatedField(
        queryset=RevenueProgram.objects.all(),
        presentation_serializer=RevenueProgramListInlineSerializer,
        read_source=None,
        allow_null=False,
        required=True,
    )
    template_pk = serializers.IntegerField(allow_null=True, required=False)

    graphic = serializers.ImageField(allow_empty_file=True, allow_null=True, required=False)
    header_bg_image = serializers.ImageField(allow_empty_file=True, allow_null=True, required=False)
    header_logo = serializers.ImageField(allow_empty_file=True, allow_null=True, required=False)

    graphic_thumbnail = HyperlinkedSorlImageField("300", source="graphic", read_only=True)
    header_bg_image_thumbnail = HyperlinkedSorlImageField("300", source="header_bg_image", read_only=True)
    header_logo_thumbnail = HyperlinkedSorlImageField("300", source="header_logo", read_only=True)

    organization_is_nonprofit = serializers.SerializerMethodField(method_name="get_organization_is_nonprofit")
    stripe_account_id = serializers.SerializerMethodField(method_name="get_stripe_account_id")
    currency = serializers.SerializerMethodField(method_name="get_currency")
    organization_country = serializers.SerializerMethodField(method_name="get_organization_country")
    allow_offer_nyt_comp = serializers.SerializerMethodField(method_name="get_allow_offer_nyt_comp")

    benefit_levels = serializers.SerializerMethodField(method_name="get_benefit_levels")

    def get_organization_is_nonprofit(self, obj):
        return obj.organization.non_profit

    def get_stripe_account_id(self, obj):
        if self.context.get("live"):
            return obj.organization.stripe_account_id

    def get_currency(self, obj):
        return obj.organization.get_currency_dict()

    def get_organization_country(self, obj):
        return obj.organization.address.country

    def get_allow_offer_nyt_comp(self, obj):
        if not self.context.get("live", False):
            return obj.revenue_program.allow_offer_nyt_comp

    def get_benefit_levels(self, obj):
        if obj.revenue_program:
            benefit_levels = obj.revenue_program.benefit_levels.all()
            serializer = BenefitLevelDetailSerializer(benefit_levels, many=True)
            return serializer.data

    class Meta:
        model = DonationPage
        fields = "__all__"
        validators = [
            ValidateFkReferenceOwnership(fk_attribute="styles"),
            ValidateFkReferenceOwnership(fk_attribute="revenue_program"),
            UniqueTogetherValidator(queryset=DonationPage.objects.all(), fields=["revenue_program", "slug"]),
        ]

    def _update_related(self, related_field, related_model, validated_data, instance):
        pk_field = f"{related_field}_pk"
        if pk_field in validated_data and validated_data[pk_field] is None:
            setattr(instance, related_field, None)
        elif pk_field in validated_data:
            try:
                related_instance = related_model.objects.get(pk=validated_data[pk_field])
                setattr(instance, related_field, related_instance)
            except related_model.DoesNotExist:
                raise serializers.ValidationError({related_field: "Could not find instance with provided pk."})

    def _check_against_soft_deleted_slugs(self, validated_data):
        new_slug = validated_data.get(settings.PAGE_SLUG_PARAM, None)
        if new_slug and DonationPage.objects.deleted_only().filter(slug=new_slug).exists():
            raise serializers.ValidationError({settings.PAGE_SLUG_PARAM: [UNIQUE_PAGE_SLUG]})

    def _create_from_template(self, validated_data):
        """
        Given a template pk, find template and run model method make_page_from_template.
        Returns DonationPage instance
        Throws ValidationError if template is somehow missing.
        """
        try:
            template_pk = validated_data.pop("template_pk")
            template = Template.objects.get(pk=template_pk)
            return template.make_page_from_template(validated_data)
        except Template.DoesNotExist:
            raise serializers.ValidationError({"template": ["This template no longer exists"]})

    def create(self, validated_data):
        self._check_against_soft_deleted_slugs(validated_data)
        if "template_pk" in validated_data:
            return self._create_from_template(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._update_related("styles", Style, validated_data, instance)
        return super().update(instance, validated_data)


class DonationPageListSerializer(serializers.ModelSerializer):
    revenue_program = RevenueProgramListInlineSerializer(read_only=True)

    class Meta:
        model = DonationPage
        fields = [
            "id",
            "name",
            "page_screenshot",
            "slug",
            "revenue_program",
            "published_date",
            "is_live",
        ]


class TemplateDetailSerializer(serializers.ModelSerializer):
    revenue_program = PresentablePrimaryKeyRelatedField(
        queryset=RevenueProgram.objects.all(),
        presentation_serializer=RevenueProgramInlineSerializer,
        read_source=None,
        default=None,
        allow_null=True,
        required=False,
    )
    page = PresentablePrimaryKeyRelatedField(
        queryset=DonationPage.objects.all(),
        presentation_serializer=DonationPageFullDetailSerializer,
        read_source=None,
        required=False,
        allow_null=True,
    )

    def create(self, validated_data):
        page = validated_data.pop("page", None)
        if page:
            return page.make_template_from_page(validated_data)
        return super().create(validated_data)

    def validate_page(self, page):
        """Note on why"""
        if page and self.initial_data.get("revenue_program") is None:
            self.initial_data["revenue_program"] = page.revenue_program.pk
        return page

    class Meta:
        model = Template
        fields = [
            "id",
            "page",
            "name",
            "heading",
            "revenue_program",
            "graphic",
            "header_bg_image",
            "header_logo",
            "header_link",
            "styles",
            "elements",
            "sidebar_elements",
            "thank_you_redirect",
            "post_thank_you_redirect",
        ]
        validators = [
            ValidateFkReferenceOwnership(fk_attribute="page"),
            UniqueTogetherValidator(
                queryset=Template.objects.all(),
                fields=["name", "revenue_program"],
                message="Template name already in use",
            ),
        ]


class TemplateListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = ["id", "name", "revenue_program"]


class FontSerializer(serializers.ModelSerializer):
    class Meta:
        model = Font
        fields = ["id", "name", "font_name", "source", "accessor"]
