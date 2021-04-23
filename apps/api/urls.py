from django.urls import include, path

from apps.api.views import TokenObtainPairCookieView
from apps.pages.urls import urlpatterns as pages_urlpatterns


urlpatterns = [
    path("v1/", include(pages_urlpatterns)),
    path("v1/token/", TokenObtainPairCookieView.as_view(), name="token-obtain-pair"),
]
