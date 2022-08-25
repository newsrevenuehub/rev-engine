from django.conf import settings
from django.urls import path, re_path

from rest_framework import routers

from apps.contributions import views


router = routers.DefaultRouter()
router.register(r"contributions", views.ContributionsViewSet, basename="contribution")

urlpatterns = [
    path(
        "stripe/initial-payment-intent",
        views.stripe_create_initial_payment_intent,
        name="stripe-initial-payment-intent",
    ),
    path("stripe/process-payment", views.stripe_process_payment, name="stripe-process-payment"),
    path("stripe/payment/", views.stripe_payment, name="stripe-payment"),
    path("stripe/oauth/", views.stripe_oauth, name="stripe-oauth"),
    path("stripe/confirmation/", views.stripe_confirmation, name="stripe-confirmation"),
    re_path(
        settings.WEBHOOK_URL,
        views.process_stripe_webhook_view,
        name="stripe-webhooks",
    ),
]

urlpatterns += router.urls
