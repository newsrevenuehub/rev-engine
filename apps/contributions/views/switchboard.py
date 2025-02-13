"""Contains views for API resources that are exposed only to Switchboard."""

import logging

from django.conf import settings
from django.http import HttpRequest
from django.shortcuts import get_object_or_404

from knox.auth import TokenAuthentication
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.serializers import ValidationError

from apps.api.authentication import JWTHttpOnlyCookieAuthentication
from apps.api.permissions import IsSwitchboardAccount
from apps.common.utils import LEFT_UNCHANGED
from apps.contributions import serializers
from apps.contributions.models import Contribution, Contributor


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class SwitchboardContributionsViewSet(
    viewsets.mixins.CreateModelMixin,
    viewsets.mixins.UpdateModelMixin,
    viewsets.mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Viewset for switchboard to update contributions."""

    permission_classes = [IsSwitchboardAccount]
    http_method_names = ["patch", "post", "get"]
    queryset = Contribution.objects.all()
    serializer_class = serializers.SwitchboardContributionSerializer
    # TODO @BW: Remove JWTHttpOnlyCookieAuthentication after DEV-5549
    # DEV-5571
    authentication_classes = [TokenAuthentication, JWTHttpOnlyCookieAuthentication]

    def handle_exception(self, exc):
        """Ensure select uniqueness constraint errors receive a 409.

        For uniqueness constraints around provider_subscription_id, provider_payment_id, and provider_setup_intent_id, we
        want to return a 409 Conflict status code. On creation in particular, this will signal to Switchboard that it needs
        to update an existing contribution rather than create a new one.
        """
        if isinstance(exc, ValidationError):
            details = exc.detail
            for errors in details.values():
                if any(x.code == "unique" for x in errors):
                    exc.status_code = status.HTTP_409_CONFLICT
                    break
        return super().handle_exception(exc)


class SwitchboardContributorsViewSet(mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Viewset for switchboard to create and retrieve contributors."""

    permission_classes = [IsSwitchboardAccount]
    http_method_names = ["get", "post"]
    queryset = Contributor.objects.all()
    serializer_class = serializers.SwitchboardContributorSerializer
    authentication_classes = [TokenAuthentication]

    def create(self, request: HttpRequest) -> Response:
        """Create a new contributor but return error response if contributor with email already exists.

        NB: At time of implementation, there is a tension between this create method which checks for case insensitive
        existing contributors and the get_object method which is case sensitive.

        Nevertheless, this is the behavior we want in short term so that we can create new contributors without
        accidentally creating duplicates (from the perspective of post DEV-5503 world).
        """
        email = request.data.get("email").strip()
        contributor, action = Contributor.get_or_create_contributor_by_email(email)
        if action == LEFT_UNCHANGED:
            return Response(
                {"error": f"A contributor (ID: {contributor.id}) with email {contributor.email} already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.serializer_class(contributor)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsSwitchboardAccount])
def contributor_by_email(request: HttpRequest, email: str) -> Response:
    """Retrieve a contributor by email."""
    contributor = get_object_or_404(Contributor.objects.all(), email=email)
    serializer = serializers.SwitchboardContributorSerializer(contributor)
    return Response(serializer.data)
