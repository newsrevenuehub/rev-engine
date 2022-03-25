from django.contrib.auth import get_user_model

from rest_framework import serializers

from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.serializers import (
    OrganizationInlineSerializer,
    RevenueProgramInlineSerializer,
)
from apps.users.choices import Roles


class UserSerializer(serializers.ModelSerializer):
    """
    This is the serializer that is used to return user data back after successful login.
    It returns a complete list of (pared-down) available Organzitions and RevenuePrograms based on the user's
    super_user status and RoleAssignment.
    """

    role_type = serializers.SerializerMethodField(method_name="get_role_type")
    organizations = serializers.SerializerMethodField(method_name="get_permitted_organizations")
    revenue_programs = serializers.SerializerMethodField(method_name="get_permitted_revenue_programs")

    def get_role_type(self, obj):
        if obj.is_superuser:
            return ("superuser", "Superuser")
        role_assignment = obj.get_role_assignment()
        return (role_assignment.role_type, role_assignment.get_role_type_display()) if role_assignment else None

    def get_permitted_organizations(self, obj):
        qs = Organization.objects.all()
        role_assignment = obj.get_role_assignment()
        if not role_assignment and not obj.is_superuser:
            qs = qs.none()
        elif not obj.is_superuser and role_assignment.role_type != Roles.HUB_ADMIN:
            qs = qs.filter(pk=role_assignment.organization.pk)
        serializer = OrganizationInlineSerializer(qs, many=True)
        return serializer.data

    def get_permitted_revenue_programs(self, obj):
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

    class Meta:
        model = get_user_model()
        fields = ["id", "email", "role_type", "organizations", "revenue_programs"]
