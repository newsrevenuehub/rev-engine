from django.conf import settings
from django.urls import path, re_path

from rest_framework import routers

from apps.contributions.views import (
    checkout as checkout_views,
)
from apps.contributions.views import (
    orgs as orgs_views,
)
from apps.contributions.views import (
    portal as portal_views,
)
from apps.contributions.views import (
    switchboard as switchboard_views,
)
from apps.contributions.views import (
    webhooks as webhooks_views,
)


router = routers.DefaultRouter()
router.register(r"contributions", orgs_views.ContributionsViewSet, basename="contribution")
router.register(r"payments", checkout_views.PaymentViewset, basename="payment")
router.register(r"contributors", portal_views.PortalContributorsViewSet, basename="portal-contributor")
# TODO @BW: Consolidate all switchboard endpoints under /switchboard/ URL
# DEV-5534
router.register(
    r"switchboard-contributions", switchboard_views.SwitchboardContributionsViewSet, basename="switchboard-contribution"
)
router.register(
    r"switchboard-contributors", switchboard_views.SwitchboardContributorsViewSet, basename="switchboard-contributor"
)

urlpatterns = [
    path("stripe/oauth/", orgs_views.stripe_oauth, name="stripe-oauth"),
    re_path(
        settings.WEBHOOK_URL,
        webhooks_views.process_stripe_webhook,
        name="stripe-webhooks-contributions",
    ),
]

urlpatterns += router.urls
