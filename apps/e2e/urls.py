from django.urls import include, path

from rest_framework import routers

from apps.e2e.views import E2EView


router = routers.DefaultRouter()
router.register(r"e2e", E2EView, basename="e2e")

urlpatterns = [
    path("", include(router.urls)),
]
