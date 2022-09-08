import logging

from django.conf import settings


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
