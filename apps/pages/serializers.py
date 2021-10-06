from django.utils import timezone

from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from sorl_thumbnail_serializer.fields import HyperlinkedSorlImageField

from apps.api.error_messages import UNIQUE_PAGE_SLUG
from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.serializers import (
    BenefitLevelDetailSerializer,
    RevenueProgramListInlineSerializer,
)
from apps.pages.models import DonationPage, Style, Template


class StyleInlineSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        styles = instance.styles if instance.styles else {}
        representation = super().to_representation(instance)
        representation.update(**styles)
        return representation

    def to_internal_value(self, data):
        """
        data comes in as a dict with name and styles flattened. We need
        to stick styles in its own value and pull out name. Also get organization
        from request.user.
        """
        organization = self.context["request"].user.get_organization()
        if not data.get("name"):
            raise serializers.ValidationError({"name": "This field is required."})

        name = data.pop("name")
        data = {"name": name, "organization": organization.pk, "styles": data}

        return super().to_internal_value(data)

    class Meta:
        model = Style
        fields = "__all__"


class StyleListSerializer(StyleInlineSerializer):
    used_live = serializers.SerializerMethodField()

    def get_used_live(self, obj):
        return DonationPage.objects.filter(styles=obj, published_date__lte=timezone.now()).exists()


class DonationPageDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonationPage
        fields = "__all__"


class DonationPageFullDetailSerializer(serializers.ModelSerializer):
    styles = StyleInlineSerializer(required=False)
    styles_pk = serializers.IntegerField(allow_null=True, required=False)

    revenue_program = RevenueProgramListInlineSerializer(read_only=True)
    revenue_program_pk = serializers.IntegerField(allow_null=True, required=False)
    template_pk = serializers.IntegerField(allow_null=True, required=False)
    organization = serializers.PrimaryKeyRelatedField(read_only=True)

    graphic = serializers.ImageField(allow_empty_file=True, allow_null=True, required=False)
    header_bg_image = serializers.ImageField(allow_empty_file=True, allow_null=True, required=False)
    header_logo = serializers.ImageField(allow_empty_file=True, allow_null=True, required=False)

    graphic_thumbnail = HyperlinkedSorlImageField("300", source="graphic", read_only=True)
    header_bg_image_thumbnail = HyperlinkedSorlImageField("300", source="header_bg_image", read_only=True)
    header_logo_thumbnail = HyperlinkedSorlImageField("300", source="header_logo", read_only=True)

    organization_is_nonprofit = serializers.SerializerMethodField()

    benefit_levels = serializers.SerializerMethodField()

    def get_organization_is_nonprofit(self, obj):
        return obj.organization.non_profit

    def get_benefit_levels(self, obj):
        if obj.revenue_program:
            benefit_levels = obj.revenue_program.benefit_levels.all()
            serializer = BenefitLevelDetailSerializer(benefit_levels, many=True)
            return serializer.data

    class Meta:
        model = DonationPage
        fields = "__all__"

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
        new_slug = validated_data.get("slug", None)
        if new_slug and DonationPage.objects.deleted_only().filter(slug=new_slug).exists():
            raise serializers.ValidationError({"slug": [UNIQUE_PAGE_SLUG]})

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
        if "revenue_program_pk" not in validated_data:
            raise serializers.ValidationError(
                {"revenue_program_pk": "revenue_program_pk is required when creating a new page"}
            )
        try:
            rev_program_pk = validated_data.pop("revenue_program_pk")
            rev_program = RevenueProgram.objects.get(pk=rev_program_pk)
            validated_data["revenue_program"] = rev_program
        except RevenueProgram.DoesNotExist:
            raise serializers.ValidationError({"revenue_program_pk": "Could not find revenue program with provided pk"})

        organization = self.context["request"].user.get_organization() if self.context.get("request") else None
        validated_data["organization"] = organization

        self._check_against_soft_deleted_slugs(validated_data)
        if "template_pk" in validated_data:
            return self._create_from_template(validated_data)
        else:
            return super().create(validated_data)

    def update(self, instance, validated_data):
        self._update_related("styles", Style, validated_data, instance)
        return super().update(instance, validated_data)


class DonationPageListSerializer(serializers.ModelSerializer):
    revenue_program = RevenueProgramListInlineSerializer(read_only=True)
    organization = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.all())

    class Meta:
        model = DonationPage
        fields = [
            "id",
            "name",
            "page_screenshot",
            "slug",
            "revenue_program",
            "organization",
            "published_date",
            "is_live",
        ]


class TemplateDetailSerializer(serializers.ModelSerializer):
    page_pk = serializers.IntegerField(allow_null=True, required=False)

    def _create_from_page(self, validated_data):
        """
        Given a page pk, find page and run model method make_template_from_page.
        Returns Template instance
        Throws ValidationError if donation page is somehow missing.
        """
        try:
            page_pk = validated_data.pop("page_pk")
            page = DonationPage.objects.get(pk=page_pk)
            return page.make_template_from_page(validated_data)
        except DonationPage.DoesNotExist:
            raise serializers.ValidationError({"page": ["This page no longer exists"]})

    def is_valid(self, **kwargs):
        page_pk = self.initial_data["page_pk"]
        page = DonationPage.objects.get(pk=page_pk)
        self.initial_data["organization"] = page.organization.pk
        return super().is_valid(**kwargs)

    def create(self, validated_data):
        if "page_pk" in validated_data:
            return self._create_from_page(validated_data)
        return super().create(validated_data)

    class Meta:
        model = Template
        fields = [
            "page_pk",
            # organization is required here to validate name--org unique-togetherness
            "organization",
            "name",
            "heading",
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
            UniqueTogetherValidator(
                queryset=Template.objects.all(), fields=["name", "organization"], message="Template name already in use"
            )
        ]


class TemplateListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = [
            "id",
            "name",
        ]
