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
from django.core.exceptions import ValidationError as DjangoValidationError
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
from apps.emails.tasks import send_templated_email
from apps.public.permissions import IsActiveSuperUser
from apps.users.models import UnexpectedRoleType, User
from apps.users.permissions import UserEmailIsVerified, UserOwnsUser
from apps.users.serializers import UserSerializer


logger = logging.getLogger(__name__)

user_model = get_user_model()

INVALID_TOKEN = "NoTaVaLiDtOkEn"
BAD_ACTOR_FAKE_AMOUNT = 0.0
BAD_ACTOR_CLIENT_FACING_VALIDATION_MESSAGE = "Something went wrong"

EMAIL_VERIFICATION_EMAIL_SUBJECT = "Verify your email address to get started"


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
    """For creating and updating user instances"""

    model = User
    queryset = User.objects.all()
    serializer_class = UserSerializer
    # we're explicitly setting these in order to prohibit put updates
    http_method_names = ["get", "post", "patch"]

    def get_permissions(self):
        permission_classes = []
        if self.action == "create":
            permission_classes = [
                AllowAny,
            ]
        if self.action == "list":
            permission_classes = [
                IsAuthenticated,
            ]
        if self.action == "partial_update":
            permission_classes = [UserOwnsUser, UserEmailIsVerified]
        return [permission() for permission in permission_classes]

    def validate_password(self, email, password):
        """Validate the password

        NB: This needs to be done in view layer and not serializer layer becauase Django's password
        validation functions we're using need access to the user attributes, not just password. This allows
        us to access all fields that were already validated in serializer layer.
        """
        # we temporarily initialize a user object (without saving) so can use Django's built
        # in password validation, which requires a user object
        temp_user = get_user_model()(email=email)
        try:
            validate_password(password, temp_user)
        except DjangoValidationError as exc:
            raise ValidationError(detail={"password": exc.messages})

    def validate_bad_actor(self, data):
        """Determine if user is a bad actor or not."""
        try:
            response = make_bad_actor_request(
                {
                    "email": data.validated_data["email"],
                    "referer": self.request.META.get("HTTP_REFERER", ""),
                    "ip": self.request.META["REMOTE_ADDR"],
                    "first_name": data.validated_data.get("first_name", ""),
                    "last_name": data.validated_data.get("last_name", ""),
                    # Bad actor api requires this field because it was created
                    # with contributors in mind, not org users, so we supply a dummy value
                    "amount": BAD_ACTOR_FAKE_AMOUNT,
                }
            )
        except BadActorAPIError:
            logger.warning("Something went wrong with BadActorAPI", exc_info=True)
            return
        if response.json()["overall_judgment"] >= settings.BAD_ACTOR_FAIL_ABOVE_FOR_ORG_USERS:
            logger.info("Someone determined to be a bad actor tried to create a user: [%s]", data)
            raise ValidationError(BAD_ACTOR_CLIENT_FACING_VALIDATION_MESSAGE)

    def perform_create(self, serializer):
        """Override of `perform_create` to add our custom validations"""
        self.validate_password(serializer.validated_data.get("email"), serializer.validated_data.get("password"))
        self.validate_bad_actor(serializer)
        user = serializer.save()
        self.send_verification_email(user)
        return user

    def perform_update(self, serializer):
        """Override of `perform_update` to add our custom validations"""
        if password := serializer.validated_data.get("password"):
            self.validate_password(serializer.validated_data.get("email", self.get_object().email), password)
        return serializer.update(self.get_object(), serializer.validated_data)

    def send_verification_email(self, user):
        """Send an email to user asking them to verify their email address"""
        send_templated_email.delay(
            user.email,
            EMAIL_VERIFICATION_EMAIL_SUBJECT,
            "nrh-org-account-creation-verification-email.txt",
            "nrh-org-account-creation-verification-email.html",
            # this is placeholder for now
            {"verification_url": None},
        )

    def list(self, request, *args, **kwargs):
        """List returns the requesting user's serialized user instance"""
        return Response(self.get_serializer(request.user).data)

    def partial_update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
