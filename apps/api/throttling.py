from django.conf import settings

from rest_framework.throttling import SimpleRateThrottle


class ContributorRateThrottle(SimpleRateThrottle):
    rate = settings.CONTRIBUTOR_MAGIC_LINK_REQUEST_THROTTLE_RATE

    def get_cache_key(self, request, view):
        if email := request.data.get("email", None):
            ident = email
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
