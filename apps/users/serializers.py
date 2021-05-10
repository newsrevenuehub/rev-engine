from datetime import datetime

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.timezone import make_aware, utc

from rest_framework import serializers

from apps.organizations.serializers import OrganizationSerializer


def aware_utcnow():
    return make_aware(datetime.utcnow(), timezone=utc)


class UserSerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField()
    expires = serializers.SerializerMethodField()

    def get_organization(self, obj):
        org = obj.organizations.first()
        return OrganizationSerializer(org).data

    def get_expires(self, obj):
        return aware_utcnow() + settings.USER_TTL

    class Meta:
        model = get_user_model()
        fields = [
            "id",
            "expires",
            "email",
            "organization",
        ]
