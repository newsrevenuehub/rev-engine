from django.urls import include, path

from apps.api.views import TokenObtainPairCookieView
from apps.contributions.urls import urlpatterns as contributions_urlpatterns
from apps.organizations.urls import urlpatterns as organizations_urlpatterns
from apps.pages.urls import urlpatterns as pages_urlpatterns
from apps.users.urls import urlpatterns as users_urlpatterns


urlpatterns = [
    path("v1/", include(users_urlpatterns)),
    path("v1/", include(organizations_urlpatterns)),
    path("v1/", include(pages_urlpatterns)),
    path("v1/", include(contributions_urlpatterns)),
    path("v1/token/", TokenObtainPairCookieView.as_view(), name="token-obtain-pair"),
]
