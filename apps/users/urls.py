from django.urls import include, path

from rest_framework import routers

from apps.users import views


router = routers.DefaultRouter()
router.register(r"users", views.UserViewset, basename="user")

api_urlpatterns = [
    path("users/password_reset/", include("django_rest_passwordreset.urls", namespace="password_reset")),
    path("", include(router.urls)),
]

orgadmin_user_management_urls = [
    path("password-reset/password-reset", views.CustomPasswordResetView.as_view(), name="orgadmin_password_reset"),
    path("password-reset-done/", views.CustomPasswordResetDoneView.as_view(), name="orgadmin_password_reset_done"),
    path(
        "password-reset/<uidb64>/<token>/",
        views.CustomPasswordResetConfirm.as_view(),
        name="orgadmin_password_reset_confirm",
    ),
    path(
        "password-reset/done",
        views.CustomPasswordResetCompleteView.as_view(),
        name="orgadmin_password_reset_complete",
    ),
]
