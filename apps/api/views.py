from datetime import datetime

from django.conf import settings
from django.middleware import csrf

from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt import exceptions
from rest_framework_simplejwt import views as simplejwt_views

from apps.api.serializers import TokenObtainPairCookieSerializer


class TokenObtainPairCookieView(simplejwt_views.TokenObtainPairView):
    """
    Subclasses simplejwt's TokenObtainPairView to handle tokens in cookies
    """

    cookie_path = "/"

    serializer_class = TokenObtainPairCookieSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except exceptions.TokenError as e:
            raise exceptions.InvalidToken(e.args[0])

        response = Response(serializer.validated_data, status=status.HTTP_200_OK)
        csrf_token = csrf.get_token(self.request)

        response.set_cookie(
            # get cookie key from settings
            settings.AUTH_COOKIE_KEY,
            # pull access token out of validated_data
            serializer.validated_data["access"],
            # expire access token when refresh token expires
            expires=datetime.now() + settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"],
            # we can tie the cookie to a specific domain for added security
            domain=getattr(settings, "AUTH_COOKIE_DOMAIN", None),
            path=self.cookie_path,
            # browsers should only send the cookie using HTTPS
            secure=not settings.DEBUG,
            # browsers should not allow javascript access to this cookie
            httponly=True,
            samesite=settings.AUTH_COOKIE_SAMESITE,
        )

        # We don't want 'access' or 'refresh' in response body
        response.data = {
            "detail": "success",
            "user": response.data["user"],
            "csrftoken": csrf_token,
        }

        return response

    def delete(self, request, *args, **kwargs):
        response = Response({})
        response.delete_cookie(
            settings.AUTH_COOKIE_KEY,
            domain=getattr(settings, "AUTH_COOKIE_DOMAIN", None),
            path=self.cookie_path,
        )

        response.data = {"detail": "success"}

        return response
