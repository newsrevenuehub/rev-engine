import csv
import logging
import os
from typing import List

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect

import stripe
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.exceptions import ParseError
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
    IsContributorOwningContribution,
    IsHubAdmin,
)
from apps.contributions import serializers
from apps.contributions.filters import ContributionFilter
from apps.contributions.models import (
    CachedStripeContributionResult,
    Contribution,
    ContributionInterval,
    ContributionIntervalError,
    ContributionStatus,
    ContributionStatusError,
    Contributor,
)
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.stripe_contributions_provider import SubscriptionsCacheProvider
from apps.contributions.tasks import task_pull_serialized_stripe_contributions_to_cache
from apps.contributions.utils import export_contributions_to_csv
from apps.contributions.webhooks import StripeWebhookProcessor
from apps.emails.tasks import send_templated_email_with_attachment
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


@create_revision()
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
        logger.exception("Invalid signature on Stripe webhook request. Is STRIPE_WEBHOOK_SECRET set correctly?")
        return Response(data={"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        logger.info("Processing event.")
        processor = StripeWebhookProcessor(event)
        processor.process()
    except ValueError:
        logger.exception("Something went wrong processing webhook")
    except Contribution.DoesNotExist:
        logger.exception("Could not find contribution")

    return Response(status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name="dispatch")
class PaymentViewset(mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    permission_classes = []
    lookup_field = "uuid"
    queryset = Contribution.objects.all()

    def get_serializer_class(self):
        if (interval := self.request.data["interval"]) == ContributionInterval.ONE_TIME:
            return serializers.CreateOneTimePaymentSerializer
        elif interval in (ContributionInterval.MONTHLY.value, ContributionInterval.YEARLY.value):
            return serializers.CreateRecurringPaymentSerializer
        else:
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
                (
                    "`PaymentViewset.destroy` was called on a contribution with status other than %s or %s. "
                    "contribution.id: %s, contribution.status: %s,  contributor.id: %s, donation_page.id: %s"
                ),
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
    """This view is used by the SPA after a Stripe payment has been submitted to Stripe from front end.

    We provide the url for this view to `return_url` parameter we call Stripe to confirm payment on front end,
    and use this view to trigger a thank you email to the contributor if the org has configured the contribution page
    accordingly.
    """
    try:
        contribution = Contribution.objects.get(uuid=uuid)
    except Contribution.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    contribution.handle_thank_you_email()
    return Response(status=status.HTTP_204_NO_CONTENT)


class ContributionsViewSet(viewsets.ReadOnlyModelViewSet):
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

    def filter_queryset_for_user(
        self, user: UserModel | Contributor
    ) -> QuerySet | List[CachedStripeContributionResult]:
        """Return the right results to the right user

        Contributors get cached serialized contribution data (if it's already cached when this runs, otherwise,
        query to Stripe will happen in background, and this will return an empty list).
        """
        ra = getattr(user, "get_role_assignment", lambda: None)()
        if isinstance(user, Contributor):
            return self.filter_queryset_for_contributor(user)
        elif user.is_anonymous:
            return self.model.objects.none()
        elif user.is_superuser:
            return self.model.objects.all()
        elif ra:
            return self.model.objects.filtered_by_role_assignment(ra)
        else:
            logger.warning("Encountered unexpected user")
            raise ApiConfigurationError

    def get_queryset(self):
        return self.filter_queryset_for_user(self.request.user)

    def filter_queryset_for_contributor(self, contributor) -> List[CachedStripeContributionResult]:
        """ """
        if (rp_slug := self.request.GET.get("rp", None)) is None:
            logger.warning("")
            raise ParseError("rp not supplied")
        rp = get_object_or_404(RevenueProgram, slug=rp_slug)
        return self.model.objects.filter_queryset_for_contributor(contributor, rp)

    def filter_queryset(self, queryset):
        """Remove filter backend if user is a contributor

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
        try:
            contributions_in_csv = export_contributions_to_csv(
                self.model.objects.all() if request.user.is_staff else self.get_queryset()
            )

            send_templated_email_with_attachment.delay(
                to=request.user.email,
                subject="Check out your Contributions",
                text_template="nrh-contribution-csv-email-body.txt",
                html_template="nrh-contribution-csv-email-body.html",
                template_data={
                    "logo_url": os.path.join(settings.SITE_URL, "static", "nre_logo_black_yellow.png"),
                },
                attachment=contributions_in_csv,
                content_type="text/csv",
                filename="contributions.csv",
            )
            return Response(data={"detail": "success"}, status=status.HTTP_200_OK)
        except csv.Error:
            logger.exception("Error while generating contributions csv file.")
            return Response(
                data={"status": "failed", "detail": "Something went wrong generating CSV export"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            logger.exception("Unexpected error.")
            return Response(
                data={"status": "failed", "detail": "Something went wrong"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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
        #  TODO: [DEV-3227] Here...
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
