import logging

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
from rest_framework.exceptions import APIException
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.api.permissions import HasDeletePrivilegesViaRole, HasRoleAssignment, is_a_contributor
from apps.public.permissions import IsSuperUser
from apps.users.models import UnexpectedRoleType
from apps.users.serializers import UserSerializer


logger = logging.getLogger(__name__)

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


class FilterQuerySetByUserMixin(GenericAPIView):
    """Mixin for filtering querysets by the user's role (and if they're contributor or superuser...

    ...in which case they will not have a role). This mixin assumes that the model for the view
    using the mixin has implemented `filter_queryset_by_role_assignment` and `filter_queryset_for_contributor`.
    """

    @classmethod
    def filter_queryset_for_user(cls, user, queryset):
        try:
            if is_a_contributor(user):
                return queryset.model.filter_queryset_for_contributor(user, queryset)
            if user.is_anonymous:
                return queryset.none()
            if user.is_superuser:
                return queryset.all()
            elif role_assignment := getattr(user, "roleassignment"):
                return queryset.model.filter_queryset_by_role_assignment(role_assignment, queryset)
        except UnexpectedRoleType as exc:
            logger.error(f"Encountered unexpected role type: {exc}")
            raise APIException(detail=str(exc))


class PerUserCreateDeletePermissionsMixin(GenericAPIView):
    """Limit who can create or delete a resource, by overriding default `.get_permissions`.

    ... allow super users to create and delete
    ... allow users with roles if `HasCreatePrivilegesForSlugs` is true.

    """

    def get_permissions(self):
        if self.action == "create":
            composed_perm = IsSuperUser | (IsAuthenticated & HasRoleAssignment)
            return [composed_perm()]
        if self.action == "destroy":
            composed_perm = IsSuperUser | (IsAuthenticated & HasRoleAssignment & HasDeletePrivilegesViaRole)
            return [composed_perm()]

        return super().get_permissions()
