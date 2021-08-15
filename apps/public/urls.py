from django.urls import include, path

from rest_framework import routers

from apps.public import views


router = routers.DefaultRouter()
router.register(r"revenue-programs", views.RevenueProgramViewset, basename="revenueprogram")

urlpatterns = [path("", include(router.urls))]
