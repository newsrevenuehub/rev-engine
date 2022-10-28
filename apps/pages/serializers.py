import itertools
import logging
from dataclasses import asdict

from django.conf import settings
from django.utils import timezone

from drf_extra_fields.relations import PresentablePrimaryKeyRelatedField
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from sorl_thumbnail_serializer.fields import HyperlinkedSorlImageField

from apps.common.validators import ValidateFkReferenceOwnership
from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.serializers import (
    BenefitLevelDetailSerializer,
    PaymentProviderSerializer,
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


class DonationPageFullDetailSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=255, required=False)  # Optional to allow autogeneration.
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
    payment_provider = PaymentProviderSerializer(source="revenue_program.payment_provider", read_only=True)
    template_pk = serializers.IntegerField(allow_null=True, required=False)

    graphic = serializers.ImageField(allow_empty_file=True, allow_null=True, required=False)
    header_bg_image = serializers.ImageField(allow_empty_file=True, allow_null=True, required=False)
    header_logo = serializers.ImageField(allow_empty_file=True, allow_null=True, required=False)

    graphic_thumbnail = HyperlinkedSorlImageField("300", source="graphic", read_only=True)
    header_bg_image_thumbnail = HyperlinkedSorlImageField("300", source="header_bg_image", read_only=True)
    header_logo_thumbnail = HyperlinkedSorlImageField("300", source="header_logo", read_only=True)

    revenue_program_is_nonprofit = serializers.SerializerMethodField(method_name="get_revenue_program_is_nonprofit")

    # TODO: [DEV-2187] Remove stripe_account_id from DonationPageFullDetailSerializer
    stripe_account_id = serializers.SerializerMethodField(method_name="get_stripe_account_id")
    currency = serializers.SerializerMethodField(method_name="get_currency")
    revenue_program_country = serializers.SerializerMethodField(method_name="get_revenue_program_country")
    allow_offer_nyt_comp = serializers.SerializerMethodField(method_name="get_allow_offer_nyt_comp")

    benefit_levels = serializers.SerializerMethodField(method_name="get_benefit_levels")
    plan = serializers.SerializerMethodField(read_only=True)
    elements = serializers.ListField(
        child=serializers.JSONField(),
        allow_empty=True,
        required=False,
    )
    sidebar_elements = serializers.ListField(
        child=serializers.JSONField(),
        allow_empty=True,
        required=False,
    )

    class Meta:
        model = DonationPage
        fields = "__all__"
        validators = [
            ValidateFkReferenceOwnership(fk_attribute="styles"),
            ValidateFkReferenceOwnership(fk_attribute="revenue_program"),
            UniqueTogetherValidator(queryset=DonationPage.objects.all(), fields=["revenue_program", "slug"]),
        ]

    def get_plan(self, obj):
        return asdict(obj.revenue_program.organization.plan)

    def create(self, validated_data):
        """If given template pk, return template.make_page_from_template().

        Else return super.create().

        Missing page name will be set to template.name or RevenueProgram.name+<serial int>.

        Throws ValidationError if template matching pk not found.
        """
        if "template_pk" in validated_data:
            try:
                template = Template.objects.get(pk=validated_data.pop("template_pk"))
                return template.make_page_from_template(validated_data)
            except Template.DoesNotExist:
                raise serializers.ValidationError({"template": ["This template no longer exists"]})
        if not validated_data.get("name"):
            rp = validated_data.get("revenue_program")
            for i in itertools.count(start=1):  # pragma: no branch (loop will never "complete" by design)
                validated_data["name"] = f"{rp.name}{i}"
                if not DonationPage.objects.filter(name=validated_data["name"]).exists():
                    break
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "styles_pk" in validated_data:
            pk = validated_data["styles_pk"]
            if pk is None:
                setattr(instance, "styles", None)
            else:
                try:
                    setattr(instance, "styles", Style.objects.get(pk=pk))
                except Style.DoesNotExist:
                    raise serializers.ValidationError({"styles_pk": "Could not find Style with provided pk."})
        return super().update(instance, validated_data)

    def get_revenue_program_is_nonprofit(self, obj):
        return obj.revenue_program.non_profit

    # TODO: [DEV-2187] Remove stripe_account_id from DonationPageFullDetailSerializer
    def get_stripe_account_id(self, obj):
        if self.context.get("live"):
            return obj.revenue_program.payment_provider.stripe_account_id

    def get_currency(self, obj):
        return (
            obj.revenue_program.payment_provider.get_currency_dict() if obj.revenue_program.payment_provider else None
        )

    def get_revenue_program_country(self, obj):
        return obj.revenue_program.country

    def get_allow_offer_nyt_comp(self, obj):
        if not self.context.get("live", False):
            return obj.revenue_program.allow_offer_nyt_comp

    def get_benefit_levels(self, obj):
        if obj.revenue_program:
            benefit_levels = obj.revenue_program.benefitlevel_set.all()
            serializer = BenefitLevelDetailSerializer(benefit_levels, many=True)
            return serializer.data

    def validate_thank_you_redirect(self, value):
        if self.instance and self.instance.id:
            org = self.instance.revenue_program.organization
        else:
            org = Organization.objects.filter(revenueprogram__id=self.initial_data["revenue_program"]).first()
        if value and not org.plan.custom_thank_you_page_enabled:
            raise serializers.ValidationError(
                "This organization's plan does not enable assigning a custom thank you URL"
            )
        return value

    def validate_page_limit(self, data):
        """Ensure that adding a page would not push parent org over its page limit

        NB: page_limit is not a serializer field, so we have to explicitly call this method from
        .validate() below.
        """
        if self.context["request"].method != "POST":
            return
        if DonationPage.objects.filter(
            revenue_program__organization=(org := data["revenue_program"].organization)
        ).count() + 1 > (pl := org.plan.page_limit):
            raise serializers.ValidationError(
                {"non_field_errors": [f"Your organization has reached its limit of {pl} page{'s' if pl > 1 else ''}"]}
            )

    def validate_page_element_permissions(self, data):
        """Ensure that requested page elements are permitted by the organization's plan"""
        rp = self.instance.revenue_program if self.instance else data["revenue_program"]
        if prohibited := set([elem["type"] for elem in data.get("elements", [])]).difference(
            set(rp.organization.plan.page_elements)
        ):
            raise serializers.ValidationError(
                {"page_elements": f"You're not allowed to use the following elements: {', '.join(prohibited)}"}
            )

    def validate_sidebar_element_permissions(self, data):
        """Ensure that requested sidebar elements are permitted by the organization's plan"""
        rp = self.instance.revenue_program if self.instance else data["revenue_program"]
        if prohibited := set([elem["type"] for elem in data.get("sidebar_elements", [])]).difference(
            set(rp.organization.plan.sidebar_elements)
        ):
            raise serializers.ValidationError(
                {"sidebar_elements": f"You're not allowed to use the following elements: {', '.join(prohibited)}"}
            )

    def validate(self, data):
        self.validate_page_limit(data)
        # TODO: [DEV-2741] Add granular validation for page and sidebar elements
        self.validate_page_element_permissions(data)
        self.validate_sidebar_element_permissions(data)
        return data

    def filter_page_elements_by_plan_permitted(self, instance):
        """Only return page elements that are permitted by related org's plan"""
        return [
            elem
            for elem in instance.elements
            if elem["type"] in instance.revenue_program.organization.plan.page_elements
        ]

    def filter_sidebar_elements_by_plan_permitted(self, instance):
        """Only return sidebar elements that are permitted by related org's plan"""
        return [
            elem
            for elem in instance.sidebar_elements
            if elem["type"] in instance.revenue_program.organization.plan.sidebar_elements
        ]

    def to_representation(self, instance):
        """When representing a donation page, we filter out any page or sidebar elements not permitted by org plan"""
        data = super().to_representation(instance)
        data["elements"] = self.filter_page_elements_by_plan_permitted(instance)
        data["sidebar_elements"] = self.filter_sidebar_elements_by_plan_permitted(instance)
        return data


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


class TemplateListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = ["id", "name", "revenue_program"]


class FontSerializer(serializers.ModelSerializer):
    class Meta:
        model = Font
        fields = ["id", "name", "font_name", "source", "accessor"]
