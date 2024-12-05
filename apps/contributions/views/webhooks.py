"""Contains the view for processing Stripe webhooks related to contributions."""

import logging

from django.conf import settings

import stripe
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response

from apps.contributions.tasks import process_stripe_webhook_task


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


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
