import logging

from django.conf import settings

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

# Import error messages to set defaults for fields
import apps.api.error_messages  # noqa
from apps.api.tokens import ContributorRefreshToken
from apps.contributions.models import Contributor
from apps.contributions.serializers import ContributorSerializer
from apps.users.serializers import UserSerializer


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class TokenObtainPairCookieSerializer(TokenObtainPairSerializer):
    """
    Subclass TokenObtainPairSerializer from simplejwt so that we can add the requesting user
    to response body
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        user_serializer = UserSerializer(self.user)
        data["user"] = user_serializer.data
        return data


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
    contributor = ContributorSerializer(read_only=True)
    subdomain = serializers.RegexField(
        r"^[-0-9a-zA-Z]+$", required=False, allow_blank=True
    )  # rp_slug / subdomain used in magic-link url/email.

    def validate(self, attrs):
        data = super().validate(attrs)
        logger.info("[ContributorObtainTokenSerializer] Validate that contributor with email %s exists", data["email"])
        try:
            contributor = Contributor.objects.get(email=data["email"])
        except Contributor.DoesNotExist:
            logger.error("[ContributorObtainTokenSerializer] Contributor with email %s not found", data["email"])
            raise serializers.ValidationError("contributor not found.")
        data["contributor"] = contributor
        logger.info("[ContributorObtainTokenSerializer] Contributor with email %s exists", data["email"])
        return data

    @classmethod
    def get_token(cls, contributor):
        """
        Use custom ContributorRefreshToken to obtain a contributors-only JWT.
        """
        logger.info(
            "[ContributorObtainTokenSerializer][get_token] getting token for contributor %s",
            contributor,
        )
        return ContributorRefreshToken.for_contributor(contributor["uuid"])

    def update_short_lived_token(self, contributor):
        logger.info(
            "[ContributorObtainTokenSerializer][update_short_lived_token] updating short lived token for contributor %s",
            contributor,
        )
        self.validated_data["access"] = str(self.get_token(contributor).short_lived_access_token)
