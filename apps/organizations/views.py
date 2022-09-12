import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
import stripe
from stripe.error import StripeError


from apps.api.permissions import HasRoleAssignment
from apps.organizations import serializers
from apps.organizations.models import Feature, Organization, PaymentProvider, Plan, RevenueProgram
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


class FeatureViewSet(viewsets.ReadOnlyModelViewSet):
    model = Feature
    # only superusers, and can only read
    permission_classes = [IsAuthenticated, IsActiveSuperUser]
    queryset = Feature.objects.all()
    serializer_class = serializers.FeatureSerializer
    pagination_class = None


class PlanViewSet(viewsets.ReadOnlyModelViewSet, FilterQuerySetByUserMixin):
    """Organizations exposed through API

    Only superusers and users with roles can access. Queryset is filtered by user.
    """

    model = Plan
    queryset = Plan.objects.all()
    permission_classes = [IsAuthenticated, IsActiveSuperUser | HasRoleAssignment]
    serializer_class = serializers.PlanSerializer
    pagination_class = None

    def get_queryset(self):
        return self.filter_queryset_for_user(self.request.user, self.model.objects.all())


class RevenueProgramViewSet(viewsets.ReadOnlyModelViewSet):
    model = RevenueProgram
    queryset = RevenueProgram.objects.all()
    # only superusers can access
    permission_classes = [IsAuthenticated, IsActiveSuperUser]
    serializer_class = serializers.RevenueProgramSerializer
    pagination_class = None


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def link_stripe_account(request):
    # get user
    # if user wrong type, eerror
    # if already linked, let client know
    # else
    response = stripe.Account.create(
        type="standard",
        account="acct__",
        # https://stripe.com/docs/api/account_links/create#create_account_link-refresh_url
        # The URL the user will be redirected to if the account link is expired, has been
        # previously-visited, or is otherwise invalid.
        refresh_url="",
        # The URL that the user will be redirected to upon leaving or completing the linked flow.
        return_url="",
        type="account_onboarding",
    )


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def create_stripe_account(request, rp_pk=None):
    # ensure requesting user has access to RP
    # get or 404
    revenue_program = RevenueProgram.get(pk=rp_pk)
    if revenue_program.payment_provider:
        logger.info(
            (
                "[create_stripe_account] was asked to create a Stripe an account for revenue program "
                "that already has one (ID: %s)"
            ),
            revenue_program.id,
        )
        return Response(
            {"detail": "Stripe account already exists for this revenue program"}, status=status.HTTP_409_CONFLICT
        )
    try:
        stripe_response = stripe.Account.create(
            type="standard",
            country=revenue_program.country,
            # should we set this?
            email=None,
            # enum of individual company non_profit government_entity
            # https://stripe.com/docs/api/accounts/create#create_account-business_type
            business_type="",
            company={
                "name": "TBD",
            },
            metadata={},
        )
    except StripeError:
        logger.exception("[create_stripe_account] A stripe error occurred")
        return Response({"detail": ""}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    try:
        payment_provider = PaymentProvider.obects.create(
            stripe_account_id=stripe_response.id,
        )
        revenue_program.payment_provider = payment_provider
        revenue_program.save()
    except:
        pass
    return Response({"detail": "Success"}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def create_stripe_account_link(request, rp_pk=None):
    # ensure requesting user has access to RP
    # get user -- get account fo
    revenue_program = get_object_or_404()
    # rp id from request data
    # if user wrong type, eerror
    # if already linked, let client know
    # else
    try:
        stripe_response = stripe.AccountLink.create(
            type="standard",
            account="acct__",
            # https://stripe.com/docs/api/account_links/create#create_account_link-refresh_url
            # The URL the user will be redirected to if the account link is expired, has been
            # previously-visited, or is otherwise invalid.
            refresh_url="",
            # The URL that the user will be redirected to upon leaving or completing the linked flow.
            return_url="",
            type="account_onboarding",
        )
    except StripeError:
        logger.exception("[create_stripe_account_link] A stripe error occurred")
        return Response({"detail": ""}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(stripe_response, status=status.HTTP_202_ACCEPTED)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def create_stripe_account_link_complete(request, rp_pk=None):
    # ensure user has permits for rp
    # https://stripe.com/docs/connect/standard-accounts#return-user
    revenue_program = get_object_or_404()
    if revenue_program.payment_provider and revenue_program.payment_provider.stripe_verified:
        logger.info(
            (
                "[create_stripe_account_link_complete] was to do post-account-link side effects for revenue program (ID: %), "
                "but that revenue program already has a verified payment provider."
            ),
            revenue_program.id,
        )
        return Response(
            {"detail": "This RP already has a Stripe Account Link that has been verified"},
            status=status.HTTP_409_CONFLICT,
        )
    if revenue_program.payment_provider and revenue_program.payment_provider.stripe_account_id != "":
        logger.info()
        return Response()
    try:
        stripe_account = stripe.Account.retrieve("account_id")
    except StripeError:
        pass
        logger.exception("[create_stripe_account_link] A stripe error occurred")
        return Response({"detail": ""}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    # https://stripe.com/docs/api/accounts/object#account_object-details_submitted
    # we're getting the details_submitted field, which may or may not mean same as status quo
    if revenue_program.payment_provider.stripe_verified != stripe_account["details_submitted"]:
        revenue_program.payment_provider.stripe_verified = stripe_account["details_submitted"]
        revenue_program.save()
    return Response({"detail": "success"}, status=status.HTTP_202_ACCEPTED)


# DOES THIS NEED TO BE SEP, OR CAN BE SAME AS INITIAL CREATE

# @api_view(["POST"])
# @authentication_classes([])
# @permission_classes([])
# def create_stripe_account_link_refresh(request, rp_pk=None):
#     # verify user
#     revenue_program = get_object_or_404()
#     if revenue_program.payment_provider and revenue_program.payment_provider.stripe_verified:
#         logger.info(
#             "[create_stripe_account_link_refresh] ... %s",
#             revenue_program.id,
#         )
#         return Response(
#             {"detail": "This RP already has a Stripe Account Link that has been verified"},
#             status=status.HTTP_409_CONFLICT,
#         )
#     return create_stripe_account_link(request, rp_pk=rp_pk)
