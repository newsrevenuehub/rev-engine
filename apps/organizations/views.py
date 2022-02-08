import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from rest_framework import permissions, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.api.permissions import UserBelongsToOrg
from apps.organizations import serializers
from apps.organizations.models import Feature, Organization, Plan, RevenueProgram


user_model = get_user_model()

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class ReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, *args):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True


class RevenueProgramLimitedMixin:
    model = None

    def get_queryset(self):
        """
        Filter quersets such that only instances belonging to revenue programs this user has access to are returned.
        """
        model_has_rp_rel = hasattr(self.model, "revenue_program")
        if model_has_rp_rel and not self.request.user.is_superuser:
            revenue_programs = self.request.user.get_revenue_programs()
            return self.model.objects.filter(revenue_program__in=revenue_programs)
        return self.model.objects.all()


class OrganizationLimitedListView:
    model = None

    def get_queryset(self):
        """
        Filters querysets such that only instances belonging to the logged in user's organization are returned.
        """
        if isinstance(self, Organization):
            return self.model.objects.filter(pk=self.id)

        # Ensure the model in question has a relationship to Organization
        model_has_org_rel = hasattr(self.model, "organization")
        if model_has_org_rel and self.action == "list" and not self.request.user.is_superuser:
            return self.model.objects.filter(organization__users=self.request.user)
        return self.model.objects.all()


class OrganizationViewSet(OrganizationLimitedListView, viewsets.ReadOnlyModelViewSet):
    model = Organization
    permission_classes = [IsAuthenticated, UserBelongsToOrg, ReadOnly]
    serializer_class = serializers.OrganizationSerializer


class FeatureViewSet(viewsets.ReadOnlyModelViewSet, ReadOnly):
    model = Feature
    queryset = Feature.objects.all()
    serializer_class = serializers.FeatureSerializer


class PlanViewSet(viewsets.ReadOnlyModelViewSet, ReadOnly):
    model = Plan
    queryset = Plan.objects.all()
    serializer_class = serializers.PlanSerializer


class RevenueProgramViewSet(OrganizationLimitedListView, viewsets.ReadOnlyModelViewSet, ReadOnly):
    model = RevenueProgram
    queryset = RevenueProgram.objects.all()
    serializer_class = serializers.RevenueProgramSerializer
    pagination_class = None
