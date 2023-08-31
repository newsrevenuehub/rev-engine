import itertools
import logging
from dataclasses import asdict

from django.conf import settings
from django.utils import timezone

from drf_extra_fields.relations import PresentablePrimaryKeyRelatedField
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
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
from apps.pages.models import PAGE_NAME_MAX_LENGTH, DonationPage, Font, Style


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
        required=False,
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
            ValidateFkReferenceOwnership(fk_attribute="revenue_program", model=Style),
            UniqueTogetherValidator(queryset=Style.objects.all(), fields=["revenue_program", "name"]),
        ]

    def get_used_live(self, obj):
        return DonationPage.objects.filter(styles=obj, published_date__lte=timezone.now()).exists()

    def to_internal_value(self, data):
        """
        Data comes in as a dict with name and styles flattened. We need
        to stick styles in its own value and pull out name.
        """
        # ensure we don't mutate passed dict
        data = {**data}
        name = data.pop("name", self.instance.name if self.instance else None)
        revenue_program = data.pop("revenue_program", self.instance.revenue_program.pk if self.instance else None)
        synthesized = {"name": name, "revenue_program": revenue_program}
        # remaining keys after name/revenue_program are treated as style properties, and if we see any, we
        # update all of styles attribute.
        synthesized["styles"] = data if data else self.instance.styles if self.instance else None
        return super().to_internal_value(synthesized)

    def validate_revenue_program(self, value):
        """Ensure that there is a revenue program provided if this is a create request (which will be case if no instance)

        The revenue_program field needs to be optional vis-a-vis patch requests, but required for post. Alternatively, we could
        create separate serializers for two methods, but there's required overlap around validation, so using single serializer
        with this custom validation for revenue_program field.
        """
        if value is None and not self.instance:
            raise serializers.ValidationError(["This field is required."])
        return value

    def _validate_style_limit(self, data):
        """Ensure that adding a style would not push parent org over its style limit

        NB: The `_` prefix on this method name is here to make clear that this method is not
        automatically called as part of validating some `style_limit` field, via DRF's conventions
        around `validate_foo` when a serializer has `.foo` attribute.
        """
        if Style.objects.filter(
            revenue_program__organization=(org := data["revenue_program"].organization)
        ).count() + 1 > (sl := org.plan.style_limit):
            raise serializers.ValidationError(
                {"non_field_errors": [f"Your organization has reached its limit of {sl} style{'s' if sl > 1 else ''}"]}
            )

    def validate(self, data):
        if self.context["request"].method == "POST":
            self._validate_style_limit(data)
        return data


class DonationPageFullDetailSerializer(serializers.ModelSerializer):
    # these settings enable auto-generation for name
    name = serializers.CharField(max_length=PAGE_NAME_MAX_LENGTH, allow_blank=True, allow_null=True, required=False)
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

    graphic = serializers.ImageField(allow_empty_file=True, allow_null=True, required=False)
    header_bg_image = serializers.ImageField(allow_empty_file=True, allow_null=True, required=False)
    header_logo = serializers.ImageField(allow_empty_file=True, allow_null=True, required=False)
    header_logo_alt_text = serializers.CharField(max_length=255, allow_blank=True, allow_null=True, required=False)

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
    elements = serializers.JSONField(required=False)
    sidebar_elements = serializers.JSONField(required=False)

    class Meta:
        model = DonationPage
        fields = "__all__"
        validators = [
            ValidateFkReferenceOwnership(fk_attribute="styles", model=DonationPage),
            ValidateFkReferenceOwnership(fk_attribute="revenue_program", model=DonationPage),
        ]

    def get_plan(self, obj):
        return asdict(obj.revenue_program.organization.plan)

    def create(self, validated_data):
        """Create a name on the fly for page if one not provided in validated data"""
        if not validated_data.get("name"):
            rp = validated_data.get("revenue_program")
            if not DonationPage.objects.filter(name=rp.name).exists():
                validated_data["name"] = rp.name
            else:
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

    def validate_publish_limit(self, data):
        """Ensure that publishing a page would not push parent org over its publish limit

        NB: publish_limit is not a serializer field, so we have to explicitly call this method from
        .validate() below.
        """
        logger.debug("DonationPageFullDetailSerializer.validate_publish_limit called with data: %s", data)
        org = self.instance.revenue_program.organization if self.instance else data["revenue_program"].organization
        # this method gets run both in create and update contexts, so we need to account for the fact that with an offset.
        # What we're trying to compute is the total number of published pages for the org if the current request was processed
        offset = (
            1
            if any(
                [
                    # If the page already exists but is gaining a publish date
                    self.instance and self.instance.published_date is None and data["published_date"] is not None,
                    # If the page is being created with a publish date
                    not self.instance and data["published_date"] is not None,
                ]
            )
            else 0
        )
        if DonationPage.objects.filter(
            published_date__isnull=False, revenue_program__organization=org
        ).count() + offset > (pl := org.plan.publish_limit):
            logger.info(
                "DonationPageFullDetailSerializer.validate_publish_limit raising ValidationError because org (%s) has reached its publish limit",
                org.id,
            )
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        f"Your organization has reached its limit of {pl} published page{'' if pl == 1 else 's'}"
                    ]
                }
            )

    def validate_page_element_permissions(self, data):
        """Ensure that requested page elements are permitted by the organization's plan"""
        rp = self.instance.revenue_program if self.instance else data["revenue_program"]
        if any(x.get("type", None) is None for x in data.get("elements", [])):
            raise serializers.ValidationError({"page_elements": "Something is wrong with the provided page elements"})
        if prohibited := set(
            x["type"] for x in data.get("elements", []) if x["type"] not in rp.organization.plan.page_elements
        ).difference(set(rp.organization.plan.page_elements)):
            raise serializers.ValidationError(
                {"page_elements": f"You're not allowed to use the following elements: {', '.join(prohibited)}"}
            )

    def validate_sidebar_element_permissions(self, data):
        """Ensure that requested sidebar elements are permitted by the organization's plan"""
        rp = self.instance.revenue_program if self.instance else data["revenue_program"]
        if prohibited := set(
            elem["type"] for elem in data.get("sidebar_elements", []) if elem.get("type", None)
        ).difference(set(rp.organization.plan.sidebar_elements)):
            raise serializers.ValidationError(
                {"sidebar_elements": f"You're not allowed to use the following elements: {', '.join(prohibited)}"}
            )

    def is_valid(self, raise_exception=False, *args, **kwargs):
        """We override `is_valid` so we can turn slug+rp uniqueness constraint violation into a field-level error.

        We do this to make the SPA's life easier.
        """
        try:
            return super().is_valid(raise_exception=raise_exception, *args, **kwargs)
        except ValidationError as exc:
            if (
                detail := exc.detail.get("non_field_errors", [""])[0]
            ) == "The fields revenue_program, slug must make a unique set.":
                raise ValidationError({"slug": [detail]})
            else:
                raise

    @property
    def is_new(self):
        return not self.instance or not self.instance.id

    def ensure_slug(self, data) -> None:
        """Ensure that a slug is is provided or already exists for this page"""
        in_data = "slug" in data
        sent_slug = data.get("slug", None)
        if any(
            [
                all([self.is_new, not in_data or not sent_slug]),
                all([not self.is_new, not in_data or not sent_slug, not self.instance.slug]),
            ]
        ):
            raise serializers.ValidationError({"slug": "This field is required."})

    def ensure_slug_is_unique_for_rp(self, data) -> None:
        """Ensure that a slug is unique for a given revenue program

        NB: We are not using a UniqueTogetherValidator for this because we that validator
        requires that the fields are truthy, and we allow nulls for slug.  A given RP can
        have > 1 page with a null slug.

        NB: we assume rp is already validated at this point, so we can safely access it in case of
        new page creation.

        and assume if key is there, it's non empty if string
        """
        # if this is an update
        slug = data["slug"] if "slug" in data else None
        is_new = not self.instance or not self.instance.id
        rp = data["revenue_program"] if is_new else self.instance.revenue_program
        logger.info("Ensuring that slug %s is unique for rp %s", slug, rp.id)
        if slug is None:
            logger.debug("Slug is empty, so skipping uniqueness check")
            return
        if slug == "":
            raise serializers.ValidationError({"slug": "This field must be at least 1 character long."})
        if self.instance and self.instance.id:
            already_exists = (
                DonationPage.objects.filter(revenue_program=rp, slug=slug).exclude(id=self.instance.id).exists()
            )
        else:
            already_exists = DonationPage.objects.filter(revenue_program=rp, slug=slug).exists()
        if already_exists:
            raise serializers.ValidationError({"slug": "This field must be unique for the given revenue program."})

    def validate(self, data):
        self.validate_page_limit(data)
        if "published_date" in data:
            self.ensure_slug(data)
            self.validate_publish_limit(data)

        if "slug" in data:
            self.ensure_slug_is_unique_for_rp(data)
        # TODO: [DEV-2741] Add granular validation for page and sidebar elements
        self.validate_page_element_permissions(data)
        self.validate_sidebar_element_permissions(data)
        return data

    def filter_page_elements_by_plan_permitted(self, instance):
        """Only return page elements that are permitted by related org's plan"""
        return [
            elem
            for elem in instance.elements
            if (elem_type := elem.get("type", None))
            and elem_type in instance.revenue_program.organization.plan.page_elements
        ]

    def filter_sidebar_elements_by_plan_permitted(self, instance):
        """Only return sidebar elements that are permitted by related org's plan"""
        return [
            elem
            for elem in instance.sidebar_elements
            if (elem_type := elem.get("type"))
            and elem_type in instance.revenue_program.organization.plan.sidebar_elements
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


class FontSerializer(serializers.ModelSerializer):
    class Meta:
        model = Font
        fields = ["id", "name", "font_name", "source", "accessor"]
