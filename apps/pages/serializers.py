from rest_framework import serializers
from sorl_thumbnail_serializer.fields import HyperlinkedSorlImageField

from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.serializers import (
    BenefitLevelDetailSerializer,
    RevenueProgramListInlineSerializer,
    RevenueProgramSerializer,
)
from apps.pages.models import DonationPage, Style, Template


class StyleSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        styles = instance.styles if instance.styles else {}
        return {"id": instance.pk, "name": instance.name, **styles}

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


class DonationPageDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonationPage
        fields = "__all__"


class DonationPageFullDetailSerializer(serializers.ModelSerializer):
    styles = StyleSerializer(required=False)
    styles_pk = serializers.IntegerField(allow_null=True, required=False)
    revenue_program = RevenueProgramSerializer(read_only=True)
    revenue_program_pk = serializers.IntegerField(allow_null=True, required=False)
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

        organization = self.context["request"].user.get_organization()
        validated_data["organization"] = organization

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
            "derived_slug",
            "page_screenshot",
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
