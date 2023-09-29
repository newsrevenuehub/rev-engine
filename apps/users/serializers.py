import logging
from typing import Any, Dict, TypedDict

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction

import reversion
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from waffle import get_waffle_flag_model

from apps.organizations.models import (
    FISCAL_SPONSOR_NAME_MAX_LENGTH,
    ORG_NAME_MAX_LENGTH,
    FiscalStatusChoices,
    Organization,
    OrgNameNonUniqueError,
    PaymentProvider,
    RevenueProgram,
)
from apps.organizations.serializers import (
    OrganizationInlineSerializer,
    RevenueProgramInlineSerializer,
)
from apps.users.choices import Roles
from apps.users.constants import PASSWORD_MAX_LENGTH
from apps.users.models import RoleAssignment

from .constants import FIRST_NAME_MAX_LENGTH, JOB_TITLE_MAX_LENGTH, LAST_NAME_MAX_LENGTH
from .validators import tax_id_validator


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")

# We subtract 3 from the max length to account for the "-XY" that can be appended to the end of the name
# in the case of duplicate names. See not in CustomizeAccountSerializer.save() below for more info.
CUSTOMIZE_ACCOUNT_ORG_NAME_MAX_LENGTH = ORG_NAME_MAX_LENGTH - 3

FISCAL_SPONSOR_NAME_REQUIRED_ERROR_MESSAGE = "Please enter the fiscal sponsor name."
FISCAL_SPONSOR_NAME_NOT_PERMITTED_ERROR_MESSAGE = (
    "Only fiscally sponsored Revenue Programs can have a fiscal sponsor name."
)


class FlagSerializer(serializers.ModelSerializer):
    """Serializer for waffle.Flag"""

    class Meta:
        model = get_waffle_flag_model()
        fields = (
            fields := (
                "id",
                "name",
            )
        )
        read_only_fields = fields


_AUTHED_USER_FIELDS = (
    "accepted_terms_of_service",
    "email",
    "email_verified",
    "flags",
    "id",
    "organizations",
    "revenue_programs",
    "role_type",
)


class AuthedUserSerializer(serializers.ModelSerializer):
    """Expected use is for representing user in part of data returned in response to POST api/v1/token"""

    accepted_terms_of_service = serializers.DateTimeField()
    email = serializers.EmailField()
    email_verified = serializers.BooleanField()
    flags = FlagSerializer(many=True, source="active_flags", default=[], read_only=True)
    id = serializers.CharField()
    organizations = serializers.SerializerMethodField("get_orgs", default=[])
    revenue_programs = serializers.SerializerMethodField("get_revenue_programs", default=[])
    role_type = serializers.ChoiceField(choices=Roles.choices, default=None, allow_null=True, read_only=True)

    class Meta:
        model = get_user_model()
        fields = _AUTHED_USER_FIELDS
        read_only_fields = _AUTHED_USER_FIELDS

    def get_orgs(self, obj):
        return OrganizationInlineSerializer(
            obj.permitted_organizations,
            many=True,
        ).data

    def get_revenue_programs(self, obj):
        return RevenueProgramInlineSerializer(
            obj.permitted_revenue_programs.prefetch_related("payment_provider"), many=True
        ).data


class MutableUserSerializer(AuthedUserSerializer, serializers.ModelSerializer):
    """
    This serializer is used for creating and updating users.
    """

    password = serializers.CharField(write_only=True, max_length=PASSWORD_MAX_LENGTH)
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=get_user_model().objects.all(), lookup="icontains")],
        required=True,
    )
    accepted_terms_of_service = serializers.DateTimeField()

    # these are defined in parent but we need email verified required to be False...
    email_verified = serializers.BooleanField(required=False, read_only=True)
    # and need id to be unrequired because in case of creation, it's not known yet
    id = serializers.CharField(required=False, read_only=True)

    def create(self, validated_data):
        """We manually handle create step because password needs to be set with `set_password`"""
        password = validated_data.pop("password")
        User = get_user_model()
        user = User(**validated_data)
        user.set_password(password)
        user.is_active = True
        user.save()
        return user

    def update(self, instance, validated_data):
        """We manually handle update step because password needs to be set with `set_password`, if part of update. Additionally,

        if email address is being updated, we need to reset email verification.
        """
        password = validated_data.pop("password", None)
        old_email = instance.email
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if "email" in validated_data.keys() and instance.email != old_email:
            instance.email_verified = False
        if password:
            instance.set_password(password)
        instance.save()
        return instance

    class Meta:
        model = get_user_model()
        fields = _AUTHED_USER_FIELDS + ("password",)
        read_only_fields = [
            x for x in _AUTHED_USER_FIELDS if x not in ("password", "email", "accepted_terms_of_service")
        ]


class CustomizeAccountSerializerReturnValue(TypedDict):
    organization: Organization
    revenue_program: RevenueProgram
    user: get_user_model()
    role_assignment: RoleAssignment


class CustomizeAccountSerializer(serializers.Serializer):
    """Special custom serializer to validate data received from customize_account method"""

    first_name = serializers.CharField(write_only=True, required=True, max_length=FIRST_NAME_MAX_LENGTH)
    fiscal_sponsor_name = serializers.CharField(
        write_only=True,
        required=False,
        default=None,
        max_length=FISCAL_SPONSOR_NAME_MAX_LENGTH,
        allow_null=True,
        allow_blank=True,
    )
    fiscal_status = serializers.ChoiceField(
        choices=FiscalStatusChoices.choices,
        write_only=True,
        required=True,
    )
    last_name = serializers.CharField(write_only=True, required=True, max_length=LAST_NAME_MAX_LENGTH)
    job_title = serializers.CharField(write_only=True, required=False, default=None, max_length=JOB_TITLE_MAX_LENGTH)
    organization_name = serializers.CharField(
        write_only=True, required=True, max_length=CUSTOMIZE_ACCOUNT_ORG_NAME_MAX_LENGTH
    )
    organization_tax_id = serializers.CharField(
        write_only=True, required=False, validators=[tax_id_validator], default=None
    )

    def validate_fiscal_status(self, value):
        fiscal_sponsor_name = self.initial_data.get("fiscal_sponsor_name")
        if value == FiscalStatusChoices.FISCALLY_SPONSORED and not fiscal_sponsor_name:
            raise serializers.ValidationError({"fiscal_sponsor_name": [FISCAL_SPONSOR_NAME_REQUIRED_ERROR_MESSAGE]})
        elif fiscal_sponsor_name and value != FiscalStatusChoices.FISCALLY_SPONSORED:
            raise serializers.ValidationError(
                {"fiscal_sponsor_name": [FISCAL_SPONSOR_NAME_NOT_PERMITTED_ERROR_MESSAGE]}
            )
        return value

    @staticmethod
    def handle_organization_name(name: str) -> str:
        """We allow SPA to send an arbitrary org name, and here we attempt to ensure its uniqueness, modifying if need be

        We don't check if this is for an existing instance or not because this serializer is expected to be used
        only for creation.
        """

        try:
            return Organization.generate_unique_name(name)
        except OrgNameNonUniqueError:
            logger.warning("Organization name could not be ", exc_info=True)
            raise serializers.ValidationError({"organization_name": ["Organization name is already in use."]})

    def save(self, **kwargs):
        name = self.handle_organization_name(self.validated_data["organization_name"])
        # The initial value for organization_name is guaranteed to be at most `CUSTOMIZE_ACCOUNT_ORG_NAME_MAX_LENGTH` long at this point,
        # which is 3 less than the max length of the Organization name field. The reason for the 3 less is that we allow for handle_organization_name
        # to take that already validated value and append up to 3 characters to make it unique. That method is unit-tested elsewhere
        # to prove that it raises OrgNameNonUniqueError if it gets past `-99` in its attempts to make the name unique.
        self.validated_data["organization_name"] = name
        # This is guaranteed to meet length requirements because internally .generate_slug_from_name ensures max length doesn't exceed the value
        # set for max length on Organization.slug
        self.validated_data["organization_slug"] = Organization.generate_slug_from_name(name)
        return super().save(**kwargs)

    @transaction.atomic
    def create(self, validated_data: Dict[str, Any]) -> CustomizeAccountSerializerReturnValue:
        """Create an organization, revenue program and role assignment. Also update user with new data

        This function is wrapped in a transaction.atomic() block because we want to ensure that if any part of this
        fails, none of the entities are created.
        """
        organization = Organization.objects.create(
            name=(organization_name := validated_data["organization_name"]),
            slug=(org_slug := validated_data["organization_slug"]),
        )
        rp = RevenueProgram.objects.create(
            name=organization_name,
            organization=organization,
            slug=org_slug,
            fiscal_status=validated_data["fiscal_status"],
            tax_id=validated_data["organization_tax_id"],
            payment_provider=PaymentProvider.objects.create(),
            fiscal_sponsor_name=validated_data["fiscal_sponsor_name"],
        )
        user = self.context.get("user")
        user.first_name = validated_data["first_name"]
        user.last_name = validated_data["last_name"]
        user.job_title = validated_data["job_title"]

        with reversion.create_revision():
            # do this with revision history
            user.save(update_fields={"first_name", "last_name", "job_title", "modified"})
            reversion.set_comment("CustomizeAccountSerializer.create updated user")

        ra = RoleAssignment.objects.create(user=user, role_type=Roles.ORG_ADMIN, organization=organization)
        ra.revenue_programs.set(ra.organization.revenueprogram_set.all())
        ra.save()

        return {
            "organization": organization,
            "revenue_program": rp,
            "user": user,
            "role_assignment": ra,
        }
