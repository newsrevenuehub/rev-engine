from django.conf import settings

from rest_framework import authentication, status
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from apps.api.tokens import LONG_TOKEN, SHORT_TOKEN
from apps.contributions.models import Contributor


class MagicLinkAuthenticationFailed(AuthenticationFailed):
    status_code = status.HTTP_403_FORBIDDEN


def enforce_csrf(request):
    """Enforce CSRF validation. From drf source, authentication.py."""
    check = authentication.CSRFCheck(request)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        # CSRF failed, bail with explicit error message
        raise PermissionDenied(f"CSRF validation failed: {reason}")


class JWTHttpOnlyCookieAuthentication(JWTAuthentication):
    """Override simplejwt's authenticate method to add cookie support."""

    def token_is_contrib_long_token(self, token):
        return token.get("ctx", None) == LONG_TOKEN

    def validate_token(self, token):
        validated_token = self.get_validated_token(token)
        user = self.get_user(validated_token)

        if isinstance(user, Contributor) and not self.token_is_contrib_long_token(validated_token):
            return None, None

        if not user or (hasattr(user, "is_active") and not user.is_active):
            return None, None

        return user, validated_token

    def authenticate(self, request):
        """Override JWTAuthentication authenticate method to.

        1. Pull JWT out of cookie, rather than request body.
        2. Enforce CSRF protection.
        """
        raw_token = request.COOKIES.get(settings.AUTH_COOKIE_KEY)
        if raw_token is None:
            return None
        validated_user, validated_token = self.validate_token(raw_token)

        if not validated_user and not validated_token:
            return None

        enforce_csrf(request)

        return validated_user, validated_token

    def get_user(self, validated_token):
        try:
            contributor_uuid = validated_token[settings.CONTRIBUTOR_ID_CLAIM]
            return Contributor.objects.get(uuid=contributor_uuid)
        except Contributor.DoesNotExist:
            raise MagicLinkAuthenticationFailed("Contributor not found", code="contributor_not_found") from None
        except KeyError:
            # If there's no validated_token[settings.CONTRIBUTOR_ID_CLAIM], get normal user
            return super().get_user(validated_token)


class MagicLinkTokenAuthenticationBase(JWTHttpOnlyCookieAuthentication):
    def get_user(self, validated_token):
        try:
            contributor_uuid = validated_token[settings.CONTRIBUTOR_ID_CLAIM]
            return Contributor.objects.get(uuid=contributor_uuid)
        except KeyError:
            raise MagicLinkAuthenticationFailed("Invalid token", code="missing_claim") from None
        except Contributor.DoesNotExist:
            raise MagicLinkAuthenticationFailed("Contributor not found", code="contributor_not_found") from None

    def ensure_valid_owner(self, email, contributor):
        if email.lower().strip() != contributor.email.lower().strip():
            raise MagicLinkAuthenticationFailed("Invalid token", code="invalid_token")

    def validate_token(self, token, email):
        try:
            validated_token = self.get_validated_token(token)
        except InvalidToken:
            raise MagicLinkAuthenticationFailed("Invalid token", code="invalid_token") from None

        contributor = self.get_user(validated_token)

        self.ensure_contrib_token_type(validated_token)
        self.ensure_valid_owner(email, contributor)
        return contributor, validated_token


class ShortLivedTokenAuthentication(MagicLinkTokenAuthenticationBase):
    def ensure_contrib_token_type(self, token):
        if "ctx" not in token:
            raise MagicLinkAuthenticationFailed("Invalid token", code="missing_claim")

        if token["ctx"] != SHORT_TOKEN:
            raise MagicLinkAuthenticationFailed("Invalid token type", code="invalid_type")

    def authenticate(self, request):
        """Lots of repitition here, but we need to skip 'enforce_csrf' this time."""
        raw_token = request.data.get("token", None)
        email = request.data.get("email", None)

        if raw_token is None or email is None:
            raise MagicLinkAuthenticationFailed("Invalid parameters", code="invalid_params")

        validated_user, validated_token = self.validate_token(raw_token, email)
        if not validated_user and validated_token:
            raise MagicLinkAuthenticationFailed("Invalid token")

        return validated_user, validated_token
