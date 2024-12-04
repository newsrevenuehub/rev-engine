import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect

import stripe
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.exceptions import NotFound
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from reversion.views import create_revision
from stripe.error import StripeError

from apps.api.exceptions import ApiConfigurationError
from apps.api.permissions import (
    HasFlaggedAccessToContributionsApiResource,
    HasRoleAssignment,
    IsContributor,
    IsHubAdmin,
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
from apps.contributions.tasks import (
    email_contribution_csv_export_to_user,
    process_stripe_webhook_task,
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
    """Viewset for creating and deleting contributions.

    Note that the name of this class `PaymentViewset` is a misnomer, as this viewet results in creation
    and mutation of `Contribution` objects, not `Payment` objects.  This class was named before
    we had a Payment model in revengine.
    """

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

    permission_classes = [
        IsAuthenticated,
        (HasFlaggedAccessToContributionsApiResource & (HasRoleAssignment | IsActiveSuperUser)),
    ]
    model = Contribution
    filterset_class = ContributionFilter
    filter_backends = [DjangoFilterBackend]
    serializer_class = serializers.ContributionSerializer

    def filter_queryset_for_user(self, user: UserModel) -> QuerySet[Contribution]:
        """Return the right results to the right user."""
        ra = getattr(user, "get_role_assignment", lambda: None)()
        if user.is_anonymous:
            return self.model.objects.none()
        if user.is_superuser:
            return self.model.objects.all()
        if ra:
            return self.model.objects.filtered_by_role_assignment(ra)
        logger.warning("Encountered unexpected user %s", user.id)
        raise ApiConfigurationError

    def get_queryset(self):
        """Return the right results to the right user."""
        ra = getattr((user := self.request.user), "get_role_assignment", lambda: None)()
        if user.is_anonymous:
            return self.model.objects.none()
        if user.is_superuser:
            return self.model.objects.all()
        if ra:
            return self.model.objects.filtered_by_role_assignment(ra)
        logger.warning("Encountered unexpected user %s", user.id)
        raise ApiConfigurationError

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


class SwitchboardContributionsViewSet(mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Viewset for switchboard to update contributions."""

    permission_classes = [IsSwitchboardAccount]
    http_method_names = ["patch"]
    queryset = Contribution.objects.all()
    serializer_class = serializers.SwitchboardContributionSerializer


class SwitchboardContributorsViewSet(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Viewset for switchboard to update contributors."""

    permission_classes = [IsSwitchboardAccount]
    http_method_names = ["get", "patch", "post"]
    queryset = Contributor.objects.all()
    serializer_class = serializers.SwitchboardContributorSerializer

    def create(self, request, *args, **kwargs):
        email = request.data.get("email")
        if (existing := Contributor.objects.filter(email__iexact=email.strip())).exists():

            return Response(
                {
                    "error": f"A contributor (ID: {existing.first().id} with this email already exists and can be patched instead"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)


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
        permission_classes=[(IsContributor & UserIsRequestedContributor) | IsHubAdmin],
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
