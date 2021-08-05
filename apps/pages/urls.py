from django.urls import include, path

from rest_framework import routers

from apps.pages import views


router = routers.DefaultRouter()
router.register(r"pages", views.PageViewSet, basename="donationpage")
router.register(r"templates", views.TemplateViewSet, basename="template")
router.register(r"styles", views.StyleViewSet, basename="style")

urlpatterns = [path("", include(router.urls))]
