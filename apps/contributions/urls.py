from django.conf import settings
from django.urls import path, re_path

from rest_framework import routers

from apps.contributions import views


router = routers.DefaultRouter()
router.register(r"contributions", views.ContributionsViewSet, basename="contribution")
router.register(r"payments", views.PaymentViewset, basename="payment")
router.register(r"subscriptions", views.SubscriptionsViewSet, basename="subscription")

urlpatterns = [
    path("payments/<str:provider_client_secret_id>/success/", views.payment_success, name="payment-success"),
    path("stripe/oauth/", views.stripe_oauth, name="stripe-oauth"),
    re_path(
        settings.WEBHOOK_URL,
        views.process_stripe_webhook_view,
        name="stripe-webhooks",
    ),
]

urlpatterns += router.urls
