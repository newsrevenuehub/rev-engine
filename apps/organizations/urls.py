from django.urls import include, path

from rest_framework import routers

from apps.organizations.views import revengine as revengine_views
from apps.organizations.views import switchboard as switchboard_views


router = routers.DefaultRouter()
router.register(r"organizations", revengine_views.OrganizationViewSet, basename="organization")
router.register(r"revenue-programs", revengine_views.RevenueProgramViewSet, basename="revenue-program")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "send-test-email/",
        revengine_views.send_test_email,
        name="send-test-email",
    ),
    path(
        "handle-stripe-account-link/<rp_pk>/",
        revengine_views.handle_stripe_account_link,
        name="handle-stripe-account-link",
    ),
    path(
        "mailchimp-oauth-success/",
        revengine_views.handle_mailchimp_oauth_success,
        name="handle-mailchimp-oauth-success",
    ),
    path(
        "switchboard/revenue-programs/<int:pk>/activecampaign/",
        switchboard_views.switchboard_,
        name="switchboard-revenue-program-activecampaign-detail",
    ),
]
