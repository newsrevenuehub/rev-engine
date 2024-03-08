import logging
import sys

from django.apps import apps
from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.decorators import login_required
from django.http import FileResponse, HttpResponse, JsonResponse
from django.shortcuts import render
from django.template import engines
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from django.views.defaults import server_error
from django.views.generic import TemplateView

import requests

from apps.common.serializers import SocialMetaInlineSerializer
from apps.common.utils import get_subdomain_from_request
from apps.organizations.models import RevenueProgram


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


# NB: Many endpoints in our API rely on HTTP-only cookie-based JWT tokens for authentication. However, there
# are some unauthenticated endpoints that we'd still like a modicum of protection on (and we use `enforce_csrf` in these cases).
# In order for this to work out, we need to ensure that requests originating from the SPA can have a CSRF token pulled from
# cookies and sent in the request headers. By ensuring CSRF cookie here, we guarantee that the SPA will have a CSRF token.
@method_decorator(ensure_csrf_cookie, name="dispatch")
class ReactAppView(TemplateView):
    template_name = "index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        self._add_gtm_id(context)
        self._add_spa_env(context)
        if revenue_program := self._get_revenue_program_from_subdomain():
            self._add_social_media_context(revenue_program, context)
            context["revenue_program_name"] = revenue_program.name

        return context

    def _add_spa_env(self, context):
        context["spa_env"] = settings.SPA_ENV_VARS

    def _get_revenue_program_from_subdomain(self):
        if subdomain := get_subdomain_from_request(self.request):
            try:
                return RevenueProgram.objects.get(slug=subdomain)
            except RevenueProgram.DoesNotExist:
                logger.info('ReactAppView failed to retrieve RevenueProgram by subdomain "%s"', subdomain)

    def _add_social_media_context(self, revenue_program, context):
        try:
            serializer = SocialMetaInlineSerializer(revenue_program.socialmeta, context={"request": self.request})
            context["social_meta"] = serializer.data
        except RevenueProgram.socialmeta.RelatedObjectDoesNotExist:
            pass

    def _add_gtm_id(self, context):
        context["gtm_id"] = settings.HUB_GTM_ID


# Proxies the single page app in local development, parsing any HTML responses
# using Django's template parser. If this is used, the single page app must have
# its own dev proxying turned off for this to work.
#
# This was cribbed from
# https://fractalideas.com/blog/making-react-and-django-play-well-together-hybrid-app-model/


def proxy_spa_dev_server(request, upstream="http://localhost:3000"):
    upstream_url = upstream + request.path
    upstream_response = requests.get(upstream_url)
    content = upstream_response.text
    content_type = upstream_response.headers["content-type"]

    if content_type == "text/html; charset=utf-8":
        content = engines["django"].from_string(upstream_response.text).render()
    elif content_type in ["image/png", "image/jpeg"]:
        # Binary content
        content = upstream_response.content

    return HttpResponse(
        content,
        content_type=upstream_response.headers["content-type"],
        reason=upstream_response.reason,
        status=upstream_response.status_code,
    )


# Only use the dev proxy if we are running locally AND not in pytest. We want
# the normal view to be tested in pytest.

index = proxy_spa_dev_server if settings.DEBUG and "pytest" not in sys.modules else never_cache(ReactAppView.as_view())


@require_GET
def read_apple_developer_merchant_id(request):
    return FileResponse(open(f"{settings.STATIC_ROOT}/apple-developer-merchantid-domain-association", "rb"))


# These two constants are very important to prevent exposing every model
# method on every model via the `admin_select_options` view-- like some
# terrible accidental RPC API.
SAFE_ADMIN_SELECT_PARENTS = ["organizations.Organization", "organizations.RevenueProgram"]
SAFE_ADMIN_SELECT_ACCESSOR_METHODS = [
    "admin_style_options",
    "admin_benefit_options",
    "admin_benefitlevel_options",
    "admin_revenueprogram_options",
]


@require_GET
@login_required
@staff_member_required
def admin_select_options(request):
    """
    Endpoint used by the `admin_limited_select` inclusion tag, which adds javascript to django admin changeforms which calls this endpoint.
    Takes a model id, a parent model in the format `app.Model`, and the name of the property on that model that will return the options.
    """
    parent_id = request.GET.get("parentId")
    parent_model_name = request.GET.get("parentModel")
    accessor_method = request.GET.get("accessorMethod")

    # Since we're using params to find a model, prevent access to all models other than the ones we want to expose here.
    if parent_model_name not in SAFE_ADMIN_SELECT_PARENTS:
        raise ValueError("Parent model not accepted")

    # Since we're using params to execute a model method, restrict those methods to a limited set of approved methods.
    if accessor_method not in SAFE_ADMIN_SELECT_ACCESSOR_METHODS:
        raise ValueError("Accessor method not accepted")

    parent_model = apps.get_model(parent_model_name)
    parent_instance = parent_model.objects.get(pk=parent_id)
    options = getattr(parent_instance, accessor_method)

    return JsonResponse({"data": options})


def cloudflare_500_view(request, exception=None):
    """Serves a static template displayed by Cloudflare in case of 521 or 522 errors

    We manually point Cloudflare at the URL for this view, which will cause it to scane
    this page and from then on it will display the scanned HTML for some 5xx errors.
    For more info, see https://support.cloudflare.com/hc/en-us/articles/200172706-Configuring-Custom-Pages-Error-and-Challenge-
    """
    return render(request, "500_cloudflare.html", {})


def dummy_view_for_raising_500(request):
    """Used to simulate 500 errors"""
    return server_error(request)
