import logging

from django.conf import settings
from django.http import FileResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET
from django.views.generic import TemplateView

from apps.common.serializers import SocialMetaInlineSerializer
from apps.common.utils import get_subdomain_from_request
from apps.organizations.models import RevenueProgram


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


# Serve Single Page Application
class ReactAppView(TemplateView):
    template_name = "index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        self._add_social_media_context(context)
        self._serve_spa_env_vars()
        return context

    def _serve_spa_env_vars(self):
        self.request["spa_env"] = settings.SPA_ENV

    def _add_social_media_context(self, context):
        if subdomain := get_subdomain_from_request(self.request):
            revenue_program = None
            try:
                revenue_program = RevenueProgram.objects.get(slug=subdomain)
            except RevenueProgram.DoesNotExist:
                logger.warning(f'ReactAppView failed to retrieve RevenueProgram by subdomain "{subdomain}"')

            if revenue_program:
                serializer = SocialMetaInlineSerializer(revenue_program.social_meta, context={"request": self.request})
                context["social_meta"] = serializer.data


index = never_cache(ReactAppView.as_view())


@require_GET
def read_apple_developer_merchant_id(request):
    return FileResponse(open(f"{settings.STATIC_ROOT}/apple-developer-merchantid-domain-association", "rb"))
