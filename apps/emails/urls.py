from django.urls import path

from apps.emails import views


# These allow viewing templated emails in isolation.

debug_urlpatterns = [
    path("contribution/<str:template_name>", views.preview_contribution_email_template),
]
