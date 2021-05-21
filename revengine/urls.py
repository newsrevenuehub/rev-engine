from django.conf import settings
from django.conf.urls import include
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import path, re_path
from django.views.generic import TemplateView

from apps.api.urls import urlpatterns as api_urlpatterns
from apps.users.views import CustomPasswordResetConfirm

from .views import index


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_urlpatterns)),
    path("reset-password/", auth_views.PasswordResetView.as_view(), name="password_reset"),
    path("reset-password-sent/", auth_views.PasswordResetDoneView.as_view(), name="password_reset_done"),
    path("reset/<uidb64>/<token>/", CustomPasswordResetConfirm.as_view(), name="password_reset_confirm"),
    path(
        "reset-password/complete/",
        TemplateView.as_view(template_name="orgadmin_password_reset_complete.html"),
        name="orgadmin_password_reset_complete",
    ),
    # this is the default path using django.contrib.auth.urls
    path("reset/done/", auth_views.PasswordResetCompleteView.as_view(), name="password_reset_complete"),
    # React SPA:
    path(r"", index, name="index"),  # for reverse()
    re_path(r"^(?:.*)/?$", index, name="index-others"),
]


if settings.DEBUG:
    from django.conf.urls.static import static
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns

    import debug_toolbar

    # Serve static and media files from development server
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
