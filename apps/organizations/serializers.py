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
            "name",
            "slug",
            "plan",
            "show_connected_to_slack",
            "show_connected_to_salesforce",
            "show_connected_to_mailchimp",
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


class RevenueProgramInlineSerializer(serializers.ModelSerializer):
    """
    Used by the UserSerializer when users log in.
    """

    organization = OrganizationInlineSerializer()
    mailchimp_email_list = serializers.SerializerMethodField()
    mailchimp_email_lists = serializers.SerializerMethodField()

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
            "mailchimp_integration_connected",
            "mailchimp_email_list_",
            "mailchimp_email_lists",
        ]

    def get_mailchimp_email_list(self, obj):
        mc_list = obj.mailchimp_email_list
        return {"id": mc_list.id, "name": mc_list.name} if mc_list else None

    def get_mailchimp_email_lists(self, obj):
        return [{"id": x.id, "name": x.name} for x in obj.mailchimp_email_lists]


class MailchimpIntegratedRevenueProgramSerializer(serializers.ModelSerializer):
    """ """

    mailchimp_integration_connected = serializers.ReadOnlyField()
    mailchimp_email_lists = serializers.SerializerMethodField()
    mailchimp_email_list = serializers.SerializerMethodField()
    mailchimp_server_prefix = serializers.ReadOnlyField(allow_null=True)
    mailchimp_contributor_segment = serializers.SerializerMethodField()
    mailchimp_recurring_segment = serializers.SerializerMethodField()
    mailchimp_store = serializers.SerializerMethodField()
    mailchimp_one_time_contribution_product = serializers.SerializerMethodField()
    mailchimp_recurring_contribution_product = serializers.SerializerMethodField()
    stripe_account_id = serializers.ReadOnlyField(source="payment_provider_stripe.stripe_account_id")
    id = serializers.ReadOnlyField(source="id")
    name = serializers.ReadOnlyField(source="name")
    slug = serializers.ReadOnlyField(source="slug")

    class Meta:
        model = RevenueProgram
        fields = [
            # NB, this is the only field that is not read only
            "mailchimp_list_id",
            "id",
            "name",
            "slug",
            "stripe_account_id",
            "mailchimp_integration_connected",
            "mailchimp_email_list",
            "mailchimp_email_lists",
            "mailchimp_server_prefix",
            "mailchimp_contributor_segment",
            "mailchimp_recurring_segment",
            "mailchimp_store",
            "mailchimp_one_time_contribution_product",
            "mailchimp_recurring_contribution_product",
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
        if not self.instance:
            logger.warning("Attempt to set mailchimp_list_id on a new RP")
            raise serializers.ValidationError("Invalid Mailchimp list ID")
        if value not in [x.id for x in self.instance.mailchimp_email_lists]:
            logger.warning("Attempt to set mailchimp_list_id to a list not associated with this RP")
            raise serializers.ValidationError("Invalid Mailchimp list ID")
        return value

    def get_mailchimp_email_list(self, obj):
        mc_list = obj.mailchimp_email_list
        return {"id": mc_list.id, "name": mc_list.name} if mc_list else None

    def get_mailchimp_email_lists(self, obj):
        return [{"id": x.id, "name": x.name} for x in obj.mailchimp_email_lists]

    def get_mailchimp_contributor_segment(self, obj):
        return asdict(obj.mailchimp_contributor_segment) if obj.mailchimp_contributor_segment else None

    def get_mailchimp_recurring_segment(self, obj):
        return asdict(obj.mailchimp_recurring_segment) if obj.mailchimp_recurring_segment else None

    def get_mailchimp_store(self, obj):
        return asdict(obj.mailchimp_store) if obj.mailchimp_store else None

    def get_mailchimp_one_time_contribution_product(self, obj):
        return (
            asdict(obj.mailchimp_one_time_contribution_product) if obj.mailchimp_one_time_contribution_product else None
        )

    def get_mailchimp_recurring_contribution_product(self, obj):
        return (
            asdict(obj.mailchimp_recurring_contribution_product)
            if obj.mailchimp_recurring_contribution_product
            else None
        )


# class RevenueProgramSerializer(serializers.ModelSerializer):
#     """
#     This is the RevenueProgram serializer you should consider updating.
#     """

#     slug = serializers.SlugField(required=False)

#     class Meta:
#         model = RevenueProgram
#         fields = ["id", "name", "slug", "tax_id", "fiscal_status", "fiscal_sponsor_name"]


class RevenueProgramSerializer(serializers.ModelSerializer):
    """
    This is the RevenueProgram serializer you should consider updating.
    """

    slug = serializers.SlugField(required=False)
    mailchimp_integration_connected = serializers.ReadOnlyField()
    mailchimp_email_lists = serializers.SerializerMethodField()
    mailchimp_email_list = serializers.SerializerMethodField()
    mailchimp_server_prefix = serializers.ReadOnlyField(allow_null=True)
    mailchimp_contributor_segment = serializers.SerializerMethodField()
    mailchimp_recurring_segment = serializers.SerializerMethodField()
    mailchimp_store = serializers.SerializerMethodField()
    mailchimp_one_time_contribution_product = serializers.SerializerMethodField()
    mailchimp_recurring_contribution_product = serializers.SerializerMethodField()

    class Meta:
        model = RevenueProgram
        fields = [
            "id",
            "name",
            "slug",
            "tax_id",
            "fiscal_status",
            "fiscal_sponsor_name",
            "mailchimp_integration_connected",
            "mailchimp_email_list",
            "mailchimp_email_lists",
            "mailchimp_list_id",
            "mailchimp_server_prefix",
            "mailchimp_contributor_segment",
            "mailchimp_recurring_segment",
            "mailchimp_store",
            "mailchimp_one_time_contribution_product",
            "mailchimp_recurring_contribution_product",
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
        if not self.instance:
            logger.warning("Attempt to set mailchimp_list_id on a new RP")
            raise serializers.ValidationError("Invalid Mailchimp list ID")
        if value not in [x.id for x in self.instance.mailchimp_email_lists]:
            logger.warning("Attempt to set mailchimp_list_id to a list not associated with this RP")
            raise serializers.ValidationError("Invalid Mailchimp list ID")
        return value

    def get_mailchimp_email_list(self, obj):
        mc_list = obj.mailchimp_email_list
        return {"id": mc_list.id, "name": mc_list.name} if mc_list else None

    def get_mailchimp_email_lists(self, obj):
        return [{"id": x.id, "name": x.name} for x in obj.mailchimp_email_lists]

    def get_mailchimp_contributor_segment(self, obj):
        return asdict(obj.mailchimp_contributor_segment) if obj.mailchimp_contributor_segment else None

    def get_mailchimp_recurring_segment(self, obj):
        return asdict(obj.mailchimp_recurring_segment) if obj.mailchimp_recurring_segment else None

    def get_mailchimp_store(self, obj):
        return asdict(obj.mailchimp_store) if obj.mailchimp_store else None

    def get_mailchimp_one_time_contribution_product(self, obj):
        return (
            asdict(obj.mailchimp_one_time_contribution_product) if obj.mailchimp_one_time_contribution_product else None
        )

    def get_mailchimp_recurring_contribution_product(self, obj):
        return (
            asdict(obj.mailchimp_recurring_contribution_product)
            if obj.mailchimp_recurring_contribution_product
            else None
        )


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
