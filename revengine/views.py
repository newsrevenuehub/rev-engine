from django.conf import settings
from django.http import FileResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET
from django.views.generic import TemplateView


# Serve Single Page Application
index = never_cache(TemplateView.as_view(template_name="index.html"))


@require_GET
def read_apple_developer_merchant_id(request):
    return FileResponse(open(f"{settings.STATIC_ROOT}/.well-known/apple-developer-merchantid-domain-association", "rb"))
