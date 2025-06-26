"""Contains views for API resources that are exposed only to Switchboard."""

import logging

from django.conf import settings
from django.http import HttpRequest
from django.shortcuts import get_object_or_404

import django_filters
import reversion
from django_filters.rest_framework import DjangoFilterBackend
from knox.auth import TokenAuthentication
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from reversion.views import RevisionMixin

from apps.api.authentication import JWTHttpOnlyCookieAuthentication
from apps.api.mixins import UniquenessConstraintViolationViewSetMixin
from apps.api.permissions import IsSwitchboardAccount
from apps.common.utils import LEFT_UNCHANGED, booleanize_string
from apps.contributions import serializers
from apps.contributions.models import Contribution, Contributor, Payment


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


SEND_RECEIPT_QUERY_PARAM = "send_receipt"


class SwitchboardContributionFilter(django_filters.FilterSet):
    contributor_id = django_filters.NumberFilter(field_name="contributor__id")
    # TODO @leo: clean this up after below ticket is complete, we will not have duplicates at that point
    #  https://news-revenue-hub.atlassian.net/browse/DEV-5782
    contributor_email = django_filters.CharFilter(field_name="contributor__email", lookup_expr="iexact")

    class Meta:
        model = Contribution
        fields = ["provider_subscription_id", "provider_payment_id", "contributor_email", "contributor_id"]


class SwitchboardContributionsViewSet(
    UniquenessConstraintViolationViewSetMixin,
    viewsets.GenericViewSet,
    viewsets.mixins.CreateModelMixin,
    viewsets.mixins.ListModelMixin,
    viewsets.mixins.RetrieveModelMixin,
    viewsets.mixins.UpdateModelMixin,
):
    """Viewset for switchboard to update contributions."""

    permission_classes = [IsSwitchboardAccount]
    http_method_names = ["patch", "post", "get"]
    queryset = Contribution.objects.all().select_related("donation_page__revenue_program")
    serializer_class = serializers.SwitchboardContributionSerializer
    # TODO @BW: Remove JWTHttpOnlyCookieAuthentication after DEV-5549
    # DEV-5571
    authentication_classes = [TokenAuthentication, JWTHttpOnlyCookieAuthentication]
    filter_backends = [DjangoFilterBackend]
    filterset_class = SwitchboardContributionFilter

    # TODO @BW: Make calling _handle_receipt_email fault tolerant
    # DEV-6162
    def _handle_receipt_email(self, contribution: Contribution) -> None:
        if booleanize_string(self.request.query_params.get(SEND_RECEIPT_QUERY_PARAM, "")):
            contribution.handle_receipt_email()

    def perform_create(self, serializer: serializers.SwitchboardContributionSerializer):
        """Send a receipt email if requested in a query param.

        The default is to not send it.

        Because we are only creating database models with this serializer, not
        Stripe objects, duplicate receipt emails shouldn't occur. We assume
        callers have already created an appropriate Stripe object (e.g. payment
        intent or subscription).
        """
        # TODO @BW: Make this transaction rollback if the email fails
        # DEV-5961
        with reversion.create_revision():
            contribution: Contribution = serializer.save()
            reversion.set_comment("Contribution created by Switchboard")
        self._handle_receipt_email(contribution)

    def perform_update(self, serializer):
        with reversion.create_revision():
            contribution = serializer.save()
            reversion.set_comment("Contribution updated by Switchboard")
        self._handle_receipt_email(contribution)

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


class SwitchboardContributorsViewSet(
    viewsets.GenericViewSet,
    viewsets.mixins.CreateModelMixin,
    viewsets.mixins.RetrieveModelMixin,
):
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
        contributor, action = Contributor.get_or_create_contributor_by_email(request.data.get("email"))
        if action == LEFT_UNCHANGED:
            return Response(
                {"error": f"A contributor (ID: {contributor.id}) with email {contributor.email} already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.serializer_class(contributor)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(methods=["get"], url_path="email/(?P<email>[^/]+)", detail=False)
    def get_by_email(self, request: HttpRequest, email: str) -> Response:
        contributor = get_object_or_404(Contributor.objects.all(), email__iexact=email.strip())
        serializer = serializers.SwitchboardContributorSerializer(contributor)
        return Response(serializer.data)


class SwitchboardPaymentsViewSet(
    RevisionMixin,
    UniquenessConstraintViolationViewSetMixin,
    viewsets.GenericViewSet,
    viewsets.mixins.CreateModelMixin,
    viewsets.mixins.ListModelMixin,
    viewsets.mixins.RetrieveModelMixin,
    viewsets.mixins.UpdateModelMixin,
):
    """ViewSet for switchboard to retrieve, create and update payments."""

    permission_classes = [IsSwitchboardAccount]
    http_method_names = ["get", "post", "patch"]
    queryset = Payment.objects.all()
    serializer_class = serializers.SwitchboardPaymentSerializer
    authentication_classes = [TokenAuthentication]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["stripe_balance_transaction_id"]

    def perform_create(self, serializer):
        with reversion.create_revision():
            serializer.save()
            reversion.set_comment("Payment created by Switchboard")

    def perform_update(self, serializer):
        with reversion.create_revision():
            serializer.save()
            reversion.set_comment("Payment updated by Switchboard")
