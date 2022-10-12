import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

import stripe
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.reverse import reverse
from stripe.error import StripeError

from apps.api.permissions import HasRoleAssignment
from apps.organizations import serializers
from apps.organizations.models import Organization, RevenueProgram
from apps.public.permissions import IsActiveSuperUser
from apps.users.views import FilterQuerySetByUserMixin


user_model = get_user_model()

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet, FilterQuerySetByUserMixin):
    """Organizations exposed through API

    Only superusers and users with roles can access. Queryset is filtered by user.
    """

    model = Organization
    queryset = Organization.objects.all()
    permission_classes = [IsAuthenticated, IsActiveSuperUser | HasRoleAssignment]
    serializer_class = serializers.OrganizationSerializer
    pagination_class = None

    def get_queryset(self):
        # this is supplied by FilterQuerySetByUserMixin
        return self.filter_queryset_for_user(self.request.user, self.model.objects.all())


class RevenueProgramViewSet(viewsets.ReadOnlyModelViewSet):
    model = RevenueProgram
    queryset = RevenueProgram.objects.all()
    # only superusers can access
    permission_classes = [IsAuthenticated, IsActiveSuperUser]
    serializer_class = serializers.RevenueProgramSerializer
    pagination_class = None


def get_stripe_account_link_return_url(request):
    """This function exists purely to create a distinct return url when running locally to enable the full...

    flow spanning SPA and backend and off-site Stripe form completion to be traversed.
    """
    reversed = reverse("index")
    if settings.STRIPE_ACCOUNT_LINK_RETURN_BASE_URL:
        return f"{settings.STRIPE_ACCOUNT_LINK_RETURN_BASE_URL}{reversed}"
    else:
        return request.build_absolute_uri(reversed)


@api_view(["POST"])
@permission_classes([IsAuthenticated, HasRoleAssignment])
def handle_stripe_account_link(request, rp_pk):
    revenue_program = get_object_or_404(RevenueProgram, pk=rp_pk)
    if not request.user.roleassignment.can_access_rp(revenue_program):
        logger.warning(
            (
                "[handle_stripe_account_link] was asked to report on status of account link for RP with ID %s by user with id %s who does "
                "not have access."
            ),
            rp_pk,
            request.user.id,
        )
        raise PermissionDenied(f"You do not have permission to access revenue program with the PK {rp_pk}")
    if not (payment_provider := revenue_program.payment_provider):
        logger.warning(
            (
                "[handle_stripe_account_link] was asked to handle RP with ID %s , "
                "but that RP does not have a payment provider."
            ),
            rp_pk,
        )
        return Response(
            {"detail": "The revenue program doesn't have a payment provider."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    if payment_provider.stripe_verified:
        return Response({"requiresVerification": False})
    if not payment_provider.stripe_account_id:
        try:
            account = stripe.Account.create(
                type="standard",
                country=revenue_program.country,
            )
        except StripeError:
            logger.exception("[handle_stripe_account_link] A stripe error occurred")
            return Response(
                {"detail": "Something went wrong creating Stripe account. Try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        payment_provider.stripe_account_id = account["id"]
        payment_provider.save()
    else:
        try:
            account = stripe.Account.retrieve(payment_provider.stripe_account_id)
        except StripeError:
            logger.exception("[handle_stripe_account_link] A stripe error occurred")
            return Response(
                {"detail": "Something went wrong retrieving the Stripe account for this RP. Try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    if account["charges_enabled"]:
        if not payment_provider.stripe_verified:
            payment_provider.stripe_verified = True
            payment_provider.save()
        return Response({"requiresVerification": False})
    raw_reason = account["requirements"]["disabled_reason"]
    reason = (
        "past_due"
        if "past_due" in raw_reason
        else "pending_verification"
        if "pending_verification" in raw_reason
        else "unknown"
    )
    data = {"requiresVerification": True, "reason": reason, "stripeConnectStarted": account["details_submitted"]}
    if reason == "past_due":
        try:
            stripe_response = stripe.AccountLink.create(
                account=payment_provider.stripe_account_id,
                # The URL the user will be redirected to if the account link is expired, has been
                # previously-visited, or is otherwise invalid.
                refresh_url=get_stripe_account_link_return_url(request),
                # The URL that the user will be redirected to upon leaving or completing the linked flow.
                return_url=get_stripe_account_link_return_url(request),
                type="account_onboarding",
            )
            data = data | stripe_response
        except StripeError:
            logger.exception("[handle_stripe_account_link] A stripe error occurred")
            return Response(
                {"detail": "Cannot get stripe account link status at this time. Try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    return Response(data)
