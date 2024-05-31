import binascii
import logging
from base64 import urlsafe_b64decode, urlsafe_b64encode

import django
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
from django.dispatch import receiver
from django.http import HttpResponseRedirect
from django.template.loader import render_to_string
from django.urls import reverse, reverse_lazy
from django.utils.safestring import mark_safe
from django.views.decorators.http import require_GET

import reversion
from django_rest_passwordreset.signals import reset_password_token_created
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from rest_framework.viewsets import GenericViewSet
from reversion.views import RevisionMixin

from apps.common.utils import get_original_ip_from_request
from apps.contributions.bad_actor import BadActorAPIError, make_bad_actor_request
from apps.contributions.utils import get_sha256_hash
from apps.emails.tasks import send_templated_email
from apps.users.constants import (
    BAD_ACTOR_CLIENT_FACING_VALIDATION_MESSAGE,
    BAD_ACTOR_FAKE_AMOUNT,
    EMAIL_VERIFICATION_EMAIL_SUBJECT,
    INVALID_TOKEN,
    PASSWORD_UNEXPECTED_VALIDATION_MESSAGE_SUBSTITUTE,
    PASSWORD_VALIDATION_EXPECTED_MESSAGES,
)
from apps.users.models import User
from apps.users.permissions import (
    UserHasAcceptedTermsOfService,
    UserIsAllowedToUpdate,
    UserOwnsUser,
)
from apps.users.serializers import (
    AuthedUserSerializer,
    CustomizeAccountSerializer,
    MutableUserSerializer,
)


logger = logging.getLogger(__name__)

user_model = get_user_model()


@require_GET
def account_verification(request, email, token):
    """Endpoint for verification link in "verify your email address" emails."""
    checker = AccountVerification()
    if user := checker.validate(email, token):
        user.email_verified = True
        with reversion.create_revision():
            user.save(update_fields={"email_verified", "modified"})
            reversion.set_comment("Updated by `account_verification` view.")
        return HttpResponseRedirect(reverse("spa_account_verification"))
    # Having failure reason in URL is non-optimal.
    return HttpResponseRedirect(reverse("spa_account_verification_fail", kwargs={"failure": checker.fail_reason}))


class AccountVerification(signing.TimestampSigner):
    def __init__(self):
        # fail_reason is set after validate() called and will be one of the following
        # [failed, expired, inactive, unknown]. See validate() for meanings.
        self.fail_reason = ""
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
            logger.info("Account Verification: Malformed or missing email/token for email: %s", email)
            self.fail_reason = "failed"
            return False
        if self.max_age:
            try:
                token = self.unsign(token, self.max_age)
            except signing.SignatureExpired:
                logger.warning("Account Verification: URL Expired for email: %s", email)
                self.fail_reason = "expired"
                return False
            except signing.BadSignature:
                logger.info("Account Verification: Bad Signature for email: %s", email)
                self.fail_reason = "failed"
                return False
        if token != self._hash(email):
            logger.info("Account Verification: Invalid token for email: %s", email)
            self.fail_reason = "failed"
            return False
        if not (
            user := get_user_model().objects.filter(email=email).first()
        ):  # Get the (only) matching User or None instead of raising exception.
            logger.info("Account Verification: No user for email: %s", email)
            self.fail_reason = "unknown"
            return False
        if not user.is_active:
            logger.warning("Account Verification: Inactive user for email: %s", email)
            self.fail_reason = "inactive"
            return False
        return user

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
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    GenericViewSet,
    RevisionMixin,
):
    """For creating and updating user instances."""

    model = User
    queryset = User.objects.all()
    # We're explicitly setting allowed methods in order to prohibit PUT updates. If PUT
    # added, the custom logic in UserSerializer.get_fields will have to be addressed.
    http_method_names = ["get", "post", "patch"]

    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        if self.request.method == "PATCH":
            serializer.fields["accepted_terms_of_service"].required = False
            serializer.fields["accepted_terms_of_service"].read_only = True
            serializer.fields["password"].required = False
        return serializer

    def get_serializer_class(self):
        if self.action == "list":
            return AuthedUserSerializer
        return MutableUserSerializer

    def get_permissions(self):
        permission_classes = {
            "create": [
                AllowAny,
            ],
            "list": [
                IsAuthenticated,
            ],
            "partial_update": [UserOwnsUser, UserIsAllowedToUpdate],
            "request_account_verification": [IsAuthenticated],
            "customize_account": [UserOwnsUser, IsAuthenticated, UserIsAllowedToUpdate, UserHasAcceptedTermsOfService],
        }.get(self.action, [])

        return [permission() for permission in permission_classes]

    def send_verification_email(self, user: user_model):
        """Send email to user asking them to click verify their email address link.

        NB: this method assumes that the user sent as `user` has already been saved to the database.
        In this caes, it will be guaranteed to have a .email property.
        """
        logger.info("Sending verification email to %s", user.email)
        encoded_email, token = AccountVerification().generate_token(user.email)
        url = self.request.build_absolute_uri(
            reverse("account_verification", kwargs={"email": encoded_email, "token": token})
        )
        data = {
            "verification_url": django.utils.safestring.mark_safe(url),
            "logo_url": f"{settings.SITE_URL}/static/nre_logo_black_yellow.png",
        }
        # temp log to diagnose
        logger.info("calling async task to send verification email to %s", user.email)
        send_templated_email.delay(
            user.email,
            EMAIL_VERIFICATION_EMAIL_SUBJECT,
            render_to_string("nrh-org-account-creation-verification-email.txt", data),
            render_to_string("nrh-org-account-creation-verification-email.html", data),
        )
        # temp log to diagnose
        logger.info("just called async task to send verification email to %s", user.email)

    def validate_password(self, email, password):
        """Validate the password.

        NB: This needs to be done in view layer and not serializer layer because Django's password
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
                (
                    message
                    if message in PASSWORD_VALIDATION_EXPECTED_MESSAGES
                    else PASSWORD_UNEXPECTED_VALIDATION_MESSAGE_SUBSTITUTE
                )
                for message in exc.messages
            ]
            raise ValidationError(detail={"password": safe_messages}) from exc

    def validate_bad_actor(self, data):
        """Determine if user is a bad actor or not.

        NB: This assumes org users and may do unexpected things if applied to contributor users or others (though that is not exposed)
        """
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
        if response.json()["overall_judgment"] >= settings.BAD_ACTOR_REJECT_SCORE_FOR_ORG_USERS:
            logger.warning("Someone determined to be a bad actor tried to create a user: [%s]", data)
            raise ValidationError(BAD_ACTOR_CLIENT_FACING_VALIDATION_MESSAGE)

    def perform_create(self, serializer):
        """Override of `perform_create` to add our custom validations."""
        self.validate_password(serializer.validated_data.get("email"), serializer.validated_data.get("password"))
        self.validate_bad_actor(serializer)
        user = serializer.save()
        self.send_verification_email(user)

    def perform_update(self, serializer):
        """Override of `perform_update` to add our custom validations."""
        if password := serializer.validated_data.get("password"):
            self.validate_password(serializer.validated_data.get("email", self.get_object().email), password)
        serializer.save()
        # TODO: If email changed, unset email_verified and resend verification email.

    def list(self, request, *args, **kwargs):
        """Return the requesting user's serialized user instance, not a list."""
        return Response(self.get_serializer_class()(instance=request.user).data)

    @action(detail=True, methods=["patch"])
    def customize_account(self, request, pk=None):
        """Customize an account."""
        logger.info("Received request to customize account for user %s; request: %s", request.user.id, request.data)
        serializer = CustomizeAccountSerializer(data=request.data, context={"user": request.user})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def request_account_verification(self, request, *args, **kwargs):
        """(Re)Send account verification email."""
        # Note self.get_permissions() verifies authenticated user.
        if request.user.email_verified:
            return Response({"detail": "Account already verified"}, status=status.HTTP_404_NOT_FOUND)
        if not request.user.is_active:
            return Response({"detail": "Account inactive"}, status=status.HTTP_404_NOT_FOUND)
        self.send_verification_email(request.user)
        return Response({"detail": "Success"})


@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    """Send password reset email with token and appropriate link.

    This function is not strictly speaking a view, but instead is an action that runs when
    signal sent by `django-rest-password-reset` that a reset token has been created. The docs for that
    library recommend putting in model or views file, or else apps.config.

    This causes an email to be sent to user who requested pw reset.

    https://github.com/anexia-it/django-rest-passwordreset#example-for-sending-an-e-mail
    """
    if not reset_password_token or not reset_password_token.user or not reset_password_token.user.email:
        return
    email = reset_password_token.user.email
    spa_reset_url = "{}{}?token={}".format(
        instance.request.build_absolute_uri(reverse("index")),
        "password_reset",
        reset_password_token.key,
    )
    context = {
        "email": email,
        "reset_password_url": mark_safe(spa_reset_url),
        "logo_url": f"{settings.SITE_URL}/static/nre_logo_black_yellow.png",
    }
    logger.info(
        "Sending password reset email to %s (with ID: %s) with the following reset url: %s",
        email,
        reset_password_token.user.id,
        spa_reset_url,
    )
    send_templated_email(
        email,
        "Reset your password for News Revenue Engine",
        render_to_string("nrh-org-portal-password-reset.txt", context),
        render_to_string("nrh-org-portal-password-reset.html", context),
    )
