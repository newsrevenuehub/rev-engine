from django.urls import path

from apps.users import views


api_urlpatterns = [
    path("users/", views.retrieve_user, name="user-retrieve"),
]

orgadmin_user_management_urls = [
    path("password-reset/", views.CustomPasswordResetView.as_view(), name="orgadmin_password_reset"),
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
