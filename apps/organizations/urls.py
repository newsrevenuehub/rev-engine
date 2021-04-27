from django.urls import include, path

from rest_framework import routers

from apps.organizations import views


router = routers.DefaultRouter()
router.register(r"features", views.FeatureViewSet)
router.register(r"organizations", views.OrganizationViewSet)
router.register(r"plans", views.PlanViewSet)
router.register(r"revenue-programs", views.RevenueProgramViewSet)

urlpatterns = [path("", include(router.urls))]
