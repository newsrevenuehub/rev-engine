"""Contains views for API resources that are exposed only to Switchboard."""

import logging

from django.conf import settings

from rest_framework import mixins, status, viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response

from apps.api.permissions import IsSwitchboardAccount
from apps.contributions import serializers
from apps.contributions.models import Contribution, Contributor


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


# Note: will this even work without CSRF being passed? Who's calling this?
class SwitchboardContributionsViewSet(mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Viewset for switchboard to update contributions."""

    permission_classes = [IsSwitchboardAccount]
    http_method_names = ["patch"]
    queryset = Contribution.objects.all()
    serializer_class = serializers.SwitchboardContributionSerializer


class SwitchboardContributorsViewSet(
    mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    """Viewset for switchboard to update contributors."""

    permission_classes = [IsSwitchboardAccount]
    http_method_names = ["get", "patch", "post"]
    queryset = Contributor.objects.all()
    serializer_class = serializers.SwitchboardContributorSerializer
    authentication_classes = [TokenAuthentication]

    def create(self, request):
        """Create a new contributor but return error response if contributor with email already exists."""
        email = request.data.get("email")
        if (existing := Contributor.objects.filter(email__iexact=email.strip())).exists():

            return Response(
                {"error": f"A contributor (ID: {existing.first().id}) with this email already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request)
