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
    reversed = reverse("spa_stripe_account_link_complete")
    if settings.STRIPE_ACCOUNT_LINK_RETURN_BASE_URL:
        return f"{settings.STRIPE_ACCOUNT_LINK_RETURN_BASE_URL}{reversed}"
    else:
        return request.build_absolute_uri(reversed)


@api_view(["POST"])
@permission_classes([IsAuthenticated, HasRoleAssignment])
def create_stripe_account_link(request, rp_pk=None):
    """This endpoint is for the SPA to initiate the Stripe account linking process.

    If the rp's payment provider doesn't have a Stripe Account, this endpoint calls
    `stripe.Account.create` to create a Stripe Account, and saves the account id to the
    NRE payment provider instance.

    Next, it calls `stripe.accountLink.create`, including a parameter for a `return_url`, which
    should be a user-facing view in the SPA. Stripe creates an AccountLink entity (with an expiry) and provides
    an off-site URL that the user should be redirected to in the SPA in order to complete the account setup process.

    The account setup process in Stripe spans several forms. If the user provides all the required information, they'll be
    redirected to the URL provided as `return_url`.

    When `return_url` loads in the SPA, it should make an API request to `create_stripe_account_link_complete` (below)
    in order to update the payment_provider.stripe_verified value to `True` if the linked account is "charge ready".
    """
    revenue_program = get_object_or_404(RevenueProgram, pk=rp_pk)
    if not request.user.roleassignment.can_access_rp(revenue_program):
        logger.warning(
            (
                "[create_stripe_account_link] was asked to create an account link for RP with ID %s by user with id %s who does "
                "not have access."
            ),
            rp_pk,
            request.user.id,
        )
        raise PermissionDenied(f"You do not have permission to access revenue program with the PK {rp_pk}")
    if not (payment_provider := revenue_program.payment_provider):
        logger.warning(
            (
                "[create_stripe_account_link] was asked to create an account link for RP with ID %s , "
                "but that RP does not have a payment provider."
            ),
            rp_pk,
        )
        return Response(
            {"detail": "The revenue program you're trying to link doesn't have a payment provider."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    if not payment_provider.stripe_account_id:
        try:
            stripe_response = stripe.Account.create(
                type="standard",
                country=revenue_program.country,
            )
        except StripeError:
            logger.exception("[create_stripe_account_link] A stripe error occurred")
            return Response(
                {"detail": "Something went wrong creating Stripe account. Try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        payment_provider.stripe_account_id = stripe_response["id"]
        payment_provider.save()
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
    except StripeError:
        logger.exception("[create_stripe_account_link] A stripe error occurred")
        return Response(
            {"detail": "Cannot create a stripe account link at this time. Try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return Response(dict(stripe_response), status=status.HTTP_202_ACCEPTED)


@api_view(["GET"])
def get_account_link_status(request, rp_pk):
    revenue_program = get_object_or_404(RevenueProgram, pk=rp_pk)
    if not request.user.roleassignment.can_access_rp(revenue_program):
        logger.warning(
            (
                "[get_account_link_status] was asked to report on status of account link for RP with ID %s by user with id %s who does "
                "not have access."
            ),
            rp_pk,
            request.user.id,
        )
        raise PermissionDenied(f"You do not have permission to access revenue program with the PK {rp_pk}")
    if not (payment_provider := revenue_program.payment_provider):
        logger.warning(
            (
                "[get_account_link_status] was asked get status of an account link for RP with ID %s , "
                "but that RP does not have a payment provider."
            ),
            rp_pk,
        )
        return Response(
            {"detail": "The revenue program doesn't have a payment provider."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    if not payment_provider.stripe_account_id:
        logger.warning(
            (
                "[get_account_link_status] was asked get status of an account link for RP with ID %s , "
                "but that RP's payment provider does not have a stripe account id set."
            ),
            rp_pk,
        )
        return Response(
            {"detail": "The revenue program doesn't have a stripe account ID set on its payment provider."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    if payment_provider.stripe_verified:
        return Response({"stripe_verified": True})
    try:
        account = stripe.Account.retrieve(payment_provider.stripe_account_id)
    except StripeError:
        logger.exception("[get_account_link_status] A stripe error occurred")
        return Response(
            {"detail": "Something went wrong retrieving the Stripe account for this RP. Try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    if account["charges_enabled"]:
        return Response({"stripe_verified": True})
    raw_reason = account["requirements"]["disabled_reason"]
    reason = (
        "past_due"
        if "past_due" in raw_reason
        else "pending_verification"
        if "pending_verification" in raw_reason
        else "unknown"
    )
    data = {
        "stripe_verified": False,
        "reason": reason,
    }
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
            logger.exception("[get_account_link_status] A stripe error occurred")
            return Response(
                {"detail": "Cannot get stripe account link status at this time. Try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated, HasRoleAssignment])
def create_stripe_account_link_complete(request, rp_pk=None):
    """This endpoint is for the SPA to signal that a user has been redirected back from Stripe Account
    setup (after visiting the Stripe-controlled URL furnished in the call to `stripe.AccountLink.create` in
    `create_stripe_account_link`)

    After retrieving the target RP and related payment provider, if the Stripe account's `charges_enabled`
    property is True, it sets the NRE payment provider instance's `stripe_verified`
    value to `True` and saves.

    Assuming the happy path, the response data will contain a `stripe_verified` boolean which the SPA can
    use to decide what to do next in onboarding flow, without having to make an additional request to
    retrieve the revenue program anew.
    """
    revenue_program = get_object_or_404(RevenueProgram, pk=rp_pk)
    if not request.user.roleassignment.can_access_rp(revenue_program):
        logger.warning(
            (
                "[create_stripe_account_link] was asked to create an account link for RP with ID %s by user with id %s who does "
                "not have access."
            ),
            rp_pk,
            request.user.id,
        )
        raise PermissionDenied(f"You do not have permission to access revenue program with the PK {rp_pk}")

    if not (payment_provider := revenue_program.payment_provider):
        logger.warning(
            (
                "[create_stripe_account_link_complete] was asked to complete account link for RP with ID %s , "
                "but that RP does not have a payment provider."
            ),
            rp_pk,
        )
        return Response(
            {"detail": "The revenue program you're trying to update doesn't have a payment provider."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if payment_provider.stripe_verified:
        logger.info(
            (
                "[create_stripe_account_link_complete] was to do post-account-link side effects for revenue program (ID: %s), "
                "but that revenue program already has a verified payment provider with ID %s."
            ),
            rp_pk,
            payment_provider.id,
        )
        return Response(
            {"detail": "This RP already has a Stripe Account Link that has been verified"},
            status=status.HTTP_409_CONFLICT,
        )
    try:
        stripe_account = stripe.Account.retrieve(payment_provider.stripe_account_id)
    except StripeError:
        logger.exception("[create_stripe_account_link_complete] A stripe error occurred")
        return Response(
            {"detail": "An error occurred with Stripe. Try back later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    # https://stripe.com/docs/api/accounts/object#account_object-details_submitted
    payment_provider.stripe_verified = stripe_account["charges_enabled"]
    payment_provider.save()
    return Response(
        {"detail": "success", "stripe_verified": payment_provider.stripe_verified}, status=status.HTTP_202_ACCEPTED
    )
