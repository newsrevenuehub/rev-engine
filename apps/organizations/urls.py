from django.urls import include, path

from rest_framework import routers

from apps.organizations import views


router = routers.DefaultRouter()
router.register(r"organizations", views.OrganizationViewSet, basename="organization")
router.register(r"revenue-programs", views.RevenueProgramViewSet, basename="revenue-program")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "send-test-email/",
        views.send_test_email,
        name="send-test-email",
    ),
    path(
        "handle-stripe-account-link/<rp_pk>/",
        views.handle_stripe_account_link,
        name="handle-stripe-account-link",
    ),
    path("mailchimp-oauth-success/", views.handle_mailchimp_oauth_success, name="handle-mailchimp-oauth-success"),
    path(
        "switchboard/revenue-programs/<int:pk>/activecampaign/",
        views.switchboard_rp_activecampaign_detail,
        name="switchboard-revenue-program-activecampaign-detail",
    ),
]
