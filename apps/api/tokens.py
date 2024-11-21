import logging

from django.conf import settings

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import datetime_to_epoch


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


SHORT_TOKEN = "short"
LONG_TOKEN = "long"


class ContributorRefreshToken(RefreshToken):
    """Override simplejwt.RefreshToken.

    To create a for_contributor class, which closely resembles RefreshToken.for_user. Instead of setting the
    USER_ID_CLAIM, we set the CONTRIBUTOR_ID_CLAIM. This is used later to distinguish between regular users and contributors.
    """

    @classmethod
    def for_contributor(cls, contributor_uuid):
        """Return a refresh token that is used to generate an access token.

        Following the pattern set by simplejwt, but in this case we're using a contributor instance, and setting the CONTRIBUTOR_ID_CLAIM.
        """
        logger.info("[ContributorRefreshToken][for_contributor] called for contributor_uuid (%s)", contributor_uuid)
        token = cls()
        token[settings.CONTRIBUTOR_ID_CLAIM] = str(contributor_uuid)

        return token

    @property
    def short_lived_access_token(self):
        """Return short-lived access token.

        From a refresh token that will be provided as a paramter in a magic link. This token has a short TTL-- it is
        exchanged with a more secure, slightly longer-lived token when it is redeemed.
        """
        logger.info("[ContributorRefreshToken][short_lived_access_token] called")
        access = self.access_token
        access["exp"] = datetime_to_epoch(self.current_time + settings.CONTRIBUTOR_SHORT_TOKEN_LIFETIME)
        access["ctx"] = SHORT_TOKEN
        return access

    @property
    def long_lived_access_token(self):
        """Set long_lived_access_token in an HTTP-only cookie.

        We set long_lived_access_token after a short_lived_access_token is redeemed. Completing the contract expected by
        the front-end and established in the muggle authentication pattern used in this app.
        """
        logger.info("[ContributorRefreshToken][long_lived_access_token] called")
        access = self.access_token
        access["exp"] = datetime_to_epoch(self.current_time + settings.CONTRIBUTOR_LONG_TOKEN_LIFETIME)
        access["ctx"] = LONG_TOKEN
        return access
