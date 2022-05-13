from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

# Import error messages to set defaults for fields
import apps.api.error_messages  # noqa
from apps.api.tokens import ContributorRefreshToken
from apps.contributions.models import Contributor
from apps.users.serializers import UserSerializer


class NoSuchContributorError(AuthenticationFailed):
    pass


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
    # Domains are limited to 63 characters max. No underscore allowed, unlike slugs.
    subdomain = serializers.RegexField(
        r"^[-0-9a-zA-Z]+$", max_length=20, required=False, allow_blank=True
    )  # rp_slug / subdomain used in magic-link url/email.

    @classmethod
    def get_token(cls, contributor):
        """
        Use custom ContributorRefreshToken to obtain a contributors-only JWT.
        """
        return ContributorRefreshToken.for_contributor(contributor.uuid)

    def validate(self, attrs):
        """
        If email is valid and matches that of a known contributor, we provide a access token.
        """
        data = super().validate(attrs)
        try:
            contributor = Contributor.objects.get(email=data.get("email"))
        except Contributor.DoesNotExist:
            raise NoSuchContributorError("Could not find contributor", code="no_contributor_email")
        data["access"] = str(self.get_token(contributor).short_lived_access_token)
        return data
