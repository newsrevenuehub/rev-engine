import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.views import (
    PasswordResetCompleteView,
    PasswordResetConfirmView,
    PasswordResetDoneView,
    PasswordResetView,
)
from django.urls import reverse_lazy

from rest_framework import mixins, status
from rest_framework.exceptions import APIException
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from rest_framework.viewsets import GenericViewSet

from apps.api.permissions import HasDeletePrivilegesViaRole, HasRoleAssignment, is_a_contributor
from apps.contributions.bad_actor import BadActorAPIError, make_bad_actor_request
from apps.public.permissions import IsActiveSuperUser
from apps.users.models import UnexpectedRoleType, User
from apps.users.permissions import UserOwnsUser
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


class UserViewset(
    mixins.CreateModelMixin, mixins.RetrieveModelMixin, mixins.ListModelMixin, mixins.UpdateModelMixin, GenericViewSet
):
    """"""

    model = User
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        # NB about these being guaranteed
        #  https://www.django-rest-framework.org/api-guide/viewsets/#introspecting-viewset-actions
        if self.action == "create":
            permission_classes = [
                AllowAny,
            ]
        if self.action == "list":
            permission_classes = [
                IsAuthenticated,
            ]
        if self.action in ("update", "partial_update"):
            permission_classes = [
                UserOwnsUser,
            ]
        return [permission() for permission in permission_classes]

    def validate_password(self, data):
        class TempUser:
            def __init__(self, email):
                self.email = email

        temp_user = TempUser(email=data["email"])
        try:
            validate_password(data["password"], temp_user)
        except ValidationError as exc:
            raise ValidationError(detail=str(exc))

    def validate_bad_actor(self, data):
        try:
            response = make_bad_actor_request(data)
        except BadActorAPIError:
            logger.warning("Something went wrong with BadActorAPI", exc_info=True)
            return
        if response.json()["overall_judgment"] >= settings.BAD_ACTOR_FAIL_ABOVE_FOR_ORG_USERS:
            logger.info("Someone determined to be a bad actor tried to create a user: [%]", data)
            raise ValidationError("TBD MESSAGE")

    def perform_create(self, serializer):
        """ """
        self.validate_password(serializer)
        self.validate_bad_actor(serializer)
        user = serializer.save()
        self.send_verification_email(user)
        return user

    def create(self, request, *args, **kwargs):
        """NB on what we need to do cause overriding

        https://github.com/encode/django-rest-framework/blob/a251b9379200420062cad9e3c68fde7c0e6b3fdc/rest_framework/mixins.py#L18
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = {self.get_success_headers(serializer.data) | dict()}  # jwt stuff
        # cookies = dict()
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def list(self, request, *args, **kwargs):
        """note here"""
        return Response(self.get_serializer(request.user).data)


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
            logger.exception("Encountered unexpected role type")
            raise APIException(detail=str(exc))


class PerUserDeletePermissionsMixin(GenericAPIView):
    """Limit who can delete a resource, by overriding default `.get_permissions`.

    ... allow super users to delete
    ... allow users with roles if `HasCreatePrivilegesForSlugs` is true.

    """

    def get_permissions(self):
        if self.action == "destroy":
            composed_perm = IsActiveSuperUser | (IsAuthenticated & HasRoleAssignment & HasDeletePrivilegesViaRole(self))
            return [composed_perm()]
        return super().get_permissions()
