from django.contrib.auth import get_user_model

from rest_framework import serializers

from apps.organizations.serializers import RevenueProgramSerializer
from apps.users.models import RoleAssignment


class UserSerializer(serializers.ModelSerializer):
    role_assignment = serializers.SerializerMethodField(method_name="get_role_assignment")

    def get_role_assignment(self, obj):
        return RoleAssignmentSerializer(obj.get_role_assignment()).data

    class Meta:
        model = get_user_model()
        fields = ["id", "email", "role_assignment"]


class RoleAssignmentSerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField(method_name="get_organization")
    revenue_programs = RevenueProgramSerializer(many=True)

    def get_organization(self, obj):
        return {"name": obj.organization.name, "slug": obj.organization.slug}

    class Meta:
        model = RoleAssignment
        fields = ["role_type", "organization", "revenue_programs"]
