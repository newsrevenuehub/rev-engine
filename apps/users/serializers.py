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


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")

# max length here is same as base User class
PASSWORD_MAX_LENGTH = 128


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
        if obj.is_superuser:
            return ("superuser", "Superuser")
        role_assignment = obj.get_role_assignment()
        return (role_assignment.role_type, role_assignment.get_role_type_display()) if role_assignment else None

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
            return None
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
        password = validated_data.pop("password")
        User = get_user_model()
        user = User(**validated_data)
        user.set_password(password)
        user.is_active = False
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password") if "password" in validated_data else None
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

    def get_fields(self, *args, **kwargs):
        fields = super().get_fields(*args, **kwargs)
        request = self.context.get("request", None)
        if request and getattr(request, "method", None) == "PATCH":
            fields["accepted_terms_of_service"].required = False
            fields["password"].required = False
        return fields

    class Meta:
        model = get_user_model()
        fields = [
            "accepted_terms_of_service",
            "email",
            "email_verified",
            "flags",
            "id",
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
