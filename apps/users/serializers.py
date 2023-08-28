import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q

from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from waffle import get_waffle_flag_model

from apps.organizations.models import (
    FISCAL_SPONSOR_NAME_MAX_LENGTH,
    ORG_NAME_MAX_LENGTH,
    FiscalStatusChoices,
    Organization,
    RevenueProgram,
)
from apps.organizations.serializers import (
    OrganizationInlineSerializer,
    RevenueProgramInlineSerializer,
)
from apps.users.choices import Roles
from apps.users.constants import PASSWORD_MAX_LENGTH

from .constants import FIRST_NAME_MAX_LENGTH, JOB_TITLE_MAX_LENGTH, LAST_NAME_MAX_LENGTH
from .validators import tax_id_validator


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")

# We subtract 3 from the max length to account for the "-XY" that can be appended to the end of the name
# in the case of duplicate names. See UserViewSet.customize_account for implementation of this.
CUSTOMIZE_ACCOUNT_ORG_NAME_MAX_LENGTH = ORG_NAME_MAX_LENGTH - 3


class UserSerializer(serializers.ModelSerializer):
    """
    This is the serializer that is used to return user data back after successful login.
    It returns a complete list of (pared-down) available Organizations and RevenuePrograms based on the user's
    super_user status and RoleAssignment.
    """

    role_type = serializers.SerializerMethodField(method_name="get_role_type")
    organizations = serializers.SerializerMethodField(method_name="get_permitted_organizations")
    revenue_programs = serializers.SerializerMethodField(method_name="get_permitted_revenue_programs")
    flags = serializers.SerializerMethodField(method_name="get_active_flags_for_user")
    password = serializers.CharField(write_only=True, max_length=PASSWORD_MAX_LENGTH, required=True)
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=get_user_model().objects.all(), lookup="icontains")], required=True
    )
    accepted_terms_of_service = serializers.DateTimeField(required=True)

    def get_role_type(self, obj):
        # `obj` will be a dict of data when serializer being used in create view
        if not isinstance(obj, get_user_model()):
            return None
        return obj.get_role_type()

    def get_permitted_organizations(self, obj):
        # `obj` will be a dict of data when serializer being used in create view
        if not isinstance(obj, get_user_model()):
            return []
        qs = Organization.objects.all()
        role_assignment = obj.get_role_assignment()
        if not role_assignment and not obj.is_superuser:
            qs = qs.none()
        elif role_assignment and role_assignment.role_type != Roles.HUB_ADMIN:
            org = getattr(role_assignment, "organization", None)
            if org is None:
                qs = qs.none()
            else:
                qs = qs.filter(pk=org.pk)
        serializer = OrganizationInlineSerializer(qs, many=True)
        return serializer.data

    def get_permitted_revenue_programs(self, obj):
        # `obj` will be a dict of data when serializer being used in create view
        if not isinstance(obj, get_user_model()):
            return []
        qs = RevenueProgram.objects.all()
        role_assignment = obj.get_role_assignment()
        if not role_assignment and not obj.is_superuser:
            qs = qs.none()
        elif not obj.is_superuser and role_assignment.role_type != Roles.HUB_ADMIN:
            if role_assignment.role_type == Roles.ORG_ADMIN:
                qs = role_assignment.organization.revenueprogram_set.all()
            elif role_assignment.role_type == Roles.RP_ADMIN:
                qs = role_assignment.revenue_programs
        serializer = RevenueProgramInlineSerializer(qs, many=True)
        return serializer.data

    def get_active_flags_for_user(self, obj):
        # `obj` will be a dict of data when serializer being used in create view
        if not isinstance(obj, get_user_model()):
            return []
        Flag = get_waffle_flag_model()
        if obj.is_superuser:
            qs = Flag.objects.filter(Q(superusers=True) | Q(everyone=True) | Q(users__in=[obj]))
        else:
            qs = Flag.objects.filter(Q(everyone=True) | Q(users__in=[obj]))
        return list(qs.values("name", "id"))

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

    def get_fields(self, *args, **kwargs):
        """Some fields that are required for creation are not required for update"""
        fields = super().get_fields(*args, **kwargs)
        request = self.context.get("request", None)
        if request and getattr(request, "method", None) == "PATCH":
            fields["accepted_terms_of_service"].required = False
            fields["accepted_terms_of_service"].read_only = True  # Is only read_only for PATCH, not POST.
            fields["password"].required = False
            fields["email"].required = False
        return fields

    class Meta:
        model = get_user_model()
        fields = [
            "id",
            "accepted_terms_of_service",
            "email",
            "email_verified",
            "flags",
            "organizations",
            "revenue_programs",
            "role_type",
            "password",
        ]
        read_only_fields = [
            "id",
            "email_verified",
            "flags",
            "organizations",
            "revenue_programs",
            "role_type",
        ]


class CustomizeAccountSerializer(UserSerializer):
    """Special custom serializer to validate data received from customize_account method"""

    first_name = serializers.CharField(write_only=True, required=True, max_length=FIRST_NAME_MAX_LENGTH)
    fiscal_sponsor_name = serializers.CharField(
        write_only=True, required=False, default=None, max_length=FISCAL_SPONSOR_NAME_MAX_LENGTH
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
            raise serializers.ValidationError("Please enter the fiscal sponsor name.")
        elif fiscal_sponsor_name and value != FiscalStatusChoices.FISCALLY_SPONSORED:
            raise serializers.ValidationError(
                "Only fiscally sponsored Revenue Programs can have a fiscal sponsor name."
            )
        return value

    class Meta:
        model = get_user_model()
        fields = [
            "first_name",
            "fiscal_sponsor_name",
            "fiscal_status",
            "last_name",
            "job_title",
            "organization_name",
            "organization_tax_id",
        ]
