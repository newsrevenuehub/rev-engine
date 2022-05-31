import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

import stripe
from rest_framework import status, viewsets
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
from apps.contributions.models import Contribution, ContributionInterval
from apps.contributions.payment_managers import (
    PaymentBadParamsError,
    PaymentProviderError,
    StripePaymentManager,
)
from apps.contributions.webhooks import StripeWebhookProcessor
from apps.emails.tasks import send_contribution_confirmation_email
from apps.organizations.models import Organization, RevenueProgram
from apps.public.permissions import IsActiveSuperUser
from apps.users.views import FilterQuerySetByUserMixin


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")

UserModel = get_user_model()


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def stripe_payment(request):
    pi_data = request.data

    # Grab required data from headers
    pi_data["referer"] = request.META.get("HTTP_REFERER")
    pi_data["ip"] = request.META["REMOTE_ADDR"]

    # StripePaymentManager will grab the right serializer based on "interval"
    stripe_payment = StripePaymentManager(data=pi_data)

    # Validate data expected by Stripe and BadActor API
    stripe_payment.validate()

    # Performs request to BadActor API
    stripe_payment.get_bad_actor_score()

    try:
        rp = RevenueProgram.objects.get(pk=request.data["revenue_program_id"])
        response_body = {
            "detail": "success",
        }

        if (interval := stripe_payment.validated_data["interval"]) == ContributionInterval.ONE_TIME.value:
            stripe_payment_intent = stripe_payment.create_one_time_payment()
            response_body["clientSecret"] = stripe_payment_intent["client_secret"]
        elif interval in (
            ContributionInterval.MONTHLY.value,
            ContributionInterval.YEARLY.value,
        ):
            stripe_payment.create_subscription()
        else:
            logger.warning("stripe_payment view recieved unexpetected interval value: [%s]", interval)
            raise PaymentBadParamsError()

        if stripe_payment.get_organization().uses_email_templates:
            contributor_email = stripe_payment.validated_data["email"]
            donation_amount_display = f"${(stripe_payment.validated_data['amount'] / 100):.2f}"
            contribution_date = timezone.now()
            interval_to_display = {
                ContributionInterval.MONTHLY.value: "month",
                ContributionInterval.YEARLY.value: "year",
            }

            template_data = {
                "contribution_date": contribution_date.strftime("%m-%d-%y"),
                "contributor_email": contributor_email,
                "contribution_amount": donation_amount_display,
                "contribution_interval": stripe_payment.validated_data["interval"],
                "contribution_interval_display_value": interval_to_display.get(
                    stripe_payment.validated_data["interval"]
                ),
                "copyright_year": contribution_date.year,
                "org_name": rp.organization.name,
            }
            send_contribution_confirmation_email.delay(contributor_email, **template_data)

    except RevenueProgram.DoesNotExist:
        logger.warning(
            "stripe_payment view called with unexpected revenue program id [%s]", request.data["revenue_program_id"]
        )
        return Response({"detail": "There was an error processing your payment"}, status=status.HTTP_400_BAD_REQUEST)

    except PaymentBadParamsError:
        logger.warning("stripe_payment view raised a PaymentBadParamsError")
        return Response({"detail": "There was an error processing your payment."}, status=status.HTTP_400_BAD_REQUEST)
    except PaymentProviderError as pp_error:  # pragma: no cover
        error_message = str(pp_error)
        logger.error(error_message)
        return Response({"detail": error_message}, status=status.HTTP_400_BAD_REQUEST)

    return Response(response_body, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, HasRoleAssignment | IsActiveSuperUser])
def stripe_oauth(request):
    scope = request.data.get("scope")
    code = request.data.get("code")
    organization_slug = request.GET.get(settings.ORG_SLUG_PARAM, None)

    if not scope or not code:
        return Response({"missing_params": "stripe_oauth missing required params"}, status=status.HTTP_400_BAD_REQUEST)

    if scope != settings.STRIPE_OAUTH_SCOPE:
        return Response(
            {"scope_mismatch": "stripe_oauth received unexpected scope"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        organization = Organization.objects.get(slug=organization_slug)
    except Organization.DoesNotExist:
        return Response(
            {"no_such_org": "Could not find organization by provided slug"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        oauth_response = stripe.OAuth.token(
            grant_type="authorization_code",
            code=code,
        )
        organization.stripe_account_id = oauth_response["stripe_user_id"]
        organization.stripe_oauth_refresh_token = oauth_response["refresh_token"]
        organization.save()
    except stripe.oauth_error.InvalidGrantError:
        logger.error("stripe.OAuth.token failed due to an invalid code")
        return Response({"invalid_code": "stripe_oauth received an invalid code"}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"detail": "success"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, HasRoleAssignment | IsActiveSuperUser])
def stripe_confirmation(request):
    organization_slug = request.GET.get(settings.ORG_SLUG_PARAM, None)
    try:
        organization = Organization.objects.get(slug=organization_slug)
    except Organization.DoesNotExist:
        return Response(
            {"no_such_org": "Could not find organization by provided slug"}, status=status.HTTP_400_BAD_REQUEST
        )
    try:
        # An org that doesn't have a stripe_account_id hasn't gone through onboarding
        if not organization.stripe_account_id:
            return Response({"status": "not_connected"}, status=status.HTTP_202_ACCEPTED)
        # A previously confirmed account can spare the stripe API call
        if organization.stripe_verified:
            # NOTE: It's important to bail early here. At the end of this view, we create a few stripe models
            # that should only be created once. We should only ever get there if it's the FIRST time we verify.
            return Response({"status": "connected"}, status=status.HTTP_200_OK)

        # A "Confirmed" stripe account has "charges_enabled": true on return from stripe.Account.retrieve
        stripe_account = stripe.Account.retrieve(organization.stripe_account_id)

    except stripe.error.StripeError:
        logger.error("stripe.Account.retrieve failed with a StripeError")
        return Response(
            {"status": "failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if not stripe_account.charges_enabled:
        return Response({"status": "restricted"}, status=status.HTTP_202_ACCEPTED)

    # If we got through all that, we're verified.
    organization.stripe_verified = True

    try:
        # Now that we're verified, create and associate default product
        organization.stripe_create_default_product()
    except stripe.error.StripeError as stripe_error:
        logger.error(f"stripe_create_default_product failed with a StripeError: {stripe_error}")
        return Response(
            {"status": "failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    organization.save()

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
    except ValueError as e:
        logger.error(e)
    except Contribution.DoesNotExist:
        logger.error("Could not find contribution matching provider_payment_id")

    return Response(status=status.HTTP_200_OK)


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

    def get_queryset(self):
        # this is supplied by FilterQuerySetByUserMixin
        return self.filter_queryset_for_user(self.request.user, self.model.objects.all())

    def get_serializer_class(self):
        if isinstance(self.request.user, UserModel):
            return serializers.ContributionSerializer
        return serializers.ContributorContributionSerializer

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
