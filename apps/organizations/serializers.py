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
            # TODO: [DEV-1886] remove this after the FE no longer relies on it
            representation["non_profit"] = revenue_program.non_profit
            representation["domain_apple_verified_date"] = revenue_program.domain_apple_verified_date
        return representation


class OrganizationInlineSerializer(serializers.ModelSerializer):
    plan = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "uuid",
            "name",
            "slug",
            "plan",
            "show_connected_to_slack",
            "show_connected_to_salesforce",
            "show_connected_to_mailchimp",
            "send_receipt_email_via_nre",
        ]

    def get_plan(self, obj):
        return asdict(obj.plan)


class OrganizationPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["name"]


class RevenueProgramListInlineSerializer(serializers.ModelSerializer):
    """
    I am needed for Page creation. In particular, if "slug" is not provided,
    the user is redirected to `/edit/undefined/page-slug` after page creation.
    """

    organization = OrganizationInlineSerializer()

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
            "organization",
            "default_donation_page",
        ]


class RevenueProgramInlineSerializerForAuthedUserSerializer(serializers.ModelSerializer):
    """Serializer used for representing revenue programs inline in AuthedUserSerializer...

    which is used to represent users in the api/v1/token authentication endpoint.
    """

    class Meta:
        model = RevenueProgram
        fields = [
            "id",
            "name",
            "slug",
            "organization",
            "payment_provider_stripe_verified",
            "tax_id",
            "fiscal_status",
            "fiscal_sponsor_name",
        ]


class RevenueProgramInlineSerializer(RevenueProgramInlineSerializerForAuthedUserSerializer):
    # TODO: [DEV-2738]: This is likely the cause of at least part of the N+1 and poor performance
    # of api/v1/users. That endpoint serializes orgs using OrganizationInlineSerializer, then serializes
    # revenue programs using this serializer, which redundantly serializes the orgs.
    organization = OrganizationInlineSerializer()


class MailchimpRevenueProgramForSpaConfiguration(serializers.ModelSerializer):
    """
    Used by the SPA configuration endpoint. This is a read-only except for mailchimp_list_id
    which gets validated vs. the available lists.
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
        """We override `.update` so we can pass update_fields to `instance.save()`. We have code that creates mailchimp entities
        if mailchimp_list_id is being updated. Beyond that, `update_fields` guards against race conditions."""
        logger.info("Updating RP %s with data %s", instance, validated_data)
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
    """
    This is the RevenueProgram serializer you should consider updating.
    """

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
        ]

    def update(self, instance, validated_data):
        """We override `.update` so we can pass update_fields to `instance.save()`"""
        logger.info("Updating RP %s with data %s", instance, validated_data)
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
