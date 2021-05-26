from django.conf import settings
from django.urls import path, re_path

from apps.contributions import views


urlpatterns = [
    path("stripe/adhoc-donation/", views.stripe_one_time_payment, name="stripe-one-time-payment"),
    path("stripe/recurring-donation/", views.stripe_recurring_payment, name="stripe-recurring-payment"),
    path("stripe/onboarding/", views.stripe_onboarding, name="stripe-onboarding"),
    path("stripe/confirmation/", views.stripe_confirmation, name="stripe-confirmation"),
    re_path(
        settings.WEBHOOK_URL,
        views.process_stripe_webhook_view,
        name="stripe-webhooks",
    ),
]
