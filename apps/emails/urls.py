from django.urls import path

from apps.emails import views


# These allow viewing templated emails in isolation.

debug_urlpatterns = [
    path("contribution-confirmation/", views.preview_contribution_confirmation),
    path("recurring-contribution/", views.preview_recurring_contribution_reminder),
]
