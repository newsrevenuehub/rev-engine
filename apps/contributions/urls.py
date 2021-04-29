from django.urls import include, path


urlpatterns = [
    path("stripe/", include("djstripe.urls", namespace="djstripe")),
]
