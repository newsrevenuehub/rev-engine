from datetime import datetime

from django.conf import settings
from django.core.mail import send_mail
from django.middleware import csrf

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt import exceptions
from rest_framework_simplejwt import views as simplejwt_views

from apps.api.authentication import ShortLivedTokenAuthentication
from apps.api.serializers import (
    ContributorObtainTokenSerializer,
    NoSuchContributorError,
    TokenObtainPairCookieSerializer,
)
from apps.api.tokens import ContributorRefreshToken
from apps.contributions.serializers import ContributorSerializer


COOKIE_PATH = "/"


def set_token_cookie(response, token, expires):
    response.set_cookie(
        # get cookie key from settings
        settings.AUTH_COOKIE_KEY,
        # pull access token out of validated_data
        token,
        # expire access token when refresh token expires
        expires=expires,
        # we can tie the cookie to a specific domain for added security
        domain=getattr(settings, "AUTH_COOKIE_DOMAIN", None),
        path=COOKIE_PATH,
        # browsers should only send the cookie using HTTPS
        secure=not settings.DEBUG,
        # browsers should not allow javascript access to this cookie
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    return response


class TokenObtainPairCookieView(simplejwt_views.TokenObtainPairView):
    """
    Subclasses simplejwt's TokenObtainPairView to handle tokens in cookies
    """

    serializer_class = TokenObtainPairCookieSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except exceptions.TokenError as e:
            raise exceptions.InvalidToken(e.args[0])

        response = Response(serializer.validated_data, status=status.HTTP_200_OK)
        csrf_token = csrf.get_token(self.request)

        response = set_token_cookie(
            response, serializer.validated_data["access"], datetime.now() + settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
        )

        # We don't want 'access' or 'refresh' in response body
        response.data = {
            "detail": "success",
            "user": serializer.validated_data["user"],
            "csrftoken": csrf_token,
        }

        return response

    def delete(self, request, *args, **kwargs):
        response = Response({})
        response.delete_cookie(
            settings.AUTH_COOKIE_KEY,
            domain=getattr(settings, "AUTH_COOKIE_DOMAIN", None),
            path=COOKIE_PATH,
        )

        response.data = {"detail": "success"}

        return response


class RequestContributorTokenEmailView(APIView):
    """
    TODO: Throttles requests for a token for any give email address even more, to prevent a sort of reverse brute-force
    attack for JWT.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        serializer = ContributorObtainTokenSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except NoSuchContributorError:
            # Don't send special response here. We don't want to indicate whether or not a given address is in our system.
            return Response({"detail": "success"}, status=status.HTTP_200_OK)

        data = serializer.data
        email = data["email"]
        token = data["access"]

        magic_link = f"{settings.SITE_URL}/{settings.CONTRIBUTOR_VERIFY_URL}?token={token}&email={email}"

        # TODO: send magic_link using proper templated email
        send_mail("TEMP  subject for testing", f"TEMP magic link is: {magic_link}", "testing@test.com", [email])

        # If email sent successfully...
        return Response({"detail": "success"}, status=status.HTTP_200_OK)


class VerifyContributorTokenView(APIView):
    """
    This view verifies a short-lived token using ShortLivedTokenAuthentication. Authenticated requests
    then return a simple "OK" response, but with our regular authentication scheme in place, including
    HTTP-only, samesite, secure Cookie stored JWT and anti-CSRF token.
    """

    authentication_classes = [ShortLivedTokenAuthentication]
    permission_classes = []

    def post(self, request, *args, **kwargs):
        response = Response(status=status.HTTP_200_OK)

        # Serializer contributor for response
        contributor_serializer = ContributorSerializer(request.user)

        # Generate parent token (refresh token) for contributor
        refresh = ContributorRefreshToken.for_contributor(request.user.uuid)

        # Generate long-lived token
        long_lived_token = str(refresh.long_lived_access_token)

        # Get anti-CSRF token
        csrf_token = csrf.get_token(self.request)

        # Set  access token using create_cookie directive
        response = set_token_cookie(
            response, long_lived_token, datetime.now() + settings.CONTRIBUTOR_LONG_TOKEN_LIFETIME
        )

        # Return generic response + csrf token
        response.data = {
            "detail": "success",
            "contributor": contributor_serializer.data,
            "csrftoken": csrf_token,
        }

        return response
