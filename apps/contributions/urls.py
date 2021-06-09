from django.conf import settings
from django.urls import path, re_path

from apps.contributions import views


urlpatterns = [
    path("stripe/payment/", views.stripe_payment, name="stripe-payment"),
    path("stripe/onboarding/", views.stripe_onboarding, name="stripe-onboarding"),
    path("stripe/confirmation/", views.stripe_confirmation, name="stripe-confirmation"),
    re_path(
        settings.WEBHOOK_URL,
        views.process_stripe_webhook_view,
        name="stripe-webhooks",
    ),
]
