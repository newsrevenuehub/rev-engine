import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect

import stripe
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
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
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.stripe_contributions_provider import (
    ContributionsCacheProvider,
    SubscriptionsCacheProvider,
)
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
        logger.exception("Could not find contribution matching provider_payment_id")

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


@api_view(["PATCH"])
@permission_classes([])
def payment_success(request, provider_client_secret_id=None):
    """This view is used by the SPA after a Stripe payment has been submitted to Stripe from front end.

    We provide the url for this view to `return_url` parameter we call Stripe to confirm payment on front end,
    and use this view to trigger a thank you email to the contributor if the org has configured the contribution page
    accordingly.
    """
    try:
        contribution = Contribution.objects.get(provider_client_secret_id=provider_client_secret_id)
    except Contribution.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    contribution.handle_thank_you_email()
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
    filter_backends = [DjangoFilterBackend]

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
            return [
                x
                for x in contributions
                if x.get("revenue_program") == self.request.query_params["rp"]
                and x.get("provider_payment_id") is not None
            ]

        # this is supplied by FilterQuerySetByUserMixin
        return self.filter_queryset_for_user(
            self.request.user, self.model.objects.filter(provider_payment_id__isnull=False)
        )

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


class SubscriptionsViewSet(viewsets.ViewSet):
    permission_classes = [
        IsAuthenticated,
    ]
    serializer_class = serializers.SubscriptionsSerializer

    def _fetch_subscriptions(self, request):
        revenue_program_slug = request.query_params.get("revenue_program_slug")
        try:
            revenue_program = RevenueProgram.objects.get(slug=revenue_program_slug)
        except RevenueProgram.DoesNotExist:
            return Response({"detail": "Revenue Program not found"}, status=status.HTTP_404_NOT_FOUND)
        cache_provider = SubscriptionsCacheProvider(self.request.user.email, revenue_program.stripe_account_id)
        subscriptions = cache_provider.load()
        if not subscriptions:
            task_pull_serialized_stripe_contributions_to_cache(
                self.request.user.email, revenue_program.stripe_account_id
            )

        subscriptions = cache_provider.load()
        return [x for x in subscriptions if x.get("revenue_program_slug") == revenue_program_slug]

    def retrieve(self, request, pk):
        subscriptions = self._fetch_subscriptions(request)
        for subscription in subscriptions:
            if (
                subscription.get("revenue_program_slug") == self.request.query_params["revenue_program_slug"]
                and subscription.get("id") == pk
            ):
                return Response(subscription, status=status.HTTP_200_OK)
        return Response({"detail": "Not Found"}, status=status.HTTP_404_NOT_FOUND)

    def list(self, request):
        subscriptions = self._fetch_subscriptions(request)
        return Response(subscriptions, status=status.HTTP_200_OK)

    def partial_update(self, request, pk):
        """
        payment_method_id - the new payment method id to use for the subscription
        revenue_program_slug - the revenue program this subscription belongs to
        """
        if request.data.keys() != {"payment_method_id", "revenue_program_slug"}:
            return Response({"detail": "Request contains unsupported fields"}, status=status.HTTP_400_BAD_REQUEST)

        revenue_program_slug = request.data.get("revenue_program_slug")
        revenue_program = RevenueProgram.objects.get(slug=revenue_program_slug)

        # TODO: [DEV-2286] should we look in the cache first for the Subscription (and related) objects to avoid extra API calls?
        subscription = stripe.Subscription.retrieve(
            pk, stripe_account=revenue_program.payment_provider.stripe_account_id, expand=["customer"]
        )
        if request.user.email.lower() != subscription.customer.email.lower():
            # TODO: [DEV-2287] should we find a way to user DRF's permissioning scheme here instead?
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        payment_method_id = request.data.get("payment_method_id")

        try:
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=subscription.customer.id,
                stripe_account=revenue_program.payment_provider.stripe_account_id,
            )
        except stripe.error.StripeError:
            logger.exception("stripe.PaymentMethod.attach returned a StripeError")
            return Response({"detail": "Error attaching payment method"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            stripe.Subscription.modify(
                pk,
                default_payment_method=payment_method_id,
                stripe_account=revenue_program.payment_provider.stripe_account_id,
            )
        except stripe.error.StripeError:
            logger.exception("stripe.Subscription.modify returned a StripeError")
            return Response({"detail": "Error updating Subscription"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # TODO: [DEV-2438] return the updated sub and update the cache

        return Response({"detail": "Success"}, status=status.HTTP_204_NO_CONTENT)

    def destroy(self, request, pk):
        """
        revenue_program_slug - the revenue program this subscription belongs to
        """
        revenue_program_slug = request.data.get("revenue_program_slug")
        revenue_program = RevenueProgram.objects.get(slug=revenue_program_slug)
        # TODO: [DEV-2286] should we look in the cache first for the Subscription (and related) objects?
        subscription = stripe.Subscription.retrieve(
            pk, stripe_account=revenue_program.payment_provider.stripe_account_id, expand=["customer"]
        )
        if request.user.email.lower() != subscription.customer.email.lower():
            # TODO: [DEV-2287] should we find a way to user DRF's permissioning scheme here instead?
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        try:
            stripe.Subscription.delete(pk, stripe_account=revenue_program.payment_provider.stripe_account_id)
        except stripe.error.StripeError:
            logger.exception("stripe.Subscription.delete returned a StripeError")
            return Response({"detail": "Error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # TODO: [DEV-2438] return the canceled sub and update the cache

        return Response({"detail": "Success"}, status=status.HTTP_204_NO_CONTENT)
