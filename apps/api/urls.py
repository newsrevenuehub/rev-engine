from django.conf import settings
from django.urls import include, path, re_path
from django.views.decorators.csrf import csrf_exempt

from rest_framework.routers import DefaultRouter

from apps.api.views import (
    RequestContributorTokenEmailView,
    SwitchboardLoginView,
    TokenObtainPairCookieView,
    VerifyContributorTokenView,
)
from apps.contributions.urls import urlpatterns as contributions_urlpatterns
from apps.contributions.views.switchboard import (
    SwitchboardContributionsViewSet,
    SwitchboardContributorsViewSet,
    SwitchboardPaymentsViewSet,
)
from apps.organizations.urls import urlpatterns as organizations_urlpatterns
from apps.pages.urls import urlpatterns as pages_urlpatterns
from apps.public.urls import urlpatterns as public_urlpatterns
from apps.users.urls import api_urlpatterns as users_urlpatterns
from apps.users.views.switchboard import SwitchboardUsersViewSet


# Switchboard-facing API is not a distinct app in this project, but we can still group its URLs together so
# they're namespaced under /switchboard/.
switchboard_router = DefaultRouter()
switchboard_router.register(r"contributions", SwitchboardContributionsViewSet, basename="switchboard-contribution")
switchboard_router.register(r"contributors", SwitchboardContributorsViewSet, basename="switchboard-contributor")
switchboard_router.register(r"payments", SwitchboardPaymentsViewSet, basename="switchboard-payment")
switchboard_router.register(r"users", SwitchboardUsersViewSet, basename="switchboard-user")
switchboard_urlpatterns = [
    path("switchboard/login/", SwitchboardLoginView.as_view(), name="switchboard-login"),
    path("switchboard/", include(switchboard_router.urls)),
]

urlpatterns = [
    path("v1/", include(users_urlpatterns)),
    path("v1/", include(organizations_urlpatterns)),
    path("v1/", include(pages_urlpatterns)),
    path("v1/", include(contributions_urlpatterns)),
    path("v1/", include(switchboard_urlpatterns)),
    path("v1/healthcheck", include("health_check.urls")),
    path("v1/public/", include(public_urlpatterns)),
    path("v1/token/", TokenObtainPairCookieView.as_view(), name="token-obtain-pair"),
    path("v1/contrib-email/", RequestContributorTokenEmailView.as_view(), name="contributor-token-request"),
    path("v1/contrib-verify/", csrf_exempt(VerifyContributorTokenView.as_view()), name="contributor-verify-token"),
]


if settings.ENABLE_API_BROWSER:  # pragma: no cover It is covered but the reimport confuses coverage.py
    from csp.decorators import csp_exempt
    from drf_yasg import openapi
    from drf_yasg.views import get_schema_view
    from rest_framework import permissions  # for drf_yasg

    schema_view = get_schema_view(
        openapi.Info(
            title="News Revenue Engine API",
            default_version="v1",
            description="News Revenue Engine API",
        ),
        public=True,
        permission_classes=[permissions.AllowAny],
    )

    urlpatterns += [
        re_path(r"^swagger(?P<format>\.json|\.yaml)$", schema_view.without_ui(cache_timeout=0), name="schema-json"),
        path("swagger/", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger-ui"),
        path("redoc/", csp_exempt(schema_view.with_ui("redoc", cache_timeout=0)), name="schema-redoc"),
    ]
