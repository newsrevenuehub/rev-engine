"""Contains views for API resources that are exposed only to Switchboard."""

import logging

from django.conf import settings
from django.shortcuts import get_object_or_404

from knox.auth import TokenAuthentication
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

from apps.api.permissions import IsSwitchboardAccount
from apps.contributions import serializers
from apps.contributions.models import Contribution, Contributor


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class SwitchboardContributionsViewSet(mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Viewset for switchboard to update contributions."""

    permission_classes = [IsSwitchboardAccount]
    http_method_names = ["patch"]
    queryset = Contribution.objects.all()
    serializer_class = serializers.SwitchboardContributionSerializer


class SwitchboardContributorsViewSet(mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Viewset for switchboard to update contributors."""

    permission_classes = [IsSwitchboardAccount]
    http_method_names = ["get", "post"]
    queryset = Contributor.objects.all()
    serializer_class = serializers.SwitchboardContributorSerializer
    authentication_classes = [TokenAuthentication]

    def get_object(self):
        """Get a contributor by email.

        NB: This method is case insensitive and needs to be until DEV-5503 is resolved.
        """
        email = self.kwargs.get("email")
        return get_object_or_404(self.queryset, email=email)

    def create(self, request):
        """Create a new contributor but return error response if contributor with email already exists.

        NB: At time of implementation, there is a tension between this create method which checks for case insensitive
        existing contributors and the get_object method which is case sensitive.

        Nevertheless, this is the behavior we want in short term so that we can create new contributors without
        accidentally creating duplicates (from the perspective of post DEV-5503 world).
        """
        email = request.data.get("email")
        if (existing := Contributor.objects.filter(email__iexact=email.strip())).exists():

            return Response(
                {
                    "error": f"A contributor (ID: {(_first:=existing.first()).id}) with email {_first.email} already exists"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request)
