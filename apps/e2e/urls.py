from django.urls import path

from apps.e2e.views import commit_status_detail


urlpatterns = [
    # make this also match on the commit_sha so securer and can't just guess monotonic ids
    path("e2e/commit_status/<str:id>/", commit_status_detail, name="e2e-create"),
]
