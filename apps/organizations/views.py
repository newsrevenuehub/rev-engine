import logging

from django.conf import settings

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.api.permissions import UserBelongsToOrg
from apps.organizations import serializers
from apps.organizations.models import Feature, Organization, Plan, RevenueProgram


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


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

    @action(detail=False, methods=["get"], permission_classes=[], authentication_classes=[])
    def stripe_account_id(self, request):
        revenue_program_slug = request.GET.get("revenue_program_slug")
        if not revenue_program_slug:
            return Response(
                {"detail": 'Missing required parameter "revenue_program_slug"'}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            revenue_program = RevenueProgram.objects.get(slug=revenue_program_slug)
            if not revenue_program.organization.is_verified_with_default_provider():
                logger.warning(
                    f'Donor visited donation page for revenue program "{revenue_program_slug}", but the corresponding organization does not have a verified default payment provider'
                )
                return Response(
                    {"detail": "Organization does not have a fully verified payment provider"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response(
                {"stripe_account_id": revenue_program.organization.stripe_account_id}, status=status.HTTP_200_OK
            )
        except RevenueProgram.DoesNotExist:
            logger.warning(
                f"Donor visited rev_program slug {revenue_program_slug}, but no rev_program could be found by that slug"
            )
            return Response(
                {"detail": "Could not find revenue program with provided slug"}, status=status.HTTP_404_NOT_FOUND
            )


class FeatureViewSet(viewsets.ReadOnlyModelViewSet, ReadOnly):
    model = Feature
    queryset = Feature.objects.all()
    serializer_class = serializers.FeatureSerializer


class PlanViewSet(viewsets.ReadOnlyModelViewSet, ReadOnly):
    model = Plan
    queryset = Plan.objects.all()
    serializer_class = serializers.PlanSerializer


class RevenueProgramViewSet(RevenueProgramLimitedListView, viewsets.ModelViewSet):
    model = RevenueProgram
    permission_classes = [IsAuthenticated, UserBelongsToOrg]
    serializer_class = serializers.RevenueProgramSerializer
