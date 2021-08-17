import logging

from django.conf import settings


logger = logging.getLogger(__name__)


class LogFourHundredsMiddleware:  # pragma: no cover
    def __init__(self, get_response) -> None:
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Code to be executed for each request/response after
        # the view is called.
        if response.status_code in settings.MIDDLEWARE_LOGGING_CODES and response.get("data", False):
            for k, v in response.data.items():
                logger.debug("+=" * 50)
                logger.debug(f"{k}: {v}")
                logger.debug("+=" * 50)
        return response
