from django.http import HttpRequest
from django.shortcuts import get_object_or_404

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.api.permissions import IsSwitchboardAccount
from apps.organizations import serializers
from apps.organizations.models import RevenueProgram


@api_view(["GET"])
@permission_classes([IsSwitchboardAccount])
def get_revenue_program_activecampaign_detail(request: HttpRequest, pk: int) -> Response:
    """Return the ActiveCampaign data for the revenue program with the given ID."""
    revenue_program = get_object_or_404(RevenueProgram, pk=pk)
    return Response(serializers.ActiveCampaignRevenueProgramForSwitchboardSerializer(revenue_program).data)
