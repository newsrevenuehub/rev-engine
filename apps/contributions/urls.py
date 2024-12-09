from django.conf import settings
from django.urls import path, re_path

from rest_framework import routers

from apps.contributions.views import checkout, orgs, portal, switchboard, webhooks


router = routers.DefaultRouter()
router.register(r"contributions", orgs.ContributionsViewSet, basename="contribution")
router.register(r"payments", checkout.PaymentViewset, basename="payment")
router.register(r"contributors", portal.PortalContributorsViewSet, basename="portal-contributor")
# TODO @BW: Consolidate all switchboard endpoints under /switchboard/ URL
# DEV-5534
router.register(
    r"switchboard-contributions", switchboard.SwitchboardContributionsViewSet, basename="switchboard-contribution"
)
router.register(
    r"switchboard-contributors", switchboard.SwitchboardContributorsViewSet, basename="switchboard-contributor"
)

urlpatterns = [
    path("stripe/oauth/", orgs.stripe_oauth, name="stripe-oauth"),
    re_path(
        settings.WEBHOOK_URL,
        webhooks.process_stripe_webhook,
        name="stripe-webhooks-contributions",
    ),
]

urlpatterns += router.urls
