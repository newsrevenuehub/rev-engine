import logging

from django.conf import settings
from django.contrib.auth import get_user_model

import stripe
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.api.permissions import UserBelongsToOrg
from apps.contributions import serializers
from apps.contributions.filters import ContributionFilter
from apps.contributions.models import Contribution, ContributionInterval, Contributor
from apps.contributions.payment_managers import (
    PaymentBadParamsError,
    PaymentProviderError,
    StripePaymentManager,
)
from apps.contributions.utils import get_hub_stripe_api_key
from apps.contributions.webhooks import StripeWebhookProcessor
from apps.emails.models import EmailTemplateError, PageEmailTemplate


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")

UserModel = get_user_model()


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def stripe_payment(request):
    pi_data = request.data

    # Grab required data from headers
    pi_data["referer"] = request.META.get("HTTP_REFERER")
    pi_data["ip"] = request.META.get("HTTP_X_FORWARDED_FOR")

    # StripePaymentManager will grab the right serializer based on "interval"
    stripe_payment = StripePaymentManager(data=pi_data)

    # Validate data expected by Stripe and BadActor API
    stripe_payment.validate()

    # Performs request to BadActor API
    stripe_payment.get_bad_actor_score()

    try:
        if stripe_payment.validated_data["interval"] == ContributionInterval.ONE_TIME:
            # Create payment intent with Stripe, associated local models, and send email to donor.
            stripe_payment_intent = stripe_payment.create_one_time_payment()
            response_body = {"detail": "Success", "clientSecret": stripe_payment_intent["client_secret"]}
            template = PageEmailTemplate.get_template(
                PageEmailTemplate.ContactType.ONE_TIME_DONATION, stripe_payment.get_donation_page()
            )
            template.one_time_donation(stripe_payment)
        else:
            # Create subscription with Stripe, associated local models
            stripe_payment.create_subscription()
            response_body = {"detail": "Success"}
    except PaymentBadParamsError:
        logger.warning("stripe_payment view raised a PaymentBadParamsError")
        return Response({"detail": "There was an error processing your payment."}, status=status.HTTP_400_BAD_REQUEST)
    except PaymentProviderError as pp_error:  # pragma: no cover
        error_message = str(pp_error)
        logger.error(error_message)
        return Response({"detail": error_message}, status=status.HTTP_400_BAD_REQUEST)
    except EmailTemplateError as email_error:  # pragma: no cover
        msg = f"Email could not be sent to donor: {email_error}"
        logger.warning(msg)

    return Response(response_body, status=status.HTTP_200_OK)


@api_view(["POST"])
def stripe_onboarding(request):
    organization = request.user.get_organization()

    try:
        account = stripe.Account.create(
            type="standard",
            api_key=get_hub_stripe_api_key(),
        )

        organization.stripe_account_id = account.id
        organization.save()

        account_links = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f"{settings.SITE_URL}?cb=stripe_reauth",
            return_url=f"{settings.SITE_URL}?cb=stripe_return",
            type="account_onboarding",
            api_key=get_hub_stripe_api_key(),
        )
    except stripe.error.StripeError:
        return Response(
            {"detail": "There was a problem connecting to Stripe. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(account_links, status=status.HTTP_200_OK)


@api_view(["POST"])
def stripe_confirmation(request):
    try:
        organization = request.user.get_organization()
        # An org that doesn't have a stripe_account_id hasn't gone through onboarding
        if not organization.stripe_account_id:
            return Response({"status": "not_connected"}, status=status.HTTP_202_ACCEPTED)
        # A previously confirmed account can spare the stripe API call
        if organization.stripe_verified:
            return Response({"status": "connected"}, status=status.HTTP_200_OK)

        # A "Confirmed" stripe account has "charges_enabled": true on return from stripe.Account.retrieve
        stripe_account = stripe.Account.retrieve(organization.stripe_account_id, api_key=get_hub_stripe_api_key())

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
    organization.save()

    # Now that we're verified, create and associate default product
    organization.create_default_stripe_product()
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
        logger.warn("Invalid payload from Stripe webhook request")
        return Response(data={"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError:
        logger.warn("Invalid signature on Stripe webhook request. Is STRIPE_WEBHOOK_SECRET set correctly?")
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


class ContributionsListView(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, UserBelongsToOrg]
    serializer_class = serializers.ContributionSerializer
    model = Contribution

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = ContributionFilter

    def get_queryset(self):
        """
        We should limit by organization if the requesting user is a User (OrgAdmin).
        If they're a Contributor, we should show them all the contributions under their name.
        """
        if isinstance(self.request.user, Contributor):
            return self.model.objects.filter(contributor=self.request.user)

        if self.action == "list" and hasattr(self.model, "organization"):
            return self.model.objects.filter(organization__users=self.request.user)
        return self.model.objects.all()

    def get_serializer_class(self):
        if isinstance(self.request.user, UserModel):
            return serializers.ContributionSerializer
        return serializers.ContributorContributionSerializer
