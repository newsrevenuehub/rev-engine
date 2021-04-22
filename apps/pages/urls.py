from django.urls import include, path

from apps.pages import views
from rest_framework import routers


router = routers.DefaultRouter()
router.register(r"pages", views.PageViewSet)
router.register(r"templates", views.TemplateViewSet)
router.register(r"styles", views.StyleViewSet)
router.register(r"donor-benefits", views.DonorBenefitViewSet)
router.register(r"benefit-tiers", views.BenefitTierViewSet)
router.register(r"benefits", views.BenefitViewSet)

urlpatterns = [path("", include(router.urls))]
