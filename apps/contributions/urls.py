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
    path(
        "contributions/<int:pk>/cancel-recurring/",
        views.cancel_recurring_payment,
        name="contributions-cancel-recurring",
    ),
    path("contributions/<int:pk>/update-payment-method/", views.update_payment_method, name="contributions-update"),
    path("contributions/", views.ContributionsListView.as_view({"get": "list"}), name="contributions-list"),
    path("meta/", views.ContributionMetadataListView.as_view({"get": "list"}), name="meta"),
]
