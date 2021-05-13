import logging

from django.conf import settings

import stripe
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response

from apps.contributions.models import Contribution, Contributor
from apps.contributions.utils import get_hub_stripe_api_key
from apps.contributions.webhooks import StripeWebhookProcessor
from apps.organizations.models import Organization
from apps.pages.models import DonationPage


logger = logging.getLogger(__name__)


def convert_money_value_to_stripe_payment_amount(amount):
    return int(float(amount) * 100)


@api_view(["POST"])
def stripe_payment_intent(request):
    if request.method == "POST":  # pragma: no cover
        try:
            org_slug = request.data.get("org_slug")
            page_slug = request.data.get("page_slug")
            contributor_email = request.data.get("contributor_email")
            organization = Organization.objects.get(slug=org_slug)
            page = DonationPage.objects.get(slug=page_slug)

            api_key = get_hub_stripe_api_key(settings.STRIPE_LIVE_MODE)

            payment_amount = convert_money_value_to_stripe_payment_amount(request.data.get("payment_amount"))

            contributor, _ = Contributor.objects.get_or_create(email=contributor_email)

            stripe_intent = stripe.PaymentIntent.create(
                amount=payment_amount,
                currency=settings.DEFAULT_CURRENCY,
                payment_method_types=["card"],
                api_key=api_key,
                stripe_account=organization.stripe_account_id,
            )

            Contribution.objects.create(
                amount=payment_amount,
                donation_page=page,
                organization=organization,
                contributor=contributor,
                payment_provider_data=stripe_intent,
                provider_reference_id=stripe_intent.id,
                payment_state=Contribution.PROCESSING[0],
            )

            return Response(data={"clientSecret": stripe_intent["client_secret"]}, status=status.HTTP_200_OK)

        except Organization.DoesNotExist:
            return Response(
                data={"org_slug": [f'Could not find Organization from slug "{org_slug}"']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except DonationPage.DoesNotExist:
            return Response(
                data={"page_slug": [f'Could not find DonationPage from slug "{page_slug}"']},
                status=status.HTTP_400_BAD_REQUEST,
            )


def pre_populate_account_company_from_org(org):
    company = {
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
    if request.method == "POST":  # pragma: no cover
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
                refresh_url="http://localhost:3000/?cb=stripe_reauth",
                return_url="http://localhost:3000/?cb=stripe_return",
                type="account_onboarding",
                api_key=get_hub_stripe_api_key(),
            )
        except stripe.error.StripeError as e:
            return Response(
                {"detail": "There was a problem connecting to Stripe. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(account_links, status=status.HTTP_200_OK)


@api_view(["POST"])
def stripe_confirmation(request):
    if request.method == "POST":  # pragma: no cover
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

        except stripe.error.StripeError as stripe_error:
            # ? Send email?
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
