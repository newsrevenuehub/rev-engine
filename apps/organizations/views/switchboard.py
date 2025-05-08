from django.http import HttpRequest
from django.shortcuts import get_object_or_404

from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from apps.api.permissions import IsSwitchboardAccount
from apps.organizations import serializers
from apps.organizations.models import Organization, RevenueProgram


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSwitchboardAccount]
    queryset = Organization.objects.all()
    serializer_class = serializers.OrganizationSwitchboardSerializer

    @action(detail=False, methods=["get"], url_path=r"slug/(?P<slug>[-\w]+)")
    def get_by_slug(self, _, slug=None):
        organization = get_object_or_404(Organization, slug=slug)
        serializer = serializers.OrganizationSwitchboardSerializer(organization)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path=r"subscription/(?P<subscription_id>[-\w]+)")
    def get_by_subscription_id(self, _, subscription_id=None):
        organization = get_object_or_404(Organization, stripe_subscription_id=subscription_id)
        serializer = serializers.OrganizationSwitchboardSerializer(organization)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path=r"name/(?P<name>[-\w\s]+)")
    def get_by_name(self, _, name=None):
        organizations = Organization.objects.filter(name__icontains=name)
        serializer = serializers.OrganizationSwitchboardSerializer(organizations, many=True)
        return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsSwitchboardAccount])
def get_revenue_program_activecampaign_detail(_: HttpRequest, pk: int) -> Response:
    """Return the ActiveCampaign data for the revenue program with the given ID."""
    revenue_program = get_object_or_404(RevenueProgram, pk=pk)
    return Response(serializers.ActiveCampaignRevenueProgramForSwitchboardSerializer(revenue_program).data)
