from apps.organizations.models import Organization
from rest_framework import serializers


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = "__all__"
