from django.urls import path

from apps.emails import views


# These allow viewing templated emails in isolation.

debug_urlpatterns = [
    path("recurring-contribution/", views.preview_recurring_contribution_reminder),
]
