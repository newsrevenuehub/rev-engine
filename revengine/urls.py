import os

from django.conf import settings
from django.conf.urls import include
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import path, re_path
from django.views.generic.base import RedirectView

from apps.api.urls import urlpatterns as api_urlpatterns
from apps.emails.urls import debug_urlpatterns as debug_email_urlpatterns
from apps.users.urls import orgadmin_user_management_urls

from .views import (
    admin_select_options,
    cloudflare_500_view,
    dummy_view_for_raising_500,
    index,
    read_apple_developer_merchant_id,
)


urlpatterns = [
    path(
        "nrhadmin/password_reset/",
        auth_views.PasswordResetView.as_view(),
        name="admin_password_reset",
    ),
    path(
        "nrhadmin/password_reset/done/",
        auth_views.PasswordResetDoneView.as_view(),
        name="password_reset_done",
    ),
    path(
        "reset/<uidb64>/<token>/",
        auth_views.PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path(
        "reset/done/",
        auth_views.PasswordResetCompleteView.as_view(),
        name="password_reset_complete",
    ),
    path("nrhadmin", RedirectView.as_view(url="/nrhadmin/")),
    path("nrhadmin/", admin.site.urls),
    path("users/", include(orgadmin_user_management_urls)),
    path("admin-select/", admin_select_options, name="admin-select-options"),
    path("api/", include(api_urlpatterns)),
    path(
        ".well-known/apple-developer-merchantid-domain-association",
        read_apple_developer_merchant_id,
        name="apple_dev_merchantid_domain",
    ),
]


if settings.DEBUG:  # pragma: no cover Is covered, but reimport confuses coverage
    from django.conf.urls.static import static

    import debug_toolbar

    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    urlpatterns += [path("__debug_email__/", include(debug_email_urlpatterns))]

if os.getenv("DJANGO_SETTINGS_MODULE", None) != "deploy":
    # This needs to happen before the catch-all for SPA index below
    urlpatterns.append(path("dummy-500-error", dummy_view_for_raising_500, name="dummy-500"))

urlpatterns += [
    path("cloudflare-500", cloudflare_500_view, name="cloudflare-500"),
    # React SPA:
    # Routing handled by SPA. Urlpatterns defined here only to allow use of reverse() with symbolic name rather than
    # hardcoded URLs.
    path("", index, name="index"),
    path("verified/", index, name="spa_account_verification"),
    path("verified/<failure>/", index, name="spa_account_verification_fail"),
    re_path(r"^(?:.*)/?$", index, name="index-others"),
]
