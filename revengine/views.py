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
        return context

    # def _request_is_donation_page(self):
    #     return bool(get_subdomain_from_request(self.request))

    def _add_social_media_context(self, context):
        """
        Add Open Graph protocol and Twitter social sharing meta tags to index.html context, only when there's a subdomain.
        """
        if subdomain := get_subdomain_from_request(self.request):
            revenue_program = None
            try:
                revenue_program = RevenueProgram.objects.get(slug=subdomain)
            except RevenueProgram.DoesNotExist:
                logger.warning(f'ReactAppView failed to retrieve RevenueProgram by subdomain "{subdomain}"')

            if revenue_program:
                serializer = SocialMetaInlineSerializer(revenue_program.social_meta, context={"request": self.request})
                context["social_meta"] = serializer.data

    # def _add_security_headers(self, context):
    #     """
    #     Add security
    #     """

    # def _add_donation_page_security_headers(self, context):
    #     """
    #     Add security headers that should only be present on public DonationPages
    #     """
    #     if self._request_is_donation_page():
    #         pass


index = never_cache(ReactAppView.as_view())


@require_GET
def read_apple_developer_merchant_id(request):
    return FileResponse(open(f"{settings.STATIC_ROOT}/apple-developer-merchantid-domain-association", "rb"))
