from django.urls import include, re_path

from apps.pages.urls import urlpatterns as pages_urlpatterns


urlpatterns = [
    re_path(r"v1/", include(pages_urlpatterns)),
]
