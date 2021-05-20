import logging
from urllib.parse import urlparse

from django.conf import settings

from rest_framework import permissions


logger = logging.getLogger(__name__)


class SameOrigin(permissions.BasePermission):
    """
    Request-level permission to only allow requests from the same origin.

    NOTE: It may be the case that this permission needs to permit authenticated (non-user) API requests at some point.
    """

    message = "User does not have permission to access this resource."

    def has_permission(self, request, *args):
        parsed_referer = urlparse(request.META["HTTP_REFERER"])
        referer_domain = "{uri.netloc}".format(uri=parsed_referer)

        if settings.DEBUG:  # pragma: no cover
            return "localhost" in referer_domain

        return request.META["HTTP_HOST"] == referer_domain
