import logging

from django.conf import settings

from rest_framework import status
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from apps.api.tokens import LONG_TOKEN, SHORT_TOKEN
from apps.contributions.models import Contributor


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class MagicLinkAuthenticationFailed(AuthenticationFailed):
    status_code = status.HTTP_403_FORBIDDEN


class JWTHttpOnlyCookieAuthentication(JWTAuthentication):
    """
    Override simplejwt's authenticate method to add cookie support
    """

    def enforce_csrf(self, request):
        """
        Enforce CSRF validation. From drf source, authentication.py
        """
        check = CSRFCheck()
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            msg = "CSRF validation failed: %s"
            logging.info(msg, reason)
            # CSRF failed, bail with explicit error message
            raise PermissionDenied(msg % reason)

    def validate_token(self, raw_token):
        token = self.get_validated_token(raw_token)
        user = self.get_user(token)
        if not user:
            logging.info("JWTCookieAuth fail; no user from token")
            return None, None
        if isinstance(user, Contributor) and token.get("ctx", None) != LONG_TOKEN:
            logging.info(
                "JWTCookieAuth fail; '%s' is contributor but '%s' lacks 'ctx' key or key != '%s'",
                user,
                token,
                LONG_TOKEN,
            )
            return None, None
        if hasattr(user, "is_active") and not user.is_active:
            logging.info("JWTCookieAuth fail; '%s' is not active", user)
            return None, None
        return user, token

    def authenticate(self, request):
        """
        Override JWTAuthentication authenticate method to:
            1. Pull JWT out of cookie, rather than request body.
            2. Enforce CSRF protection.
        """
        raw_token = request.COOKIES.get(settings.AUTH_COOKIE_KEY)
        if raw_token is None:
            logging.info("JWTCookieAuth fail; no '%s' cookie present in request", settings.AUTH_COOKIE_KEY)
            # TODO: Why return one value here but two at end of method?
            # TODO: Why None instead of raise like in get_user?
            # TODO: Why does return None result in 401, but return None, None in 403?
            return None

        validated_user, validated_token = self.validate_token(raw_token)
        if not (validated_user and validated_token):
            # TODO: Why return one value here but two at end of method?
            # TODO: Why None instead of raise like in get_user?
            # TODO: Why does return None result in 401, but return None, None in 403?
            return None

        self.enforce_csrf(request)

        logging.info("JWTCookieAuth good; '%s' '%s'", validated_user, validated_token)
        return validated_user, validated_token

    def get_user(self, validated_token):
        try:
            contributor_uuid = validated_token[settings.CONTRIBUTOR_ID_CLAIM]
            return Contributor.objects.get(uuid=contributor_uuid)
        except Contributor.DoesNotExist:
            logging.info(
                "JWTCookieAuth fail; Contributor '%s' DoesNotExist from '%s'",
                contributor_uuid,
                validated_token,
                exc_info=True,
            )
            raise MagicLinkAuthenticationFailed("Contributor not found", code="contributor_not_found")
        except KeyError:
            logging.info(
                "JWTCookieAuth fallback to normal user; KeyError '%s' not in '%s'",
                settings.CONTRIBUTOR_ID_CLAIM,
                validated_token,
                exc_info=True,
            )
            # If there's no validated_token[settings.CONTRIBUTOR_ID_CLAIM], get normal user
            return super().get_user(validated_token)


class MagicLinkTokenAuthenticationBase(JWTHttpOnlyCookieAuthentication):
    def get_user(self, validated_token):
        try:
            contributor_uuid = validated_token[settings.CONTRIBUTOR_ID_CLAIM]
            return Contributor.objects.get(uuid=contributor_uuid)
        except Contributor.DoesNotExist:
            logging.info(
                "MagicLinkAuth fail; Contributor '%s' DoesNotExist from '%s'",
                contributor_uuid,
                validated_token,
                exc_info=True,
            )
            raise MagicLinkAuthenticationFailed("Contributor not found", code="contributor_not_found")
        except KeyError:
            logging.info(
                "MagicLinkAuth fail; KeyError '%s' not in '%s'",
                settings.CONTRIBUTOR_ID_CLAIM,
                validated_token,
                exc_info=True,
            )
            raise MagicLinkAuthenticationFailed("Invalid token", code="missing_claim")

    def validate_token(self, token, email):
        try:
            validated_token = self.get_validated_token(token)
        except InvalidToken:
            logging.info("MagicLinkAuth fail; invalid token '%s'", token, exc_info=True)
            raise MagicLinkAuthenticationFailed("Invalid token", code="invalid_token")
        contributor = self.get_user(validated_token)
        self.ensure_contrib_token_type(validated_token)  # This doesn't exist in base class
        if email != contributor.email:
            logging.info(
                "MagicLinkAuth fail; email '%s' does not match contributor.email '%s'", email, contributor.email
            )
            raise MagicLinkAuthenticationFailed("Invalid token", code="invalid_token")
        logging.info("MagicLinkAuth good; '%s' '%s'", contributor, validated_token)
        return contributor, validated_token


class ShortLivedTokenAuthentication(MagicLinkTokenAuthenticationBase):
    def ensure_contrib_token_type(self, token):
        if "ctx" not in token:
            logging.info("MagicLinkAuth fail; 'ctx' not in token '%s'", token)
            raise MagicLinkAuthenticationFailed("Invalid token", code="missing_claim")
        if token["ctx"] != SHORT_TOKEN:
            logging.info("MagicLinkAuth fail; token['ctx'] != '%s'", SHORT_TOKEN)
            raise MagicLinkAuthenticationFailed("Invalid token type", code="invalid_type")

    def authenticate(self, request):
        """
        Lots of repitition here, but we need to skip 'enforce_csrf' this time
        """
        raw_token = request.data.get("token", None)
        email = request.data.get("email", None)

        # TODO: This check just "if not raw_token", catch empty string too, eh?
        if raw_token is None:
            logging.info("MagicLinkAuth fail; request.token is None")
            raise MagicLinkAuthenticationFailed("Invalid parameters", code="invalid_params")
        # TODO: This check just "if not email", to catch empty string too, eh?
        if email is None:
            logging.info("MagicLinkAuth fail; request.email is None")
            raise MagicLinkAuthenticationFailed("Invalid parameters", code="invalid_params")

        validated_user, validated_token = self.validate_token(raw_token, email)
        # Is this original code a logic error? missing parens or second not
        #     if not validated_user and validated_token:
        #         raise MagicLinkAuthenticationFailed("Invalid token")
        # Also wtf is this validation logic not in validate_token().
        # And why is there an unused base class?
        # So, much indirection/abstraction and chaos for so little functionality.
        if not validated_user:
            logging.info("MagicLinkAuth fail; bad validated_user '%s'", validated_user)
            raise MagicLinkAuthenticationFailed("Invalid token")
        if not validated_token:
            logging.info("MagicLinkAuth fail; bad validated_token '%s'", validated_token)
            raise MagicLinkAuthenticationFailed("Invalid token")
        return validated_user, validated_token
