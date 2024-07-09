from django.urls import path

from apps.e2e.views import commit_status_detail


urlpatterns = [
    path("e2e/<str:commit_sha>/commit_status/<str:status_id>/", commit_status_detail, name="e2e-detail"),
]
