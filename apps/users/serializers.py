import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q

from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from waffle import get_waffle_flag_model

from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.serializers import (
    OrganizationInlineSerializer,
    RevenueProgramInlineSerializer,
)
from apps.users.choices import Roles
from apps.users.constants import PASSWORD_MAX_LENGTH


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class UserSerializer(serializers.ModelSerializer):
    """
    This is the serializer that is used to return user data back after successful login.
    It returns a complete list of (pared-down) available Organzitions and RevenuePrograms based on the user's
    super_user status and RoleAssignment.
    """

    role_type = serializers.SerializerMethodField(method_name="get_role_type")
    organizations = serializers.SerializerMethodField(method_name="get_permitted_organizations")
    revenue_programs = serializers.SerializerMethodField(method_name="get_permitted_revenue_programs")
    flags = serializers.SerializerMethodField(method_name="get_active_flags_for_user")
    password = serializers.CharField(write_only=True, max_length=PASSWORD_MAX_LENGTH, required=True)
    email = serializers.EmailField(validators=[UniqueValidator(queryset=get_user_model().objects.all())], required=True)
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

    first_name = serializers.CharField(write_only=True, required=True)
    last_name = serializers.CharField(write_only=True, required=True)
    job_title = serializers.CharField(write_only=True, required=True)
    organization_name = serializers.CharField(write_only=True, required=True)
    organization_tax_status = serializers.ChoiceField(choices=["for-profit", "nonprofit"], required=True)

    class Meta:
        model = get_user_model()
        fields = [
            "first_name",
            "last_name",
            "job_title",
            "organization_name",
            "organization_tax_status",
        ]
