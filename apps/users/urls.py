from django.urls import include, path

from rest_framework import routers

from apps.users.views.revengine import (
    CustomPasswordResetCompleteView,
    CustomPasswordResetConfirm,
    CustomPasswordResetDoneView,
    CustomPasswordResetView,
    UserViewset,
    account_verification,
)


router = routers.DefaultRouter()
router.register(r"users", UserViewset, basename="user")

api_urlpatterns = [
    path("users/password_reset/", include("django_rest_passwordreset.urls", namespace="password_reset")),
    path("", include(router.urls)),
]

orgadmin_user_management_urls = [
    path("verify-account/<email>/<token>/", account_verification, name="account_verification"),
    path("password-reset/password-reset", CustomPasswordResetView.as_view(), name="orgadmin_password_reset"),
    path("password-reset-done/", CustomPasswordResetDoneView.as_view(), name="orgadmin_password_reset_done"),
    path(
        "password-reset/<uidb64>/<token>/",
        CustomPasswordResetConfirm.as_view(),
        name="orgadmin_password_reset_confirm",
    ),
    path(
        "password-reset/done",
        CustomPasswordResetCompleteView.as_view(),
        name="orgadmin_password_reset_complete",
    ),
]
