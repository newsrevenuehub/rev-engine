from django.conf import settings
from django.urls import path, re_path

from apps.contributions import views


urlpatterns = [
    path("stripe/payment-intent/", views.stripe_payment_intent, name="stripe-payment-intent"),
    re_path(
        settings.WEBHOOK_URL,
        views.process_stripe_webhook_view,
        name="stripe-webhooks",
    ),
]
