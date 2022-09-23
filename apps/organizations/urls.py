from django.urls import include, path

from rest_framework import routers

from apps.organizations import views


router = routers.DefaultRouter()
router.register(r"organizations", views.OrganizationViewSet, basename="organization")
router.register(r"revenue-programs", views.RevenueProgramViewSet, basename="revenue-program")

urlpatterns = [path("", include(router.urls))]
