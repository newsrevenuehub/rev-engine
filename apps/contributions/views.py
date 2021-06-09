import logging

from django.conf import settings

import stripe
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response

from apps.contributions.models import Contribution
from apps.contributions.payment_managers import PaymentBadParamsError, StripePaymentManager
from apps.contributions.serializers import StripeOneTimePaymentSerializer
from apps.contributions.utils import get_hub_stripe_api_key
from apps.contributions.webhooks import StripeWebhookProcessor
from apps.emails.models import PageEmailTemplate


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def stripe_one_time_payment(request):
    pi_data = request.data
    # Grab required data from headers
    pi_data["referer"] = request.META.get("HTTP_REFERER")

    pi_data["ip"] = request.META.get("HTTP_X_FORWARDED_FOR")

    # Instantiate StripePaymentManager with one-time payment serializers for validation and processing
    stripe_payment = StripePaymentManager(StripeOneTimePaymentSerializer, data=pi_data)

    # Validate data expected by Stripe and BadActor API
    stripe_payment.validate()

    # Performs request to BadActor API
    stripe_payment.get_bad_actor_score()

    try:
        # Create payment intent with Stripe, associated local models
        stripe_payment_intent = stripe_payment.create_one_time_payment()
        email = PageEmailTemplate.get_or_create_template(
            template_type=PageEmailTemplate.ContactType.ONE_TIME_DONATION,
            donation_page=stripe_payment_intent.get_donation_page(),
        )
        email.default_one_time_donation(stripe_payment)
    except PaymentBadParamsError:
        return Response({"detail": "There was an error processing your payment."}, status=status.HTTP_400_BAD_REQUEST)

    return Response(data={"clientSecret": stripe_payment_intent["client_secret"]}, status=status.HTTP_200_OK)


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

    organization.stripe_verified = True
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
        logger.error("Invalid payload from Stripe webhook request")
        return Response(data={"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid signature on Stripe webhook request. Is STRIPE_WEBHOOK_SECRET set correctly?")
        return Response(data={"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        logger.info("Processing event.")
        processor = StripeWebhookProcessor(event)
        processor.process()
    except ValueError as e:
        logger.error(e)
    except Contribution.DoesNotExist:
        logger.error("Could not find contribution matching payment_intent_id")
        return Response(data={"error": "Invalid payment_intent_id"}, status=status.HTTP_400_BAD_REQUEST)

    return Response(status=status.HTTP_200_OK)
