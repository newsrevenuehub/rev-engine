import logging

from django.conf import settings

import stripe
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response

from apps.contributions.models import Contribution
from apps.contributions.payment_intent import StripePaymentIntent
from apps.contributions.utils import get_hub_stripe_api_key
from apps.contributions.webhooks import StripeWebhookProcessor


# TEMP
if settings.DEBUG:  # pragma: no cover
    from faker import Faker

    faker = Faker()


logger = logging.getLogger(__name__)


def convert_money_value_to_stripe_payment_amount(amount):
    return int(float(amount) * 100)


@api_view(["POST"])
def stripe_payment_intent(request):
    pi_data = request.data.copy()

    # Grab required data from headers
    pi_data["referer"] = request.META.get("HTTP_REFERER")
    # We may or may not wish to remove this? Sending many requests from 127.0.0.1 will get you flagged every time.
    if settings.DEBUG:  # pragma: no cover
        pi_data["ip"] = faker.ipv4()
    else:
        pi_data["ip"] = request.META.get("HTTP_X_FORWARDED_FOR")

    # Convert the money formatted string incoming "10.00", to cents, 1000
    pi_data["amount"] = convert_money_value_to_stripe_payment_amount(request.data["amount"])

    # Instantiate StripePaymentIntent for validation and processing
    stripe_pi = StripePaymentIntent(data=pi_data)

    # Validate data expected by Stripe and BadActor API
    stripe_pi.validate()

    # Performs request to BadActor API
    stripe_pi.get_bad_actor_score()

    # Create payment intent with Stripe, associated local models
    stripe_payment_intent = stripe_pi.create_payment_intent()
    return Response(data={"clientSecret": stripe_payment_intent["client_secret"]}, status=status.HTTP_200_OK)


def pre_populate_account_company_from_org(org):
    return {
        "name": org.name,
        "address": {
            "line1": org.org_addr1 if org.org_addr1 else "",
            "line2": org.org_addr2 if org.org_addr2 else "",
            "city": org.org_city if org.org_city else "",
            "state": org.org_state if org.org_state else "",
            "postal_code": org.org_zip if org.org_zip else "",
        },
    }


@api_view(["POST"])
def stripe_onboarding(request):
    organization = request.user.get_organization()
    company = pre_populate_account_company_from_org(organization)

    try:
        account = stripe.Account.create(
            type="standard",
            company=company,
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
        # ? Send email?
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
