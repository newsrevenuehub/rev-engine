import logging

from django.conf import settings
from django.http import HttpRequest, HttpResponse

from csp.middleware import CSPMiddleware

from apps.common.utils import get_subdomain_from_request
from apps.organizations.models import RevenueProgram, RevenueProgramContentSecurityPolicy


logger = logging.getLogger(__name__)


class LogFourHundredsMiddleware:
    def __init__(self, get_response) -> None:
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if response.status_code in settings.MIDDLEWARE_LOGGING_CODES:
            for k, v in response.get("data", {}).items():
                logger.debug("+=" * 50)
                logger.debug("%s: %s", k, v)
                logger.debug("+=" * 50)
        return response


class RevenueProgramCSPMiddleware(CSPMiddleware):
    # See https://github.com/mozilla/django-csp/blob/c6ed796902b94ea1f7bf01ef4c6d4b48aa84a260/csp/middleware.py#L51
    def get_policy_parts(self, request: HttpRequest, response: HttpResponse, report_only: bool = False):
        parts = super().get_policy_parts(request, response, report_only)
        try:
            if rp := RevenueProgram.objects.get(slug=get_subdomain_from_request(request)):
                csp_policies = RevenueProgramContentSecurityPolicy.objects.filter(revenue_program=rp)
                if not parts.update:
                    parts.update = {}
                for policy in csp_policies:
                    parts.update[policy.directive_type] = policy.directive_value
        except RevenueProgram.DoesNotExist:
            # Do nothing.
            pass
        return parts
