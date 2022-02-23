import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from rest_framework import viewsets

from apps.api.permissions import ReadOnly, append_permission_classes
from apps.organizations import serializers
from apps.organizations.models import Feature, Organization, Plan, RevenueProgram


user_model = get_user_model()

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    model = Organization
    queryset = Organization.objects.all()
    permission_classes = append_permission_classes([ReadOnly])
    serializer_class = serializers.OrganizationSerializer
    pagination_class = None


class FeatureViewSet(viewsets.ReadOnlyModelViewSet, ReadOnly):
    model = Feature
    queryset = Feature.objects.all()
    serializer_class = serializers.FeatureSerializer
    pagination_class = None


class PlanViewSet(viewsets.ReadOnlyModelViewSet, ReadOnly):
    model = Plan
    queryset = Plan.objects.all()
    serializer_class = serializers.PlanSerializer
    pagination_class = None


class RevenueProgramViewSet(viewsets.ReadOnlyModelViewSet, ReadOnly):
    model = RevenueProgram
    queryset = RevenueProgram.objects.all()
    serializer_class = serializers.RevenueProgramSerializer
    pagination_class = None
