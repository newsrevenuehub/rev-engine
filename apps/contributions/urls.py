from django.conf import settings
from django.urls import path, re_path

from rest_framework import routers

from apps.contributions import views


router = routers.DefaultRouter()
router.register(r"contributions", views.ContributionsViewSet, basename="contribution")
router.register(r"payments", views.PaymentViewset, basename="payment")
router.register(r"contributors", views.PortalContributorsViewSet, basename="portal-contributor")
# TODO @BW: Consolidate all switchboard endpoints under /switchboard/ URL
# DEV-5534
router.register(
    r"switchboard-contributions", views.SwitchboardContributionsViewSet, basename="switchboard-contribution"
)
router.register(r"switchboard-contributors", views.SwitchboardContributorsViewSet, basename="switchboard-contributor")

urlpatterns = [
    path("stripe/oauth/", views.stripe_oauth, name="stripe-oauth"),
    re_path(
        settings.WEBHOOK_URL,
        views.process_stripe_webhook,
        name="stripe-webhooks-contributions",
    ),
]

urlpatterns += router.urls
