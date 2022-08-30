from django.conf import settings
from django.urls import path, re_path

from rest_framework import routers

from apps.contributions import views


router = routers.DefaultRouter()
router.register(r"contributions", views.ContributionsViewSet, basename="contribution")
router.register(r"payments/one-time", views.OneTimePaymentViewSet, basename="payment-one-time")

# router.register(r"payments", views.PaymentsViewSet, basename="payment")

urlpatterns = [
    # path("payment/one-time", views.OneTimePaymentViewSet, name="payment-one-time"),
    # path("payment/subscription/", views.SubscriptionPaymentViewSet, name="payment-subscription"),
    # path("stripe/payment/", views.stripe_payment, name="stripe-payment"),
    path("stripe/oauth/", views.stripe_oauth, name="stripe-oauth"),
    path("stripe/confirmation/", views.stripe_confirmation, name="stripe-confirmation"),
    re_path(
        settings.WEBHOOK_URL,
        views.process_stripe_webhook_view,
        name="stripe-webhooks",
    ),
]

urlpatterns += router.urls
