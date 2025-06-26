"""Contains views that are meant to provide data to the contributor portal."""

import logging

from django.conf import settings
from django.db.models import QuerySet

import stripe
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.api.permissions import (
    IsContributor,
    IsHubAdmin,
    UserIsRequestedContributor,
)
from apps.contributions import serializers
from apps.contributions.filters import PortalContributionFilter
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatusError,
    Contributor,
)
from apps.emails.models import TransactionalEmailRecord


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class PortalContributorsViewSet(viewsets.GenericViewSet):
    """Furnish contributions data to the (new) contributor portal."""

    permission_classes = [IsAuthenticated, IsContributor, UserIsRequestedContributor]
    DEFAULT_ORDERING_FIELDS = ["created", "first_payment_date"]
    ALLOWED_ORDERING_FIELDS = ["created", "amount", "first_payment_date", "status"]
    # NB: This view is about returning contributor.contributions and never returns contributors, but
    # we need to set a queryset to satisfy DRF's viewset expectations.
    queryset = Contributor.objects.all()

    def _get_contributor_and_check_permissions(self, request, contributor_id):
        try:
            contributor = Contributor.objects.get(pk=contributor_id)
        except Contributor.DoesNotExist:
            raise NotFound(detail="Contributor not found", code=status.HTTP_404_NOT_FOUND) from None
        self.check_object_permissions(request, contributor)
        return contributor

    def get_serializer_class(self):
        return (
            serializers.PortalContributionDetailSerializer
            if self.action == "contribution_detail"
            else serializers.PortalContributionListSerializer
        )

    def handle_ordering(self, queryset, request):
        ordering_filter = OrderingFilter()
        ordering_filter.ordering_fields = self.ALLOWED_ORDERING_FIELDS
        return (
            ordering_filter.filter_queryset(request, queryset, self)
            if request.query_params.get("ordering")
            else queryset.order_by(*self.DEFAULT_ORDERING_FIELDS)
        )

    def paginate_results(self, queryset, request):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @action(
        methods=["get"],
        url_path="impact",
        url_name="impact",
        detail=True,
    )
    def contributor_impact(self, request, pk=None):
        """Endpoint that returns the sum of all contributions for a given contributor."""
        contributor = self._get_contributor_and_check_permissions(request, pk)

        rp = request.query_params.get("revenue_program", None)
        # TODO(BW): Solve for email case-sensitivity after DEV-5494
        # DEV-5501
        impact = contributor.get_impact([rp] if rp else None)

        return Response(impact, status=status.HTTP_200_OK)

    def get_contributor_contributions(self, contributor: Contributor) -> QuerySet[Contribution]:
        return (
            contributor.get_contributor_contributions_queryset()
            .exclude_hidden_statuses()
            .exclude_paymentless_canceled()
            .exclude_recurring_missing_provider_subscription_id()
            .exclude_dummy_payment_method_id()
            .with_first_payment_date()
        )

    @action(
        methods=["get"],
        url_path="contributions",
        url_name="contributions-list",
        detail=True,
        serializer_class=serializers.PortalContributionListSerializer,
        permission_classes=[(IsContributor & UserIsRequestedContributor) | IsHubAdmin],
    )
    def contributions_list(self, request, pk=None):
        """Endpoint to get all contributions for a given contributor."""
        contributor = self._get_contributor_and_check_permissions(request, pk)
        qs = self.get_contributor_contributions(contributor)
        filtered_qs = PortalContributionFilter().filter_queryset(request, qs)
        ordered_qs = self.handle_ordering(filtered_qs, request)
        return self.paginate_results(ordered_qs, request)

    @action(
        methods=["post"],
        url_path="contributions/(?P<contribution_id>[^/.]+)/send-receipt",
        url_name="contribution-receipt",
        detail=True,
        serializer_class=serializers.PortalContributionDetailSerializer,
    )
    def send_contribution_receipt(self, request, pk=None, contribution_id=None) -> Response:
        """Endpoint to send a contribution receipt email for a given contribution."""
        logger.info("send receipt with contribution_id %s", contribution_id)
        contributor = self._get_contributor_and_check_permissions(request, pk)
        try:
            contribution: Contribution = self.get_contributor_contributions(contributor).get(pk=contribution_id)
        except Contribution.DoesNotExist:
            return Response({"detail": "Contribution not found"}, status=status.HTTP_404_NOT_FOUND)
        TransactionalEmailRecord.send_receipt_email(
            contribution=contribution,
            show_billing_history=contribution.interval != ContributionInterval.ONE_TIME.value,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(
        methods=["get", "patch", "delete"],
        url_path="contributions/(?P<contribution_id>[^/.]+)",
        url_name="contribution-detail",
        detail=True,
        serializer_class=serializers.PortalContributionDetailSerializer,
    )
    def contribution_detail(self, request, pk=None, contribution_id=None) -> Response:
        """Endpoint to get or update a contribution for a given contributor."""
        contributor = self._get_contributor_and_check_permissions(request, pk)
        try:
            contribution = self.get_contributor_contributions(contributor).get(pk=contribution_id)
        except Contribution.DoesNotExist:
            return Response({"detail": "Contribution not found"}, status=status.HTTP_404_NOT_FOUND)

        kwargs = {"instance": contribution}
        if request.method == "PATCH":
            kwargs["data"] = request.data
            kwargs["partial"] = True

        serializer = self.get_serializer(**kwargs)

        # NB: we're guaranteed that request method is one of these three by @action decorator, so
        # don't need to handle default case
        match request.method:
            case "GET":
                return Response(serializer.data, status=status.HTTP_200_OK)
            case "PATCH":
                return self.handle_patch(serializer)
            case (
                "DELETE"
            ):  # NB: this path does in fact get tested, but shows up as partially covered in coverage report
                return self.handle_delete(contribution)

    def handle_patch(self, serializer: serializers.PortalContributionDetailSerializer) -> Response:
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except stripe.error.StripeError:
            return Response({"detail": "Problem updating contribution"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def handle_delete(self, contribution: Contribution) -> Response:
        """If subscription found, cancel it in Stripe.

        NB: we don't do anything to update NRE contribution status here and instead rely on ensuing webhooks to do that.
        """
        try:
            contribution.cancel_existing(actor=contribution.contributor)
        except ContributionStatusError:
            logger.warning("Request was made to cancel uncancelable contribution %s", contribution.id)
            return Response({"detail": "Cannot cancel contribution"}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.StripeError:
            logger.exception(
                "stripe.Subscription.delete returned a StripeError trying to cancel subscription %s associated with contribution %s",
                contribution.provider_subscription_id,
                contribution.id,
            )
            return Response({"detail": "Problem canceling contribution"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(status=status.HTTP_204_NO_CONTENT)
