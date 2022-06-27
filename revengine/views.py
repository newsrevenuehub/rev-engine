import logging

from django.apps import apps
from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.decorators import login_required
from django.http import FileResponse, JsonResponse
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
        self._add_gtm_id(context)
        if revenue_program := self._get_revenue_program_from_subdomain():
            self._add_social_media_context(revenue_program, context)
            context["revenue_program_name"] = revenue_program.name

        return context

    def _get_revenue_program_from_subdomain(self):
        if subdomain := get_subdomain_from_request(self.request):
            try:
                return RevenueProgram.objects.get(slug=subdomain)
            except RevenueProgram.DoesNotExist:
                logger.info('ReactAppView failed to retrieve RevenueProgram by subdomain "%s"', subdomain)

    def _add_social_media_context(self, revenue_program, context):
        serializer = SocialMetaInlineSerializer(revenue_program.social_meta, context={"request": self.request})
        context["social_meta"] = serializer.data

    def _add_gtm_id(self, context):
        context["gtm_id"] = settings.HUB_GTM_ID


index = never_cache(ReactAppView.as_view())


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
