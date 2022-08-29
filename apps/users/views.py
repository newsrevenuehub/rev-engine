import binascii
import logging
from base64 import urlsafe_b64decode, urlsafe_b64encode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.views import (
    PasswordResetCompleteView,
    PasswordResetConfirmView,
    PasswordResetDoneView,
    PasswordResetView,
)
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponseRedirect
from django.urls import reverse, reverse_lazy
from django.views.decorators.http import require_GET

from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from rest_framework.viewsets import GenericViewSet

from apps.api.permissions import HasDeletePrivilegesViaRole, HasRoleAssignment, is_a_contributor
from apps.common.utils import get_original_ip_from_request
from apps.contributions.bad_actor import BadActorAPIError, make_bad_actor_request
from apps.contributions.utils import get_sha256_hash
from apps.emails.tasks import send_templated_email
from apps.public.permissions import IsActiveSuperUser
from apps.users.constants import (
    BAD_ACTOR_CLIENT_FACING_VALIDATION_MESSAGE,
    BAD_ACTOR_FAKE_AMOUNT,
    EMAIL_VERIFICATION_EMAIL_SUBJECT,
    INVALID_TOKEN,
    PASSWORD_UNEXPECTED_VALIDATION_MESSAGE_SUBSTITUTE,
    PASSWORD_VALIDATION_EXPECTED_MESSAGES,
)
from apps.users.models import UnexpectedRoleType, User
from apps.users.permissions import UserIsAllowedToUpdate, UserOwnsUser
from apps.users.serializers import UserSerializer


logger = logging.getLogger(__name__)

user_model = get_user_model()


@require_GET
def account_verification(request, email, token):
    """Endpoint for verification link in "verify your email address" emails."""
    checker = AccountVerification()
    if user := checker.validate(email, token):
        user.email_verified = True
        user.save()
        return HttpResponseRedirect(reverse("spa_account_verification"))
    else:
        # Having fail in url is non-optimal
        return HttpResponseRedirect(reverse("spa_account_verification_fail", kwargs={"failure": checker.fail_reason}))


class AccountVerification(signing.TimestampSigner):
    def __init__(self):
        self.fail_reason = "failed"  # Single word [inactive, expired, unknown], other failures are empty string.
        self.max_age = (
            60 * 60 * (settings.ACCOUNT_VERIFICATION_LINK_EXPIRY or 0)
        )  # Convert setting hours (or None) to seconds.
        super().__init__(salt=settings.ENCRYPTION_SALT)

    def _hash(self, plaintext):
        return get_sha256_hash(plaintext)

    def generate_token(self, email):
        encoded_email = self.encode(email)
        if self.max_age:
            token = self.encode(self.sign(self._hash(email)))
        else:
            token = self.encode(self._hash(email))
        return encoded_email, token

    def validate(self, encoded_email, encoded_token):
        # Note: Not a failure if user alreay has email_verified=True
        email = self.decode(encoded_email)
        token = self.decode(encoded_token)
        if not (email and token):
            logger.info("Account Verification: Malformed or missing email/token for email:%s", email)
            return False
        if self.max_age:
            try:
                token = self.unsign(token, self.max_age)
            except signing.SignatureExpired:
                logger.warning("Account Verification: URL Expired for email:%s", email)
                self.fail_reason = "expired"
                return False
            except signing.BadSignature:
                logger.info("Account Verification: Bad Signature for email:%s", email)
                return False
        if token != self._hash(email):
            logger.info("Account Verification: Invalid token for email:%s", email)
            return False
        for user in get_user_model().objects.filter(email=email):
            if not user.is_active:
                logger.warning("Account Verification: Inactive user for email:%s", email)
                self.fail_reason = "inactive"
                return False
            return user
        else:  # No matching user.
            logger.info("Account Verification: No user for email:%s", email)
            self.fail_reason = "unknown"
            return False

    @staticmethod
    def encode(plain_entity):
        return urlsafe_b64encode(str(plain_entity).encode("UTF-8")).decode("UTF-8")

    @staticmethod
    def decode(encoded_entity):
        try:
            return urlsafe_b64decode(encoded_entity).decode("UTF-8")
        except (UnicodeDecodeError, binascii.Error):
            return False


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
            response.set_cookie(settings.AUTH_COOKIE_KEY, INVALID_TOKEN, max_age=0)
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
        permission_classes = {
            "create": [
                AllowAny,
            ],
            "list": [
                IsAuthenticated,
            ],
            "partial_update": [UserOwnsUser, UserIsAllowedToUpdate],
            "request_account_verification": [
                IsAuthenticated,
            ],
        }.get(self.action, [])
        return [permission() for permission in permission_classes]

    @staticmethod
    def send_verification_email(user):
        """Send email to user asking them to click verify their email address link."""
        if not user.email:
            logger.warning("Account Verification: No email for user:%s", user.id)
            return
        encoded_email, token = AccountVerification().generate_token(user.email)
        send_templated_email.delay(
            user.email,
            EMAIL_VERIFICATION_EMAIL_SUBJECT,
            "nrh-org-account-creation-verification-email.txt",
            "nrh-org-account-creation-verification-email.html",
            {"verification_url": reverse("account_verification", kwargs={"email": encoded_email, "token": token})},
        )

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
            safe_messages = [
                message
                if message in PASSWORD_VALIDATION_EXPECTED_MESSAGES
                else PASSWORD_UNEXPECTED_VALIDATION_MESSAGE_SUBSTITUTE
                for message in exc.messages
            ]
            raise ValidationError(detail={"password": safe_messages})

    def validate_bad_actor(self, data):
        """Determine if user is a bad actor or not."""
        try:
            response = make_bad_actor_request(
                {
                    "email": data.validated_data["email"],
                    "referer": self.request.META.get("HTTP_REFERER", ""),
                    "ip": get_original_ip_from_request(self.request),
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

    def perform_update(self, serializer):
        """Override of `perform_update` to add our custom validations"""
        if password := serializer.validated_data.get("password"):
            self.validate_password(serializer.validated_data.get("email", self.get_object().email), password)
        serializer.save()
        # TODO: If email changed, unset email_verified and resend verification email.

    def list(self, request, *args, **kwargs):
        """Returns the requesting user's serialized user instance, not a list."""
        return Response(self.get_serializer(request.user).data)

    @action(detail=False, methods=["get"])
    def request_account_verification(self, request, *args, **kwargs):
        """(Re)Send account verification email."""
        # Note self.get_permissions() verifies authenticated user.
        if request.user.email_verified:
            return Response({"detail": "Account already verified"})
        elif not request.user.is_active:
            return Response({"detail": "Account inactive"})
        else:
            self.send_verification_email(request.user)
            return Response({"detail": "Success"})


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
