import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect

import stripe
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.api.permissions import (
    HasFlaggedAccessToContributionsApiResource,
    HasRoleAssignment,
    IsContributorOwningContribution,
    IsHubAdmin,
)
from apps.contributions import serializers
from apps.contributions.filters import ContributionFilter
from apps.contributions.models import Contribution, Contributor
from apps.contributions.payment_managers import PaymentProviderError, StripePaymentManager
from apps.contributions.stripe_contributions_provider import ContributionsCacheProvider
from apps.contributions.tasks import task_pull_serialized_stripe_contributions_to_cache
from apps.contributions.webhooks import StripeWebhookProcessor
from apps.organizations.models import PaymentProvider, RevenueProgram
from apps.public.permissions import IsActiveSuperUser
from apps.users.views import FilterQuerySetByUserMixin


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")

UserModel = get_user_model()


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
        oauth_response = stripe.OAuth.token(
            grant_type="authorization_code",
            code=code,
        )
        payment_provider = revenue_program.payment_provider
        if not payment_provider:
            payment_provider = PaymentProvider.objects.create(
                stripe_account_id=oauth_response["stripe_user_id"],
                stripe_oauth_refresh_token=oauth_response["refresh_token"],
            )
            revenue_program.payment_provider = payment_provider
            revenue_program.save()
        else:
            payment_provider.stripe_account_id = oauth_response["stripe_user_id"]
            payment_provider.stripe_oauth_refresh_token = oauth_response["refresh_token"]
            payment_provider.save()

    except stripe.oauth_error.InvalidGrantError:
        logger.error("stripe.OAuth.token failed due to an invalid code")
        return Response({"invalid_code": "stripe_oauth received an invalid code"}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"detail": "success"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, HasRoleAssignment | IsActiveSuperUser])
def stripe_confirmation(request):
    revenue_program_id = request.data.get("revenue_program_id")
    if not revenue_program_id:
        return Response(
            {"missing_params": "revenue_program_id missing required params"}, status=status.HTTP_400_BAD_REQUEST
        )
    revenue_program = RevenueProgram.objects.get(id=revenue_program_id)
    if not revenue_program:
        return Response(
            {"rp_not_found": f"RevenueProgram with ID = {revenue_program_id} is not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    payment_provider = revenue_program.payment_provider

    try:

        # A revenue program that doesn't have a stripe_account_id hasn't gone through onboarding
        if not payment_provider or not payment_provider.stripe_account_id:
            return Response({"status": "not_connected"}, status=status.HTTP_202_ACCEPTED)
        # A previously confirmed account can spare the stripe API call
        if payment_provider.stripe_verified:
            # NOTE: It's important to bail early here. At the end of this view, we create a few stripe models
            # that should only be created once. We should only ever get there if it's the FIRST time we verify.
            return Response({"status": "connected"}, status=status.HTTP_200_OK)

        # A "Confirmed" stripe account has "charges_enabled": true on return from stripe.Account.retrieve
        stripe_account = stripe.Account.retrieve(payment_provider.stripe_account_id)

    except stripe.error.StripeError:
        logger.error("stripe.Account.retrieve failed with a StripeError")
        return Response(
            {"status": "failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if not stripe_account.charges_enabled:
        return Response({"status": "restricted"}, status=status.HTTP_202_ACCEPTED)

    # If we got through all that, we're verified.
    payment_provider.stripe_verified = True

    try:
        # Now that we're verified, create and associate default product
        payment_provider.stripe_create_default_product()
    except stripe.error.StripeError:
        logger.exception("stripe_create_default_product failed with a StripeError")
        return Response(
            {"status": "failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    payment_provider.save()

    return Response({"status": "connected"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def process_stripe_webhook_view(request):
    payload = request.body
    sig_header = request.META["HTTP_STRIPE_SIGNATURE"]
    event = None
    logger.info("In process webhook.")
    try:
        logger.info("Constructing event.")
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except ValueError:
        logger.warning("Invalid payload from Stripe webhook request")
        return Response(data={"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError:
        logger.warning("Invalid signature on Stripe webhook request. Is STRIPE_WEBHOOK_SECRET set correctly?")
        return Response(data={"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        logger.info("Processing event.")
        processor = StripeWebhookProcessor(event)
        processor.process()
    except ValueError:
        logger.exception()
    except Contribution.DoesNotExist:
        logger.info("Could not find contribution matching provider_payment_id", exc_info=True)

    return Response(status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name="dispatch")
class OneTimePaymentViewSet(mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    permission_classes = []
    serializer_class = serializers.CreateOneTimePaymentSerializer
    lookup_field = "provider_client_secret_id"

    def get_serializer_context(self):
        # we need request in context for create in order to supply
        # metadata to request to bad actor api, in serializer
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

    @action(
        methods=["PATCH"],
        detail=True,
        queryset=Contribution.objects.all(),
    )
    def success(self, *args, **kwargs):
        self.get_object().handle_thank_you_email()
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name="dispatch")
class SubscriptionPaymentViewSet(mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    permission_classes = []
    serializer_class = serializers.CreateRecurringPaymentSerializer
    lookup_field = "provider_client_secret_id"

    def get_serializer_context(self):
        # we need request in context for create in order to supply
        # metadata to request to bad actor api, in serializer
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

    @action(
        methods=["PATCH"],
        detail=True,
        queryset=Contribution.objects.all(),
    )
    def success(self, *args, **kwargs):
        self.get_object().handle_thank_you_email()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ContributionsViewSet(viewsets.ReadOnlyModelViewSet, FilterQuerySetByUserMixin):
    """Contributions API resource

    NB: There are bespoke actions on this viewset that override the default permission classes set here.
    """

    # only superusers, users with roles, and contributors owning contributions
    # are permitted
    permission_classes = [
        IsAuthenticated,
        (
            # `IsContributorOwningContribution` needs to come before
            # any role-assignment based permission, as those assume that contributor users have had
            # their permission validated (in case of valid permission) upstream -- the role assignment
            # based permissions will not give permission to a contributor user.
            IsContributorOwningContribution
            | (HasFlaggedAccessToContributionsApiResource & (HasRoleAssignment | IsActiveSuperUser))
        ),
    ]
    model = Contribution
    filterset_class = ContributionFilter
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]

    def get_queryset(self):
        # load contributions from cache if the user is a contributor
        if isinstance(self.request.user, Contributor):
            rp_slug = self.request.query_params.get("rp")
            if not rp_slug:
                return Response(
                    {"detail": "Missing Revenue Program in query params"}, status=status.HTTP_400_BAD_REQUEST
                )
            revenue_program = get_object_or_404(RevenueProgram, slug=rp_slug)
            cache_provider = ContributionsCacheProvider(self.request.user.email, revenue_program.stripe_account_id)

            contributions = cache_provider.load()
            # trigger celery task to pull contributions and load to cache if the cache is empty
            if not contributions:
                task_pull_serialized_stripe_contributions_to_cache.delay(
                    self.request.user.email, revenue_program.stripe_account_id
                )
            return [x for x in contributions if x.get("revenue_program") == self.request.query_params["rp"]]

        # this is supplied by FilterQuerySetByUserMixin
        return self.filter_queryset_for_user(self.request.user, self.model.objects.all())

    def filter_queryset(self, queryset):
        # filter backend doesnot apply for contributor
        if isinstance(self.request.user, Contributor):
            return queryset
        return super().filter_queryset(queryset)

    def get_serializer_class(self):
        if isinstance(self.request.user, Contributor):
            return serializers.PaymentProviderContributionSerializer
        return serializers.ContributionSerializer

    # only superusers and hub admins have permission
    @action(methods=["post"], detail=True, permission_classes=[IsAuthenticated, IsActiveSuperUser | IsHubAdmin])
    def process_flagged(self, request, pk=None):
        reject = request.data.get("reject", None)
        if reject is None:
            return Response(data={"detail": "Missing required data"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            contribution = Contribution.objects.get(pk=pk)
            contribution.process_flagged_payment(reject=reject)
        except Contribution.DoesNotExist:
            return Response({"detail": "Could not find contribution"}, status=status.HTTP_404_NOT_FOUND)
        except PaymentProviderError as pp_error:
            return Response({"detail": str(pp_error)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(data={"detail": "rejected" if reject else "accepted"}, status=status.HTTP_200_OK)

    # only contributors owning a contribution can update payment method
    @action(methods=["patch"], detail=True, permission_classes=[IsAuthenticated, IsContributorOwningContribution])
    def update_payment_method(self, request, pk):
        if request.data.keys() != {"payment_method_id"}:
            return Response({"detail": "Request contains unsupported fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            contribution = request.user.contribution_set.get(pk=pk)
        except Contribution.DoesNotExist:
            return Response(
                {"detail": "Could not find contribution for requesting contributor"}, status=status.HTTP_404_NOT_FOUND
            )

        payment_manager = StripePaymentManager(contribution=contribution)

        try:
            payment_manager.update_payment_method(request.data["payment_method_id"])
        except PaymentProviderError as pp_error:
            error_message = str(pp_error)
            logger.error(error_message)
            return Response({"detail": error_message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "Success"}, status=status.HTTP_200_OK)

    # only contributors owning a contribution can update payment
    @action(methods=["post"], detail=True, permission_classes=[IsAuthenticated, IsContributorOwningContribution])
    def cancel_recurring_payment(self, request, pk):
        try:
            contribution = request.user.contribution_set.get(pk=pk)
        except Contribution.DoesNotExist:
            logger.error(
                "Could not find contribution for requesting contributor. This could be due to the requesting user not having permission to act on this resource."
            )
            return Response(
                {"detail": "Could not find contribution for requesting contributor"}, status=status.HTTP_404_NOT_FOUND
            )

        payment_manager = StripePaymentManager(contribution=contribution)

        try:
            payment_manager.cancel_recurring_payment()
        except PaymentProviderError as pp_error:
            error_message = str(pp_error)
            logger.error(error_message)
            return Response({"detail": error_message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "Success"}, status=status.HTTP_200_OK)
