"""Contains views for API resources that are exposed only to Switchboard."""

import logging

from django.conf import settings
from django.db import IntegrityError
from django.http import HttpRequest
from django.shortcuts import get_object_or_404

from knox.auth import TokenAuthentication
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.serializers import ValidationError

from apps.api.authentication import JWTHttpOnlyCookieAuthentication
from apps.api.permissions import IsSwitchboardAccount
from apps.contributions import serializers
from apps.contributions.models import Contribution, Contributor


# This is a fragment of the error message that is raised when contribution constraint that requries only one of _revenue_program
# or donation_page to be set is violated. We have a custom exception handler that needs to catch this error. The full constraint
# name gets truncated in the error message so we use this fragment to identify the error.
EXCLUSIVE_RP_OR_PAGE_CONSTRAINT_LABEL_FRAGMENT = "exclusive_donation_page_or__revenue"
EXCLUSIVE_RP_OR_PAGE_CONSTRAINT_ERROR_MESSAGE = "A contribution can only set one of revenue_program or page"

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
        """Ensure select db-level errors get a 400 or 409.

        For uniqueness constraints around provider_subscription_id, provider_payment_id, and provider_setup_intent_id, we
        want to return a 409 Conflict status code. On creation in particular, this will signal to Switchboard that it needs
        to update an existing contribution rather than create a new one.

        We also look for violation of our exclusive constraint that requires only one of _revenue_program or donation_page to be set.
        We need a custom handler here to ensure we get a 400 status code for this error, along with an appropriate message.
        """
        if isinstance(exc, IntegrityError) and EXCLUSIVE_RP_OR_PAGE_CONSTRAINT_LABEL_FRAGMENT in (
            exc.args[0] if exc.args else ""
        ):
            return Response(
                {"detail": EXCLUSIVE_RP_OR_PAGE_CONSTRAINT_ERROR_MESSAGE}, status=status.HTTP_400_BAD_REQUEST
            )
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
        email = request.data.get("email")
        if (existing := Contributor.objects.filter(email__iexact=email.strip())).exists():

            return Response(
                {
                    "error": f"A contributor (ID: {(_first:=existing.first()).id}) with email {_first.email} already exists"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request)


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsSwitchboardAccount])
def contributor_by_email(request: HttpRequest, email: str) -> Response:
    """Retrieve a contributor by email."""
    contributor = get_object_or_404(Contributor.objects.all(), email=email)
    serializer = serializers.SwitchboardContributorSerializer(contributor)
    return Response(serializer.data)
