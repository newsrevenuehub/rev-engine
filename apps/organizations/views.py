from rest_framework import permissions, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.api.permissions import UserBelongsToOrg
from apps.organizations import serializers
from apps.organizations.models import Feature, Organization, Plan, RevenueProgram


class ReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has an `owner` attribute.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True


class RevenueProgramLimitedListView:
    model = None

    def get_queryset(self):
        if self.action == "list" and hasattr(self.model, "organization"):
            return self.model.objects.filter(organization__users=self.request.user)
        return self.model.objects.all()


class OrganizationLimitedListView:
    model = None

    def get_queryset(self):
        if isinstance(self, Organization):
            return self.model.objects.filter(pk=self.id)

        if self.action == "list" and hasattr(self.model, "organization"):
            return self.model.objects.filter(organization__users=self.request.user)
        return self.model.objects.all()


class OrganizationViewSet(OrganizationLimitedListView, viewsets.ReadOnlyModelViewSet):
    model = Organization
    permission_classes = [IsAuthenticated, UserBelongsToOrg, ReadOnly]
    serializer_class = serializers.OrganizationSerializer


class FeatureViewSet(viewsets.ReadOnlyModelViewSet):
    model = Feature
    queryset = Feature.objects.all()
    serializer_class = serializers.FeatureSerializer


class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    model = Plan
    queryset = Plan.objects.all()
    serializer_class = serializers.PlanSerializer


class RevenueProgramViewSet(RevenueProgramLimitedListView, viewsets.ModelViewSet):
    model = RevenueProgram
    permission_classes = [IsAuthenticated, UserBelongsToOrg]
    serializer_class = serializers.RevenueProgramSerializer
