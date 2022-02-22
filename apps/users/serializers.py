from django.contrib.auth import get_user_model

from rest_framework import serializers

from apps.organizations.serializers import OrganizationSerializer, RevenueProgramSerializer
from apps.users.models import RoleAssignment


class UserSerializer(serializers.ModelSerializer):
    role_assignment = serializers.SerializerMethodField(method_name="get_role_assignment")

    def get_role_assignment(self, obj):
        return RoleAssignmentSerializer(obj.get_role_assignment()).data

    class Meta:
        model = get_user_model()
        fields = ["id", "email", "is_superuser", "role_assignment"]


class RoleAssignmentSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer()
    revenue_programs = RevenueProgramSerializer(many=True)

    class Meta:
        model = RoleAssignment
        fields = ["role_type", "organization", "revenue_programs"]
