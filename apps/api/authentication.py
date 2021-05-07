from django.conf import settings

from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


def enforce_csrf(request):
    """
    Enforce CSRF validation. From drf source, authentication.py
    """
    check = CSRFCheck()
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        # CSRF failed, bail with explicit error message
        raise PermissionDenied("CSRF validation failed: %s" % reason)


class JWTHttpOnlyCookieAuthentication(JWTAuthentication):
    """
    Override simplejwt's authenticate method to add cookie support
    """

    def _validate_token(self, token):
        validated_token = self.get_validated_token(token)
        user = self.get_user(validated_token)
        if not user or not user.is_active:
            return None
        return user, validated_token

    def authenticate(self, request):
        """
        Override JWTAuthentication authenticate method to:
            1. Pull JWT out of cookie, rather than request body.
            2. Enforce CSRF protection.
        """
        raw_token = request.COOKIES.get(settings.AUTH_COOKIE_KEY)
        if raw_token is None:
            return None
        validated_user, validated_token = self._validate_token(raw_token)
        if not validated_user and validated_token:
            return None

        enforce_csrf(request)

        return validated_user, validated_token
