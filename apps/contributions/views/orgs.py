"""Contains views for API resources that are exposed to organizations."""

import logging

from django.conf import settings

import stripe
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from reversion.views import create_revision

from apps.api.exceptions import ApiConfigurationError
from apps.api.permissions import (
    HasFlaggedAccessToContributionsApiResource,
    HasRoleAssignment,
    IsContributor,
)
from apps.contributions import serializers
from apps.contributions.filters import ContributionFilter
from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus, ContributionStatusError
from apps.contributions.tasks import (
    email_contribution_csv_export_to_user,
    task_verify_apple_domain,
)
from apps.emails.models import TransactionalEmailRecord
from apps.organizations.models import PaymentProvider, RevenueProgram
from apps.public.permissions import IsActiveSuperUser


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@create_revision()
@api_view(["POST"])
@permission_classes([IsAuthenticated, HasRoleAssignment | IsActiveSuperUser])
def stripe_oauth(request):
    scope = request.data.get("scope")
    code = request.data.get("code")
    revenue_program_id = request.data.get("revenue_program_id")
    if not revenue_program_id:
        return Response(
            {"missing_params": "revenue_program_id missing required params"}, status=status.HTTP_400_BAD_REQUEST
        )

    if not scope or not code:
        return Response({"missing_params": "stripe_oauth missing required params"}, status=status.HTTP_400_BAD_REQUEST)

    if scope != settings.STRIPE_OAUTH_SCOPE:
        return Response(
            {"scope_mismatch": "stripe_oauth received unexpected scope"}, status=status.HTTP_400_BAD_REQUEST
        )

    revenue_program = RevenueProgram.objects.get(id=revenue_program_id)

    try:
        logger.info("[stripe_oauth] Attempting to perform oauth with Stripe for revenue program %s", revenue_program_id)
        oauth_response = stripe.OAuth.token(
            grant_type="authorization_code",
            code=code,
        )
        payment_provider = revenue_program.payment_provider
        if not payment_provider:
            logger.info(
                "[stripe_oauth] Payment provider not yet created for revenue program %s, proceeding with creation...",
                revenue_program_id,
            )
            payment_provider = PaymentProvider.objects.create(
                stripe_account_id=oauth_response["stripe_user_id"],
                stripe_oauth_refresh_token=oauth_response["refresh_token"],
            )
            logger.info(
                "[stripe_oauth] Payment provider for revenue program %s created: %s",
                revenue_program_id,
                payment_provider.id,
            )
            revenue_program.payment_provider = payment_provider
            revenue_program.save()
        else:
            logger.info(
                "[stripe_oauth] Updating existing payment provider %s for revenue program %s",
                payment_provider.id,
                revenue_program_id,
            )
            payment_provider.stripe_account_id = oauth_response["stripe_user_id"]
            payment_provider.stripe_oauth_refresh_token = oauth_response["refresh_token"]
            payment_provider.save()
        logger.info(
            "[stripe_oauth] Starting Apple Pay domain verification background task for revenue program slug: %s",
            revenue_program.slug,
        )
        task_verify_apple_domain.delay(revenue_program_slug=revenue_program.slug)
        logger.info(
            "[stripe_oauth] Started Apple Pay domain verification background task for revenue program slug: %s",
            revenue_program.slug,
        )
    except stripe.oauth_error.InvalidGrantError:
        logger.exception("[stripe_oauth] stripe.OAuth.token failed due to an invalid code")
        return Response({"invalid_code": "stripe_oauth received an invalid code"}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"detail": "success"}, status=status.HTTP_200_OK)


class ContributionsViewSet(viewsets.ReadOnlyModelViewSet):
    """Contributions API resource.

    NB: There are bespoke actions on this viewset that override the default permission classes set here.
    """

    permission_classes = [
        IsAuthenticated,
        (HasFlaggedAccessToContributionsApiResource & (HasRoleAssignment | IsActiveSuperUser)),
    ]
    model = Contribution
    filterset_class = ContributionFilter
    filter_backends = [DjangoFilterBackend]
    serializer_class = serializers.ContributionSerializer

    def get_queryset(self):
        """Return the right results to the right user."""
        ra = getattr((user := self.request.user), "get_role_assignment", lambda: None)()
        if user.is_anonymous:
            return self.model.objects.none().with_first_payment_date()
        if user.is_superuser:
            return self.model.objects.all().with_first_payment_date()
        if ra:
            return self.model.objects.filtered_by_role_assignment(ra).with_first_payment_date()
        logger.warning("Encountered unexpected user %s", user.id)
        raise ApiConfigurationError

    def destroy(self, request, pk: int) -> Response:
        """Cancel a recurring contribution.

        This only should be called on contributions that have an active Stripe
        subscription, e.g. have completed checkout.

        This parallels the handle_delete() method on PortalContributorsViewSet.
        It cancels the Stripe subscription. When that succeeds, Webhook event
        listeners will delete the object or update contribution status as
        appropriate.
        """
        contribution = self.get_object()
        try:
            contribution.cancel_existing(actor=request.user)
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

    @action(
        detail=True,
        methods=["post"],
        url_path="send-receipt",
    )
    def send_receipt(self, request, pk) -> Response:
        contribution = self.get_object()
        if contribution.status not in (
            ContributionStatus.CANCELED,
            ContributionStatus.PAID,
            ContributionStatus.REFUNDED,
        ):
            # 404 so we don't leak information about contributions; these are
            # treated identically to nonexistent ones.
            return Response(status=status.HTTP_404_NOT_FOUND)
        TransactionalEmailRecord.send_receipt_email(
            contribution=contribution,
            show_billing_history=contribution.interval != ContributionInterval.ONE_TIME.value,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(
        methods=["post"],
        url_path="email-contributions",
        detail=False,
        permission_classes=[~IsContributor, IsAuthenticated, IsAdminUser | HasRoleAssignment],
    )
    def email_contributions(self, request):
        """Endpoint to send contributions as a csv file to the user request.

        Any user who has role and authenticated will be able to call the endpoint.
        Contributor will not be able to access this endpoint as it's being integrated with the Contribution Dashboard
        as contributors will be able to access only Contributor Portal via magic link.
        """
        logger.info(
            "enqueueing email_contribution_csv_export_to_user task for user %s",
            request.user,
        )
        logger.debug(
            "enqueueing email_contribution_csv_export_to_user task for request: %s",
            request,
        )
        ra = request.user.get_role_assignment()
        show_upgrade_prompt = (
            not request.user.is_superuser
            and ra
            and (org := getattr(ra, "organization", None))
            and org.plan.name == "FREE"
        )
        email_contribution_csv_export_to_user.delay(
            list(self.get_queryset().values_list("id", flat=True)),
            request.user.email,
            show_upgrade_prompt,
        )
        return Response(data={"detail": "success"}, status=status.HTTP_200_OK)
