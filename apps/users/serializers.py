from django.contrib.auth import get_user_model

from rest_framework import serializers

from apps.organizations.serializers import OrganizationSerializer


class UserSerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField()

    def get_organization(self, obj):
        org = obj.organizations.first()
        return OrganizationSerializer(org).data

    class Meta:
        model = get_user_model()
        fields = [
            "id",
            "email",
            "organization",
        ]
