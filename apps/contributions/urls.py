from django.conf import settings
from django.urls import path, re_path

from apps.contributions import views


urlpatterns = [
    path("stripe/payment/", views.stripe_payment, name="stripe-payment"),
    path("stripe/oauth/", views.stripe_oauth, name="stripe-oauth"),
    path("stripe/confirmation/", views.stripe_confirmation, name="stripe-confirmation"),
    re_path(
        settings.WEBHOOK_URL,
        views.process_stripe_webhook_view,
        name="stripe-webhooks",
    ),
    path(
        "contributions/<int:pk>/process-flagged/",
        views.process_flagged,
        name="process-flagged",
    ),
    path(
        "contributions/<int:pk>/cancel-recurring/",
        views.cancel_recurring_payment,
        name="contributions-cancel-recurring",
    ),
    path("contributions/<int:pk>/update-payment-method/", views.update_payment_method, name="contributions-update"),
    path(
        "contributions/<int:pk>/", views.ContributionsViewSet.as_view({"get": "retrieve"}, name="contribution-detail")
    ),
    path("contributions/", views.ContributionsViewSet.as_view({"get": "list"}), name="contributions-list"),
]
