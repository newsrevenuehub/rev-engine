import logging

from django.conf import settings

import stripe
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response

from apps.contributions.models import Contribution, Contributor
from apps.contributions.utils import get_default_api_key
from apps.contributions.webhooks import StripeWebhookProcessor
from apps.organizations.models import Organization
from apps.pages.models import DonationPage


logger = logging.getLogger(__name__)


def convert_money_value_to_stripe_payment_amount(amount):
    return int(float(amount) * 100)


@api_view(["POST", "PATCH"])
def stripe_payment_intent(request):
    if request.method == "POST":
        try:
            org_slug = request.data.get("org_slug")
            page_slug = request.data.get("page_slug")
            contributor_email = request.data.get("contributor_email")
            organization = Organization.objects.get(slug=org_slug)
            page = DonationPage.objects.get(slug=page_slug)

            api_key = get_default_api_key(settings.STRIPE_LIVE_MODE)

            payment_amount = convert_money_value_to_stripe_payment_amount(
                request.data.get("payment_amount")
            )

            contributor, _ = Contributor.objects.get_or_create(email=contributor_email)

            pi_metadata = {
                "contributor": contributor.pk,
            }
            stripe_intent = stripe.PaymentIntent.create(
                amount=payment_amount,
                currency=settings.DEFAULT_CURRENCY,
                payment_method_types=["card"],
                api_key=api_key,
                stripe_account=organization.stripe_account_id,
                metadata=pi_metadata,
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

            return Response(
                data={"clientSecret": stripe_intent["client_secret"]}, status=status.HTTP_200_OK
            )

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

    if request.method == "PATCH":
        intent_id = request.data.get("intent_id")
        pass


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def process_stripe_webhook_view(request):
    payload = request.body
    sig_header = request.META["HTTP_STRIPE_SIGNATURE"]
    event = None
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except ValueError:
        logger.error("Invalid payload from Stripe webhook request")
        return Response(data={"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError:
        logger.error(
            "Invalid signature on Stripe webhook request. Is STRIPE_WEBHOOK_SECRET set correctly?"
        )
        return Response(data={"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        processor = StripeWebhookProcessor(event)
        processor.process()
    except ValueError as e:
        logger.error(e.message)

    return Response(status=status.HTTP_200_OK)
