from django.conf import settings

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import datetime_to_epoch


SHORT_TOKEN = "short"
LONG_TOKEN = "long"


class ContributorRefreshToken(RefreshToken):
    """
    Override simplejwt.RefreshToken to create a for_contributor class, which
    closely resembles RefreshToken.for_user. Instead of setting the USER_ID_CLAIM,
    we set the CONTRIBUTOR_ID_CLAIM. This is used later to distinguish between
    regular users and contributors.
    """

    @classmethod
    def for_contributor(cls, contributor_uuid):
        """
        Returns a refresh token that is used to generate an access token, following the pattern set by
        simplejwt, but in this case we're using a contributor instance, and setting the CONTRIBUTOR_ID_CLAIM
        """

        token = cls()
        token[settings.CONTRIBUTOR_ID_CLAIM] = str(contributor_uuid)

        return token

    @property
    def short_lived_access_token(self):
        """
        Returns a short-lived access token from a refresh token that will be provided as a
        paramter in a magic link. This token has a short TTL-- it is exchanged with a more secure, slightly
        longer-lived token when it is redeemed.
        """
        access = self.access_token
        access["exp"] = datetime_to_epoch(self.current_time + settings.CONTRIBUTOR_SHORT_TOKEN_LIFETIME)
        access["ctx"] = SHORT_TOKEN
        return access

    @property
    def long_lived_access_token(self):
        """
        After a short_lived_access_token is redeemed, we set this long_lived_access_token in an HTTP-only cookie,
        completing the contract expected by the front-end and established in the muggle authentication pattern used
        in this app.
        """
        access = self.access_token
        access["exp"] = datetime_to_epoch(self.current_time + settings.CONTRIBUTOR_LONG_TOKEN_LIFETIME)
        access["ctx"] = LONG_TOKEN
        return access
