from django.urls import include, path
from django.views.decorators.csrf import csrf_exempt

from apps.api.views import (
    RequestContributorTokenEmailView,
    TokenObtainPairCookieView,
    VerifyContributorTokenView,
)
from apps.contributions.urls import urlpatterns as contributions_urlpatterns
from apps.organizations.urls import urlpatterns as organizations_urlpatterns
from apps.pages.urls import urlpatterns as pages_urlpatterns
from apps.public.urls import urlpatterns as public_urlpatterns
from apps.users.urls import api_urlpatterns as users_urlpatterns


urlpatterns = [
    path("v1/", include(users_urlpatterns)),
    path("v1/", include(organizations_urlpatterns)),
    path("v1/", include(pages_urlpatterns)),
    path("v1/", include(contributions_urlpatterns)),
    path("v1/healthcheck", include("health_check.urls")),
    path("v1/public/", include(public_urlpatterns)),
    path("v1/token/", TokenObtainPairCookieView.as_view(), name="token-obtain-pair"),
    path("v1/contrib-email/", RequestContributorTokenEmailView.as_view(), name="contributor-token-request"),
    path("v1/contrib-verify/", csrf_exempt(VerifyContributorTokenView.as_view()), name="contributor-verify-token"),
]
