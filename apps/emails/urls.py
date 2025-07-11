from django.urls import include, path

from rest_framework import routers

from apps.emails import views
from apps.emails.views import EmailCustomizationViewSet


# These allow viewing templated emails in isolation.
debug_urlpatterns = [
    path("contribution/<str:template_name>", views.preview_contribution_email_template),
]

router = routers.DefaultRouter()
router.register(r"emails/customizations", EmailCustomizationViewSet, basename="email-customization")

urlpatterns = [
    path("", include(router.urls)),
]
