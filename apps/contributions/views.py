import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect

import stripe
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.exceptions import NotFound, ParseError
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from reversion.views import create_revision
from stripe.error import StripeError

from apps.api.exceptions import ApiConfigurationError
from apps.api.permissions import (
    HasFlaggedAccessToContributionsApiResource,
    HasRoleAssignment,
    IsContributor,
    IsContributorOwningContribution,
    IsSwitchboardAccount,
    UserIsRequestedContributor,
)
from apps.contributions import serializers
from apps.contributions.filters import ContributionFilter, PortalContributionFilter
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionIntervalError,
    ContributionStatus,
    ContributionStatusError,
    Contributor,
)
from apps.contributions.stripe_contributions_provider import (
    ContributionsCacheProvider,
    StripePiAsPortalContribution,
    SubscriptionsCacheProvider,
)
from apps.contributions.tasks import (
    email_contribution_csv_export_to_user,
    process_stripe_webhook_task,
    task_pull_serialized_stripe_contributions_to_cache,
    task_verify_apple_domain,
)
from apps.organizations.models import PaymentProvider, RevenueProgram
from apps.public.permissions import IsActiveSuperUser


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")

UserModel = get_user_model()


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


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def process_stripe_webhook(request):
    logger.debug("Processing stripe webhook: %s", request.body)
    sig_header = request.META["HTTP_STRIPE_SIGNATURE"]
    try:
        raw_data = stripe.Webhook.construct_event(
            request.body, sig_header, settings.STRIPE_WEBHOOK_SECRET_CONTRIBUTIONS
        )
    except ValueError:
        logger.warning("Invalid payload from Stripe webhook request")
        return Response(data={"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError:
        logger.exception(
            "Invalid signature on Stripe webhook request. Is STRIPE_WEBHOOK_SECRET_CONTRIBUTIONS set correctly?"
        )
        return Response(data={"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)
    process_stripe_webhook_task.delay(raw_event_data=raw_data)
    return Response(status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name="dispatch")
class PaymentViewset(mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    permission_classes = []
    lookup_field = "uuid"
    queryset = Contribution.objects.all()

    def get_serializer_class(self):
        try:
            interval = self.request.data["interval"]
        except KeyError as err:
            raise ValidationError({"interval": "The interval field is required"}) from err
        if interval == ContributionInterval.ONE_TIME:
            return serializers.CreateOneTimePaymentSerializer
        if interval in (ContributionInterval.MONTHLY.value, ContributionInterval.YEARLY.value):
            return serializers.CreateRecurringPaymentSerializer
        raise ValidationError({"interval": "The provided value for interval is not permitted"})

    def get_serializer_context(self):
        # we need request in context for create in order to supply
        # metadata to request to bad actor api, in serializer
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

    def destroy(self, request, *args, **kwargs):
        contribution = self.get_object()
        if contribution.status not in (ContributionStatus.PROCESSING, ContributionStatus.FLAGGED):
            logger.warning(
                "`PaymentViewset.destroy` was called on a contribution with status other than %s or %s."
                " contribution.id: %s, contribution.status: %s,  contributor.id: %s, donation_page.id: %s",
                ContributionStatus.PROCESSING.label,
                ContributionStatus.FLAGGED.label,
                contribution.id,
                contribution.get_status_display(),
                contribution.contributor.id,
                contribution.donation_page.id,
            )
            return Response(status=status.HTTP_409_CONFLICT)
        try:
            contribution.cancel()
        except ContributionIntervalError:
            logger.exception(
                "`PaymentViewset.destroy` called for contribution with unexpected interval %s", contribution.interval
            )
            return Response({"detail": "Something went wrong"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except ContributionStatusError:
            logger.exception(
                "`PaymentViewset.destroy` called for contribution with unexpected status %s", contribution.status
            )
            return Response({"detail": "Something went wrong"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except StripeError:
            logger.exception(
                "Something went wrong with Stripe while attempting to cancel payment with UUID %s",
                str(contribution.uuid),
            )
            return Response({"detail": "Something went wrong"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["PATCH"])
@permission_classes([])
def payment_success(request, uuid=None):
    """SPA sends after a Stripe payment has been submitted to Stripe from front end.

    We provide the url for this view to `return_url` parameter we call Stripe to confirm payment on front end,
    and use this view to trigger a thank you email to the contributor if the org has configured the contribution page
    accordingly.
    """
    logger.info("called with uuid %s", uuid)
    logger.debug("called with request data: %s, uuid %s", request.data, uuid)
    try:
        contribution = Contribution.objects.get(uuid=uuid)
    except Contribution.DoesNotExist:
        logger.warning("payment_success called with invalid uuid %s", uuid)
        return Response(status=status.HTTP_404_NOT_FOUND)
    contribution.handle_thank_you_email()
    return Response(status=status.HTTP_204_NO_CONTENT)


class ContributionsViewSet(viewsets.ReadOnlyModelViewSet):
    """Contributions API resource.

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

    def filter_queryset_for_user(self, user: UserModel | Contributor) -> QuerySet | list[StripePiAsPortalContribution]:
        """Return the right results to the right user.

        Contributors get cached serialized contribution data (if it's already cached when this runs, otherwise,
        query to Stripe will happen in background, and this will return an empty list).
        """
        ra = getattr(user, "get_role_assignment", lambda: None)()
        if isinstance(user, Contributor):
            return self.filter_queryset_for_contributor(user)
        if user.is_anonymous:
            return self.model.objects.none()
        if user.is_superuser:
            return self.model.objects.all()
        if ra:
            return self.model.objects.filtered_by_role_assignment(ra)
        logger.warning("Encountered unexpected user")
        raise ApiConfigurationError

    def get_queryset(self):
        return self.filter_queryset_for_user(self.request.user)

    def filter_queryset_for_contributor(self, contributor) -> list[StripePiAsPortalContribution]:
        if (rp_slug := self.request.GET.get("rp", None)) is None:
            raise ParseError("rp not supplied")
        rp = get_object_or_404(RevenueProgram, slug=rp_slug)
        return self.model.objects.filter_queryset_for_contributor(contributor, rp)

    def filter_queryset(self, queryset):
        """Remove filter backend if user is a contributor.

        We need to do this because for contributor users we return a list of dicts representing
        contributions, and not a normal Django queryset.
        """
        if isinstance(self.request.user, Contributor):
            return queryset
        return super().filter_queryset(queryset)

    def get_serializer_class(self):
        if isinstance(self.request.user, Contributor):
            return serializers.PaymentProviderContributionSerializer
        return serializers.ContributionSerializer

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


class SubscriptionsViewSet(viewsets.ViewSet):
    permission_classes = [
        IsAuthenticated,
    ]
    serializer_class = serializers.SubscriptionsSerializer

    @staticmethod
    def _fetch_subscriptions(request: Request) -> list[StripePiAsPortalContribution]:
        revenue_program_slug = request.query_params.get("revenue_program_slug")
        try:
            revenue_program = RevenueProgram.objects.get(slug=revenue_program_slug)
        except RevenueProgram.DoesNotExist:
            logger.warning("Revenue program not found for slug %s", revenue_program_slug)
            raise Http404("Revenue program not found") from None
        cache_provider = SubscriptionsCacheProvider(request.user.email, revenue_program.stripe_account_id)
        subscriptions = cache_provider.load()
        if not subscriptions:
            task_pull_serialized_stripe_contributions_to_cache(request.user.email, revenue_program.stripe_account_id)
            subscriptions = cache_provider.load()
        return [x for x in subscriptions if x.get("revenue_program_slug") == revenue_program_slug]

    def retrieve(self, request, pk):
        # TODO @BW: Revisit SubscriptionsViewSet with a view towards security concerns...
        # DEV-3227
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

    def partial_update(self, request: Request, pk: str) -> Response:
        logger.info("Updating subscription %s", pk)
        if request.data.keys() != {"payment_method_id", "revenue_program_slug"}:
            return Response({"detail": "Request contains unsupported fields"}, status=status.HTTP_400_BAD_REQUEST)

        revenue_program_slug = request.data.get("revenue_program_slug")
        revenue_program = RevenueProgram.objects.get(slug=revenue_program_slug)

        try:
            subscription = stripe.Subscription.retrieve(
                pk, stripe_account=revenue_program.payment_provider.stripe_account_id, expand=["customer"]
            )
        except stripe.error.StripeError:
            logger.exception("stripe.Subscription.retrieve returned a StripeError")
            return Response({"detail": "subscription not found"}, status=status.HTTP_404_NOT_FOUND)

        if (email := request.user.email.lower()) != subscription.customer.email.lower():
            # TODO @DC: should we find a way to user DRF's permissioning scheme here instead?
            # DEV-2287
            # treat as not found so as to not leak info about subscription
            logger.warning("User %s attempted to update unowned subscription %s", email, pk)
            return Response({"detail": "subscription not found"}, status=status.HTTP_404_NOT_FOUND)
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
            subscription = stripe.Subscription.modify(
                pk,
                default_payment_method=payment_method_id,
                stripe_account=revenue_program.payment_provider.stripe_account_id,
                expand=[
                    # this is expanded so can properly serialize sub and upsert in cache
                    "default_payment_method",
                    # this is expanded so can re-retrieve PI below
                    "latest_invoice",
                ],
            )
        except stripe.error.StripeError:
            logger.exception("stripe.Subscription.modify returned a StripeError when modifying subscription %s", pk)
            return Response({"detail": "Error updating Subscription"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            self._re_retrieve_pi_and_insert_pi_and_sub_into_cache(
                subscription=subscription,
                email=email,
                stripe_account_id=revenue_program.payment_provider.stripe_account_id,
            )
        except stripe.error.StripeError:
            # we only log an exception here because the subscription has already been updated
            logger.exception(
                "stripe.PaymentIntent.retrieve returned a StripeError when re-retrieving pi related to subscription %s after update",
                subscription.id,
            )
        # TODO @DC: return the updated sub
        # DEV-2438
        return Response({"detail": "Success"}, status=status.HTTP_204_NO_CONTENT)

    def destroy(self, request: Request, pk: str) -> Response:
        logger.info("Attempting to cancel subscription %s", pk)
        revenue_program_slug = request.data.get("revenue_program_slug")
        revenue_program = RevenueProgram.objects.get(slug=revenue_program_slug)
        try:
            subscription = stripe.Subscription.retrieve(
                pk, stripe_account=revenue_program.payment_provider.stripe_account_id, expand=["customer"]
            )
        except stripe.error.StripeError:
            logger.exception("stripe.Subscription.retrieve returned a StripeError")
            return Response({"detail": "subscription not found"}, status=status.HTTP_404_NOT_FOUND)

        if (email := request.user.email.lower()) != subscription.customer.email.lower():
            logger.warning("User %s attempted to delete unowned subscription %s", email, pk)
            # TODO @DC: should we find a way to user DRF's permissioning scheme here instead?
            # DEV-2287
            # treat as not found so not leak info about subscription
            return Response({"detail": "subscription not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            stripe.Subscription.delete(pk, stripe_account=revenue_program.payment_provider.stripe_account_id)
        except stripe.error.StripeError:
            logger.exception("stripe.Subscription.delete returned a StripeError")
            return Response({"detail": "Error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response = Response({"detail": "Success"}, status=status.HTTP_204_NO_CONTENT)
        # We re-retrieve here in order to update the cache with updated subscription data
        try:
            sub = stripe.Subscription.retrieve(
                pk,
                stripe_account=revenue_program.payment_provider.stripe_account_id,
                expand=[
                    "default_payment_method",
                    "latest_invoice.payment_intent",
                ],
            )
        except stripe.error.StripeError:
            # in this case, we only want to log because the subscription has already been canceled and user shouldn't retry
            logger.exception(
                "stripe.Subscription.retrieve returned a StripeError after canceling subscription %s",
                subscription.id,
            )
            return response
        try:
            # we need to re-retrieve the PI separately because Stripe only lets you have 4 levels of expansion
            self._re_retrieve_pi_and_insert_pi_and_sub_into_cache(
                subscription=sub,
                email=email,
                stripe_account_id=revenue_program.payment_provider.stripe_account_id,
            )
        except stripe.error.StripeError:
            # in this case, we only want to log because the subscription has already been canceled and user shouldn't retry
            logger.exception(
                "stripe.PaymentIntent.retrieve returned a StripeError after canceling subscription when working on subscription %s",
                subscription.id,
            )
        # TODO @DC: return the canceled sub
        # DEV-2438
        return response

    @staticmethod
    def update_subscription_and_pi_in_cache(
        email: str,
        stripe_account_id: str,
        subscription: stripe.Subscription,
        payment_intent: stripe.PaymentIntent | None = None,
    ) -> None:
        """Update respective caches after a subscription is updated or canceled."""
        logger.info(
            "Updating caches for subscription %s and payment intent %s",
            subscription.id,
            payment_intent.id if payment_intent else None,
        )
        pi_cache_provider = ContributionsCacheProvider(email, stripe_account_id)
        sub_cache_provider = SubscriptionsCacheProvider(email, stripe_account_id)
        sub_cache_provider.upsert([subscription])
        if payment_intent:
            pi_cache_provider.upsert([payment_intent])
        # this means it's for an uninvoiced subscription
        elif not subscription.latest_invoice:
            pi_cache_provider.upsert_uninvoiced_subscriptions(
                pi_cache_provider.convert_uninvoiced_subs_into_contributions([subscription])
            )

    @staticmethod
    def update_uninvoiced_subscription_in_cache(email: str, stripe_account_id: str, subscription: stripe.Subscription):
        """Update respective caches after a subscription is updated or canceled."""
        logger.info("Updating caches for subscription %s", subscription.id)
        sub_cache_provider = SubscriptionsCacheProvider(email, stripe_account_id)
        sub_cache_provider.upsert([subscription])

    @classmethod
    def _re_retrieve_pi_and_insert_pi_and_sub_into_cache(
        cls, subscription: stripe.Subscription, email: str, stripe_account_id: str
    ) -> None:
        """Re-retrieve PI and insert into cache after a subscription is updated or canceled."""
        logger.info("Called for subscription %s", subscription.id)
        pi_id = subscription.latest_invoice.payment_intent if subscription.latest_invoice else None
        pi = (
            stripe.PaymentIntent.retrieve(
                pi_id,
                stripe_account=stripe_account_id,
                expand=["payment_method", "invoice.subscription.default_payment_method"],
            )
            if pi_id
            else None
        )
        cls.update_subscription_and_pi_in_cache(
            email=email,
            stripe_account_id=stripe_account_id,
            subscription=subscription,
            payment_intent=pi,
        )


class SwitchboardContributionsViewSet(mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Viewset for switchboard to update contributions."""

    permission_classes = [IsSwitchboardAccount]
    http_method_names = ["patch"]
    queryset = Contribution.objects.all()
    serializer_class = serializers.SwitchboardContributionSerializer


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

        impact = contributor.get_impact([rp] if rp else None)

        return Response(impact, status=status.HTTP_200_OK)

    def get_contributor_queryset(self, contributor):
        return (
            contributor.contribution_set.all()
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
    )
    def contributions_list(self, request, pk=None):
        """Endpoint to get all contributions for a given contributor."""
        contributor = self._get_contributor_and_check_permissions(request, pk)
        qs = self.get_contributor_queryset(contributor)
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
            contribution: Contribution = self.get_contributor_queryset(contributor).get(pk=contribution_id)
        except Contribution.DoesNotExist:
            return Response({"detail": "Contribution not found"}, status=status.HTTP_404_NOT_FOUND)
        contribution.handle_thank_you_email(
            show_billing_history=contribution.interval != ContributionInterval.ONE_TIME.value
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
            contribution = self.get_contributor_queryset(contributor).get(pk=contribution_id)
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
        if not contribution.is_cancelable:
            logger.warning("Request was made to cancel uncancelable contribution %s", contribution.id)
            return Response({"detail": "Cannot cancel contribution"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            stripe.Subscription.delete(
                contribution.provider_subscription_id,
                stripe_account=contribution.revenue_program.payment_provider.stripe_account_id,
            )
        except stripe.error.StripeError:
            logger.exception(
                "stripe.Subscription.delete returned a StripeError trying to cancel subscription %s associated with contribution %s",
                contribution.provider_subscription_id,
                contribution.id,
            )
            return Response({"detail": "Problem canceling contribution"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(status=status.HTTP_204_NO_CONTENT)
