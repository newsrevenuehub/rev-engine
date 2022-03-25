from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.views import (
    PasswordResetCompleteView,
    PasswordResetConfirmView,
    PasswordResetDoneView,
    PasswordResetView,
)
from django.urls import reverse_lazy

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.api.permissions import is_a_contributor
from apps.users import UnexpectedUserConfiguration
from apps.users.serializers import UserSerializer


user_model = get_user_model()

INVALID_TOKEN = "NoTaVaLiDtOkEn"


class CustomPasswordResetView(PasswordResetView):
    template_name = "orgadmin_password_reset_form.html"
    email_template_name = "orgadmin_password_reset_email.html"
    subject_template_name = "orgadmin_password_reset_subject.txt"
    success_url = reverse_lazy("orgadmin_password_reset_done")


class CustomPasswordResetDoneView(PasswordResetDoneView):
    template_name = "orgadmin_password_reset_done.html"


class CustomPasswordResetConfirm(PasswordResetConfirmView):
    """If user for whom reset is requested is an OrgAdmin, they get sent to SPA on...

    success. Additionally, regardless of user, set the Authorization cookie value to
    an invalid value to force a re-login in SPA.
    """

    template_name = "orgadmin_password_reset_confirm.html"
    success_url = reverse_lazy("orgadmin_password_reset_complete")

    def dispatch(self, *args, **kwargs):
        response = super().dispatch(*args, **kwargs)
        if self.request.method == "POST":
            # Invalidate Authorization cookie in client browser by setting its value to gibbersih
            # and its max_age to 0
            response.set_cookie(settings.AUTH_COOKIE_KEY, "NoTaVaLiDtOkEn", max_age=0)
        return response


class CustomPasswordResetCompleteView(PasswordResetCompleteView):
    template_name = "orgadmin_password_reset_complete.html"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_user(request):
    if request.method == "GET":
        user = user_model.objects.get(pk=request.user.pk)
        user_serializer = UserSerializer(user)
        return Response(data=user_serializer.data, status=status.HTTP_200_OK)


class ViewSetUserQueryRouterMixin:
    def get_queryset(self, *args, **kwargs):
        queryset = super().get_queryset(*args, **kwargs)
        current_user = self.request.user
        if current_user.is_anonymous:
            return queryset.none()
        if is_a_contributor(current_user):
            return queryset.filter_queryset_for_contributor(current_user)
        if current_user.is_superuser:
            return queryset.objects.all()
        elif role_assignment := getattr(current_user, "roleassignment"):
            return queryset.filter_queryset_by_role_assignment(role_assignment)
        else:
            raise UnexpectedUserConfiguration(current_user)
