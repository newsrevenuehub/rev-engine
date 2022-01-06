from django.conf import settings
from django.conf.urls import include
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import path, re_path
from django.views.generic.base import RedirectView

from apps.api.urls import urlpatterns as api_urlpatterns
from apps.users.urls import orgadmin_user_management_urls

from .views import index, read_apple_developer_merchant_id


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
    path("api/", include(api_urlpatterns)),
    path(".well-known/apple-developer-merchantid-domain-association", read_apple_developer_merchant_id),
]


if settings.DEBUG:
    from django.conf.urls.static import static
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns

    import debug_toolbar

    # Serve static and media files from development server
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns

urlpatterns += [
    # React SPA:
    path(r"", index, name="index"),  # for reverse()
    re_path(r"^(?:.*)/?$", index, name="index-others"),
]
