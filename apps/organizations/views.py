import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.shortcuts import get_object_or_404

import stripe
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.reverse import reverse
from reversion.views import create_revision
from stripe.error import StripeError

from apps.api.permissions import (
    HasRoleAssignment,
    IsGetRequest,
    IsOrgAdmin,
    IsPatchRequest,
    IsRpAdmin,
)
from apps.organizations import serializers
from apps.organizations.models import Organization, RevenueProgram
from apps.public.permissions import IsActiveSuperUser


user_model = get_user_model()

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class OrganizationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Organizations exposed through API

    Only superusers and users with roles can access. Queryset is filtered by user.
    """

    model = Organization
    permission_classes = [
        IsAuthenticated,
        IsActiveSuperUser | (HasRoleAssignment & IsOrgAdmin & IsPatchRequest) | (HasRoleAssignment & IsGetRequest),
    ]
    serializer_class = serializers.OrganizationSerializer
    pagination_class = None

    def get_queryset(self) -> models.QuerySet:
        if self.request.user.is_superuser:
            return Organization.objects.all()
        elif ra := self.request.user.get_role_assignment():
            return Organization.objects.filtered_by_role_assignment(ra)
        # given permission clases, this may be unreachable, but logically gaurantees this returns a queryset
        else:  # pragma: no cov
            return Organization.objects.none()

    def patch(self, request, pk):
        organization = get_object_or_404(Organization, pk=pk)
        if not request.user.is_superuser and organization not in self.get_queryset():
            return Response(status=status.HTTP_404_NOT_FOUND)
        patch_serializer = serializers.OrganizationPatchSerializer(organization, data=request.data, partial=True)
        patch_serializer.is_valid()
        if patch_serializer.errors:
            logger.warning("Request %s is invalid; errors: %s", request.data, patch_serializer.errors)
            raise ValidationError(patch_serializer.errors)
        patch_serializer.save()
        organization.refresh_from_db()
        return Response(serializers.OrganizationSerializer(organization).data)


class RevenueProgramViewSet(viewsets.ModelViewSet):
    model = RevenueProgram
    permission_classes = [
        IsAuthenticated,
        IsActiveSuperUser
        | (HasRoleAssignment & IsOrgAdmin & (IsPatchRequest | IsGetRequest))
        | (HasRoleAssignment & IsRpAdmin & IsGetRequest),
    ]
    serializer_class = serializers.RevenueProgramSerializer
    pagination_class = None
    http_method_names = ["get", "patch"]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return self.model.objects.all()
        # role assignment is guaranteed to be here and have an expected role type via permission_classes above
        return self.model.objects.filtered_by_role_assignment(self.request.user.get_role_assignment())


def get_stripe_account_link_return_url(request):
    """This function exists purely to create a distinct return url when running locally to enable the full...

    flow spanning SPA and backend and off-site Stripe form completion to be traversed.
    """
    reversed = reverse("index")
    if settings.STRIPE_ACCOUNT_LINK_RETURN_BASE_URL:
        return f"{settings.STRIPE_ACCOUNT_LINK_RETURN_BASE_URL}{reversed}"
    else:
        return request.build_absolute_uri(reversed)


@create_revision()
@api_view(["POST"])
@permission_classes([IsAuthenticated, HasRoleAssignment])
def handle_stripe_account_link(request, rp_pk):
    """This endpoint facilitates multiple round trips between the SPA and Stripe's Account Link configuration which happens
    off-site.

    The flow through this view is like this:

    1. The client makes a request providing a revenue program id.
    2. Retrieve the RP's payment provider.
        a. If it's already verified, we're done.
        b. If it's not verified we continue
    3. If the payment provider does not have a Stripe account (on first run through, it usually won't), create one, attaching
    its ID back to the payment provider instance.
    4. Check if charges are enabled on the Stripe account.
        a. If they are (they won't be when account is first created), we update the payment provider's stripe_verified value to True.
        We return a response with `requiresVerification` set to `False`.
        b. If charges are not enabled we keep going.
    5. The Stripe account data tells us why the account is disabled. That reason will contain one of two prefixes: 'pending_verification' or `past_due`.
        a. If `pending_verification`, there's nothing to be done except wait. We send a response indicating that the Stripe connect process
        has started and that we're blocked by pending verification next steps to be processed on Stripe's end.
        b. If `past_due`, there are next steps for the user to do on Stripe's site. In this case, we create a new Stripe Account Link and send that URL
        back in the response.


    In testing, we've commonly had to make 3 or more round trips between the SPA and Stripe pivoting between the two via this endpoint.

    This endpoint is designed to support polling from the front end.
    """
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

        try:
            payment_provider.stripe_create_default_product()
        except StripeError:
            logger.exception("[handle_stripe_account_link] A stripe error occurred creating Stripe product")
            return Response(
                {"detail": "Something went wrong. Try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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
