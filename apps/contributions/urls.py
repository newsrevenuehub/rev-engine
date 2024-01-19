from django.conf import settings
from django.urls import path, re_path

from rest_framework import routers

from apps.contributions import views


router = routers.DefaultRouter()
router.register(r"contributions", views.ContributionsViewSet, basename="contribution")
router.register(r"payments", views.PaymentViewset, basename="payment")
router.register(r"subscriptions", views.SubscriptionsViewSet, basename="subscription")

urlpatterns = [
    path("contributors/<int:id>/contributions/", views.contributor_contributions, name="contributor-contributions"),
    path(
        "contributors/<int:contributor_id>/contributions/<str:contribution_id>/",
        views.contributor_contribution,
        name="contributor-contribution",
    ),
    path("stripe/oauth/", views.stripe_oauth, name="stripe-oauth"),
    re_path(
        settings.WEBHOOK_URL,
        views.process_stripe_webhook,
        name="stripe-webhooks-contributions",
    ),
]

urlpatterns += router.urls
