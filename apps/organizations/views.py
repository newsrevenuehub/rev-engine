import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.api.permissions import HasRoleAssignment
from apps.organizations import serializers
from apps.organizations.models import Feature, Organization, Plan, RevenueProgram
from apps.public.permissions import IsSuperUser
from apps.users.views import FilterQuerySetByUserMixin


user_model = get_user_model()

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet, FilterQuerySetByUserMixin):
    model = Organization
    queryset = Organization.objects.all()
    permission_classes = [IsAuthenticated, IsSuperUser | HasRoleAssignment]
    serializer_class = serializers.OrganizationSerializer
    pagination_class = None

    def get_queryset(self):
        return self.filter_queryset_for_user(self.request.user, self.model.objects.all())


class FeatureViewSet(viewsets.ReadOnlyModelViewSet):
    model = Feature
    permission_classes = [IsAuthenticated, IsSuperUser]
    queryset = Feature.objects.all()
    serializer_class = serializers.FeatureSerializer
    pagination_class = None


class PlanViewSet(viewsets.ReadOnlyModelViewSet, FilterQuerySetByUserMixin):
    model = Plan
    queryset = Plan.objects.all()
    permission_classes = [IsAuthenticated, IsSuperUser | HasRoleAssignment]
    serializer_class = serializers.PlanSerializer
    pagination_class = None

    def get_queryset(self):
        return self.filter_queryset_for_user(self.request.user, self.model.objects.all())


class RevenueProgramViewSet(viewsets.ReadOnlyModelViewSet):
    model = RevenueProgram
    queryset = RevenueProgram.objects.all()
    permission_classes = [IsAuthenticated, IsSuperUser]
    serializer_class = serializers.RevenueProgramSerializer
    pagination_class = None
