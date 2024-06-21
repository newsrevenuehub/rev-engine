from django.urls import include, path

from rest_framework import routers

from apps.e2e.views import E2EViewSet


router = routers.DefaultRouter()
router.register(r"e2e", E2EViewSet, basename="e2e")

urlpatterns = [
    path("", include(router.urls)),
]
