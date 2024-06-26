import logging
from dataclasses import asdict

from django.conf import settings

from rest_framework import serializers

from apps.organizations.models import (
    Benefit,
    BenefitLevel,
    Organization,
    PaymentProvider,
    RevenueProgram,
)


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


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
            # TODO @DC: remove this after the FE no longer relies on it
            # DEV-1886
            representation["non_profit"] = revenue_program.non_profit
            representation["domain_apple_verified_date"] = revenue_program.domain_apple_verified_date
        return representation


class OrganizationInlineSerializer(serializers.ModelSerializer):
    plan = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "plan",
            "send_receipt_email_via_nre",
            "show_connected_to_mailchimp",
            "show_connected_to_salesforce",
            "show_connected_to_slack",
            "show_connected_to_eventbrite",
            "show_connected_to_google_analytics",
            "show_connected_to_digestbuilder",
            "show_connected_to_newspack",
            "slug",
            "uuid",
        )
        read_only_fields = fields

    def get_plan(self, obj):
        return asdict(obj.plan)


class OrganizationPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["name"]


_RP_FOR_DONATION_PAGE_LIST_SERIALIZER_FIELDS = (
    "id",
    "name",
    "slug",
    "default_donation_page",
)


class RevenueProgramForDonationPageListSerializer(serializers.ModelSerializer):
    """Narrowly used to serialize a revenue program in the DonationPageListSerializer.

    The field requirements here are determined by what the SPA needs
    """

    class Meta:
        model = RevenueProgram
        fields = _RP_FOR_DONATION_PAGE_LIST_SERIALIZER_FIELDS
        read_only_fields = _RP_FOR_DONATION_PAGE_LIST_SERIALIZER_FIELDS


class RevenueProgramForPageDetailSerializer(serializers.ModelSerializer):
    """Expected use case is as presentation serializer for the revenue_program field on DonationPageFullDetailSerializer."""

    organization = OrganizationInlineSerializer()

    class Meta:
        model = RevenueProgram
        fields = (
            *_RP_FOR_DONATION_PAGE_LIST_SERIALIZER_FIELDS,
            "contact_email",
            "contact_phone",
            "facebook_pixel_id",
            "google_analytics_v3_domain",
            "google_analytics_v3_id",
            "google_analytics_v4_id",
            "organization",
            "twitter_handle",
            "website_url",
        )
        read_only_fields = fields


class RevenueProgramInlineSerializer(serializers.ModelSerializer):
    """Relatively lightweight reprsentation of an RP.

    Used for for representing revenue programs inline in AuthedUserSerializer and
    used in StyleListSerializer.
    """

    class Meta:
        model = RevenueProgram
        fields = (
            *_RP_FOR_DONATION_PAGE_LIST_SERIALIZER_FIELDS,
            "fiscal_sponsor_name",
            "fiscal_status",
            "organization",
            "payment_provider_stripe_verified",
            "tax_id",
            "contact_phone",
            "contact_email",
        )
        read_only_fields = fields


class MailchimpRevenueProgramForSpaConfiguration(serializers.ModelSerializer):
    """Used by the SPA configuration endpoint.

    This is a read-only except for mailchimp_list_id which gets validated vs. the available lists.
    """

    mailchimp_list_id = serializers.CharField(required=False, allow_null=True, max_length=50)

    class Meta:
        model = RevenueProgram
        fields = [
            "id",
            "name",
            "slug",
            "chosen_mailchimp_email_list",
            "available_mailchimp_email_lists",
            "mailchimp_integration_connected",
            "mailchimp_list_id",
        ]

    def update(self, instance, validated_data):
        """Override `.update` so we can pass update_fields to `instance.save()`.

        We have code that creates mailchimp entities if mailchimp_list_id is being updated. Beyond that, `update_fields`
        guards against race conditions.
        """
        logger.info("Updating RP %s", instance)
        logger.debug("Updating RP %s with data %s", instance, validated_data)
        update_fields = [field for field in validated_data if field in self.fields]
        for attr, value in validated_data.items():
            if attr in update_fields:
                setattr(instance, attr, value)
        instance.save(update_fields={field for field in validated_data if field in self.fields})
        return instance

    def validate_mailchimp_list_id(self, value):
        logger.info("Validating Mailchimp list ID with value %s for RP %s", value, self.instance)
        if value is not None and value not in [x.id for x in self.instance.mailchimp_email_lists]:
            logger.warning("Attempt to set mailchimp_list_id to a list not associated with this RP")
            raise serializers.ValidationError("Invalid Mailchimp list ID")
        return value


class MailchimpRevenueProgramForSwitchboard(serializers.ModelSerializer):
    """Primary consumer is switchboard API. This is a read-only serializer."""

    mailchimp_integration_connected = serializers.ReadOnlyField()
    mailchimp_server_prefix = serializers.ReadOnlyField(allow_null=True)
    mailchimp_store = serializers.SerializerMethodField()
    mailchimp_one_time_contribution_product = serializers.SerializerMethodField()
    mailchimp_recurring_contribution_product = serializers.SerializerMethodField()
    stripe_account_id = serializers.ReadOnlyField(allow_null=True)
    id = serializers.ReadOnlyField()
    name = serializers.ReadOnlyField()
    slug = serializers.ReadOnlyField()

    class Meta:
        model = RevenueProgram
        fields = [
            "id",
            "name",
            "slug",
            "stripe_account_id",
            "mailchimp_integration_connected",
            "mailchimp_server_prefix",
            "mailchimp_store",
            "mailchimp_one_time_contribution_product",
            "mailchimp_recurring_contribution_product",
        ]

    def get_mailchimp_store(self, obj) -> dict | None:
        return asdict(obj.mailchimp_store) if obj.mailchimp_store else None

    def get_mailchimp_one_time_contribution_product(self, obj) -> dict | None:
        return (
            asdict(obj.mailchimp_one_time_contribution_product) if obj.mailchimp_one_time_contribution_product else None
        )

    def get_mailchimp_recurring_contribution_product(self, obj) -> dict | None:
        return (
            asdict(obj.mailchimp_recurring_contribution_product)
            if obj.mailchimp_recurring_contribution_product
            else None
        )


class RevenueProgramSerializer(serializers.ModelSerializer):
    """RevenueProgram serializer you should consider updating."""

    slug = serializers.SlugField(required=False)

    class Meta:
        model = RevenueProgram
        fields = [
            "id",
            "name",
            "slug",
            "tax_id",
            "fiscal_status",
            "fiscal_sponsor_name",
            "contact_phone",
            "contact_email",
        ]

    def update(self, instance, validated_data):
        """We override `.update` so we can pass update_fields to `instance.save()`."""
        logger.info("Updating RP %s", instance)
        logger.debug("Updating RP %s with data %s", instance, validated_data)
        update_fields = [field for field in validated_data if field in self.fields]
        for attr, value in validated_data.items():
            if attr in update_fields:
                setattr(instance, attr, value)
        instance.save(update_fields={field for field in validated_data if field in self.fields})
        return instance


class RevenueProgramPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueProgram
        fields = ["tax_id", "fiscal_status", "fiscal_sponsor_name"]


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


class MailchimpOauthSuccessSerializer(serializers.Serializer):
    mailchimp_oauth_code = serializers.CharField()
    revenue_program = serializers.IntegerField()


class SendTestEmailSerializer(serializers.Serializer):
    email_name = serializers.CharField()
    revenue_program = serializers.IntegerField()
