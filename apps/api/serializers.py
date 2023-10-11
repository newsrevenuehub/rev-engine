import logging

from django.conf import settings

from rest_framework import serializers

# Import error messages to set defaults for fields
import apps.api.error_messages  # noqa
from apps.api.tokens import ContributorRefreshToken


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class ContributorObtainTokenSerializer(serializers.Serializer):
    """
    Used when a contributor has entered their email and is requesting a "Magic Link".

    Flow wise, this is analogous to Email+Password authentication, but we're relying on
    ownership of email address instead. We only need to verify that a contributor exists
    with that email address. We'll send a token to that email address and its owner can
    use it to view contributions.
    """

    email = serializers.EmailField()
    access = serializers.CharField(required=False)  # Token used in magic-link url/email.

    subdomain = serializers.RegexField(
        r"^[-0-9a-zA-Z]+$", required=False, allow_blank=True
    )  # rp_slug / subdomain used in magic-link url/email.

    @classmethod
    def get_token(cls, contributor):
        """
        Use custom ContributorRefreshToken to obtain a contributors-only JWT.
        """
        logger.info(
            "Getting token for contributor %s",
            contributor,
        )
        return ContributorRefreshToken.for_contributor(contributor.uuid)

    def update_short_lived_token(self, contributor):
        logger.info(
            "Updating short lived token for contributor %s",
            contributor,
        )
        self.validated_data["access"] = str(self.get_token(contributor).short_lived_access_token)
