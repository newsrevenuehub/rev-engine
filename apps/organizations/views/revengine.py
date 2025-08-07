import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string

import reversion
import stripe
from knox.auth import TokenAuthentication
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.reverse import reverse
from stripe.error import StripeError

from apps.api.authentication import JWTHttpOnlyCookieAuthentication
from apps.api.permissions import (
    HasFlaggedAccessToMailchimp,
    HasRoleAssignment,
    IsGetRequest,
    IsHubAdmin,
    IsOrgAdmin,
    IsPatchRequest,
    IsRpAdmin,
)
from apps.common.views import FilterForSuperUserOrRoleAssignmentUserMixin
from apps.emails.tasks import (
    make_send_test_contribution_email_data,
    make_send_test_magic_link_email_data,
    send_receipt_email,
    send_templated_email,
)
from apps.organizations import serializers
from apps.organizations.models import CorePlan, FreePlan, Organization, RevenueProgram
from apps.organizations.serializers import MailchimpOauthSuccessSerializer, SendTestEmailSerializer
from apps.organizations.tasks import (
    exchange_mailchimp_oauth_code_for_server_prefix_and_access_token,
)
from apps.public.permissions import IsActiveSuperUser
from apps.users.models import Roles


user_model = get_user_model()

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


FREE_TO_CORE_UPGRADE_EMAIL_SUBJECT = "You've Upgraded to Core!"


class OrganizationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
    FilterForSuperUserOrRoleAssignmentUserMixin,
):
    """Organizations exposed through API.

    Only superusers and users with roles can access. Queryset is filtered by user.
    """

    model = Organization
    permission_classes = [
        IsAuthenticated,
        IsActiveSuperUser | (HasRoleAssignment & IsOrgAdmin & IsPatchRequest) | (HasRoleAssignment & IsGetRequest),
    ]
    serializer_class = serializers.OrganizationSerializer
    pagination_class = None

    def get_queryset(self) -> models.QuerySet:
        return self.filter_queryset_for_superuser_or_ra()

    def patch(self, request, pk):
        organization = get_object_or_404(self.get_queryset(), pk=pk)
        patch_serializer = serializers.OrganizationPatchSerializer(organization, data=request.data, partial=True)
        patch_serializer.is_valid()
        if patch_serializer.errors:
            raise ValidationError(patch_serializer.errors)
        patch_serializer.save()
        organization.refresh_from_db()
        return Response(serializers.OrganizationSerializer(organization).data)

    @staticmethod
    def construct_stripe_event(request: HttpRequest, payload: bytes) -> None:
        logger.info("Constructing Stripe event")
        try:
            return stripe.Webhook.construct_event(
                payload,
                request.META["HTTP_STRIPE_SIGNATURE"],
                secret=settings.STRIPE_WEBHOOK_SECRET_UPGRADES,
            )
        except stripe.error.SignatureVerificationError:
            logger.exception(
                "Invalid signature on Stripe webhook request. Is STRIPE_WEBHOOK_SECRET_CONTRIBUTIONS set correctly?"
            )
            raise APIException(code=status.HTTP_400_BAD_REQUEST) from None

    @classmethod
    def is_upgrade_from_free_to_core(cls, event: stripe.Event, org: Organization) -> bool:
        logger.info(
            "Checking if event %s is an upgrade from free to core for org with ID %s", event.get("id", "no id"), org.id
        )
        api_key = (
            settings.STRIPE_LIVE_SECRET_KEY_UPGRADES
            if settings.STRIPE_LIVE_MODE
            else settings.STRIPE_TEST_SECRET_KEY_UPGRADES
        )
        if not (sub_id := event["data"]["object"]["subscription"]):
            logger.warning("No subscription ID found in event %s", event.get("id", "no id"))
            return False
        subscription = stripe.Subscription.retrieve(sub_id, api_key=api_key)

        conditions = {
            "client_reference_id": event["data"]["object"]["client_reference_id"] == str(org.uuid),
            "checkout_sesion_completed": event["type"] == "checkout.session.completed",
            "stripe_core_product_id": settings.STRIPE_CORE_PRODUCT_ID
            and subscription["items"].data[0].price.product == settings.STRIPE_CORE_PRODUCT_ID,
            "org_plan_name": org.plan_name == FreePlan.name,
        }
        if missing := [k for k, v in conditions.items() if not v]:
            logger.info("The following conditions were not met: %s. Returning false", missing)
            return False
        return True

    @staticmethod
    def generate_integrations_management_url(org: Organization) -> str:
        logger.info("Generating mailchimp integration URL for org with ID %s", org.id)
        return f"{settings.SITE_URL}/settings/integrations/"

    @classmethod
    def send_upgrade_success_confirmation_email(cls, org: Organization):
        logger.info("`send_upgrade_success_confirmation_email` running")
        # TODO @BW: Refactor `send_templated_email` to accomodate a list of recipients
        # DEV-3777
        for to in (
            org.roleassignment_set.filter(role_type=Roles.ORG_ADMIN.value)
            .values_list("user__email", flat=True)
            .distinct("user__email")
        ):
            context = {
                "logo_url": f"{settings.SITE_URL}/static/nre_logo_black_yellow.png",
                "plus_icon": f"{settings.SITE_URL}/static/plus-icon.png",
                "mail_icon": f"{settings.SITE_URL}/static/mail-icon.png",
                "paint_icon": f"{settings.SITE_URL}/static/paint-icon.png",
                "check_icon": f"{settings.SITE_URL}/static/check-icon.png",
                "mailchimp_integration_url": cls.generate_integrations_management_url(org),
                "upgrade_days_wait": settings.UPGRADE_DAYS_WAIT,
            }
            logger.info("Sending upgrade confirmation email to %s", to)
            send_templated_email.delay(
                to=to,
                subject=FREE_TO_CORE_UPGRADE_EMAIL_SUBJECT,
                message_as_text=render_to_string("upgrade-confirmation.txt", context=context),
                message_as_html=render_to_string("upgrade-confirmation.html", context=context),
            )

    @classmethod
    def upgrade_from_free_to_core(cls, org: Organization, event: stripe.Event) -> None:
        logger.info("Upgrading org with ID %s from free to core", org.id)
        org.stripe_subscription_id = event["data"]["object"]["subscription"]
        org.plan_name = CorePlan.name
        with reversion.create_revision():
            org.save(update_fields={"stripe_subscription_id", "plan_name", "modified"})
            reversion.set_comment("`upgrade_from_free_to_core` upgraded this org")
        cls.send_upgrade_success_confirmation_email(org)

    @classmethod
    def handle_checkout_session_completed_event(cls, event: stripe.Event) -> None:
        logger.info("Handling checkout session completed event with event id %s", event["id"])
        ref_id = event["data"]["object"]["client_reference_id"]
        org = Organization.objects.filter(uuid=ref_id).first()
        if not org:
            logger.warning("No organization found with uuid %s", ref_id)
            return
        if org.stripe_subscription_id:
            logger.info(
                "Organization with uuid %s already has a stripe subscription id. No further action to be taken", ref_id
            )
            return
        if not cls.is_upgrade_from_free_to_core(event, org):
            logger.info(
                "Organization with uuid %s is not upgrading from free to core. No further action to be taken", ref_id
            )
            return
        cls.upgrade_from_free_to_core(org, event)

    @classmethod
    def handle_customer_subscription_deleted_event(cls, event: stripe.Event) -> None:
        logger.info("Handling customer subscription deleted event with event id %s", event["id"])
        sub_id = event["data"]["object"]["id"]
        try:
            org = Organization.objects.get(stripe_subscription_id=sub_id)
        except Organization.DoesNotExist:
            logger.warning("No organization found with stripe subscription id %s", sub_id)
            return
        org.downgrade_to_free_plan()

    @action(detail=False, methods=["post"], permission_classes=[])
    def handle_stripe_webhook(self, request: HttpRequest) -> Response:
        logger.info("Handling Stripe webhook")
        payload = request.body
        logger.info("Handling Stripe webhook event with type %s", request.data["type"])
        logger.info("The request body is %s", payload)
        event = self.construct_stripe_event(request, payload)
        match event["type"]:
            case "checkout.session.completed":
                self.handle_checkout_session_completed_event(event)
            case "customer.subscription.deleted":
                self.handle_customer_subscription_deleted_event(event)
            case _:
                logger.debug("No handler for event type %s", event["type"])
        return Response(status=status.HTTP_200_OK)


class RevenueProgramViewSet(FilterForSuperUserOrRoleAssignmentUserMixin, viewsets.ModelViewSet):
    model = RevenueProgram
    permission_classes = [
        IsAuthenticated,
        IsActiveSuperUser
        | (HasRoleAssignment & IsOrgAdmin & (IsPatchRequest | IsGetRequest))
        | (HasRoleAssignment & IsRpAdmin & IsGetRequest),
    ]
    serializer_class = serializers.RevenueProgramSerializer
    pagination_class = None
    http_method_names = ["get", "patch"]

    def get_queryset(self) -> models.QuerySet:
        return self.filter_queryset_for_superuser_or_ra()

    @action(
        detail=True,
        permission_classes=[IsOrgAdmin | IsHubAdmin | IsActiveSuperUser],
        serializer_class=serializers.ActiveCampaignRevenueProgramForSpaSerializer,
        methods=["GET", "PATCH"],
    )
    def activecampaign_configure(self, request: HttpRequest, pk: str) -> Response:
        """Allow retrieval and update of ActiveCampaign data for the revenue program with the given ID.

        The primary consumer of this data at time of this comment is the org dashboard in SPA.

        NB: This endpoint assumes that the RPs returned by the queryset are filtered by the user's role assignment.
        """
        revenue_program = get_object_or_404(self.get_queryset(), pk=pk)
        if request.method == "PATCH":
            serializer = self.serializer_class(revenue_program, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            revenue_program.refresh_from_db()
        else:
            serializer = self.serializer_class(revenue_program)
        return Response(serializer.data)

    @action(
        methods=["GET"],
        detail=True,
        # TODO @BW: Remove JWTHttpOnlyCookieAuthentication after DEV-5570
        # DEV-5571
        authentication_classes=[TokenAuthentication, JWTHttpOnlyCookieAuthentication],
        permission_classes=[IsAuthenticated, IsActiveSuperUser],
        serializer_class=serializers.MailchimpRevenueProgramForSwitchboard,
    )
    # TODO @BW: Move mailchimp config endpoint to SB viewset
    # DEV-6420
    def mailchimp(self, request, pk=None):
        """Return the mailchimp data for the revenue program with the given pk.

        The primary consumer of this data at time of this comment is Switchboard API.
        """
        revenue_program = get_object_or_404(self.get_queryset(), pk=pk)
        return Response(self.serializer_class(revenue_program).data)

    @action(
        methods=["GET", "PATCH"],
        detail=True,
        permission_classes=[IsAuthenticated, IsActiveSuperUser | (HasRoleAssignment & (IsOrgAdmin | IsHubAdmin))],
        serializer_class=serializers.MailchimpRevenueProgramForSpaConfiguration,
    )
    def mailchimp_configure(self, request, pk=None):
        """Allow retrieval and update of mailchimp configuration for the revenue program with the given pk.

        The primary consumer of this data at time of this comment is the RevEngine SPA.
        """
        revenue_program = get_object_or_404(self.get_queryset(), pk=pk)
        if request.method == "PATCH":
            serializer = self.serializer_class(revenue_program, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            revenue_program.refresh_from_db()
        return Response(self.serializer_class(revenue_program).data)


def get_stripe_account_link_return_url(request):
    """Exists purely to create a distinct return URL when running locally.

    This enables the full flow spanning SPA and backend and off-site Stripe form completion to be traversed.
    """
    reversed_url = reverse("index")
    if settings.STRIPE_ACCOUNT_LINK_RETURN_BASE_URL:
        return f"{settings.STRIPE_ACCOUNT_LINK_RETURN_BASE_URL}{reversed_url}"
    return request.build_absolute_uri(reversed_url)


@reversion.create_revision()
@api_view(["POST"])
@permission_classes([IsAuthenticated, HasRoleAssignment])
def handle_stripe_account_link(request, rp_pk):
    """Facilitate multiple round trips between the SPA and Stripe's Account Link configuration.

    Which happens off-site. The flow through this view is like this:

    1. The client makes a request providing a revenue program id.
    2. Retrieve the RP's payment provider.
        a. If it's already verified, we're done.
        b. If it's not verified we continue
    3. If the payment provider does not have a Stripe account (on first run through, it usually won't), create one, attaching
    its ID back to the payment provider instance.
    4. Check if charges are enabled on the Stripe account.
        a. If they are (they won't be when account is first created), we update the payment provider's stripe_verified value to True.
        We return a response with `requiresVerification` set to `False`.
        b. If charges are not enabled we keep going.
    5. The Stripe account data tells us why the account is disabled. That reason will contain one of two prefixes:
       'pending_verification' or `past_due`.
        a. If `pending_verification`, there's nothing to be done except wait. We send a response indicating that the
        Stripe connect process has started and that we're blocked by pending verification next steps to be processed on
        Stripe's end.
        b. If `past_due`, there are next steps for the user to do on Stripe's site. In this case, we create a new Stripe
        Account Link and send that URL back in the response.


    In testing, we've commonly had to make 3 or more round trips between the SPA and Stripe pivoting between the two via this endpoint.

    This endpoint is designed to support polling from the front end.
    """
    revenue_program = get_object_or_404(RevenueProgram, pk=rp_pk)
    # TODO @BW: Use user.permitted_organizations, user.permitted_revenue_programs, user.active_flags wherever possible
    # DEV-4082
    if not request.user.roleassignment.can_access_rp(revenue_program):
        logger.warning(
            "[handle_stripe_account_link] was asked to report on status of account link for RP with ID %s by user with id %s who does"
            " not have access.",
            rp_pk,
            request.user.id,
        )
        raise PermissionDenied(f"You do not have permission to access revenue program with the PK {rp_pk}")
    if not (payment_provider := revenue_program.payment_provider):
        logger.warning(
            "[handle_stripe_account_link] was asked to handle RP with ID %s,"
            " but that RP does not have a payment provider.",
            rp_pk,
        )
        return Response(
            {"detail": "The revenue program doesn't have a payment provider."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    if payment_provider.stripe_verified:
        return Response({"requiresVerification": False})
    if not payment_provider.stripe_account_id:
        try:
            account = stripe.Account.create(
                type="standard",
                country=revenue_program.country,
            )
        except StripeError:
            logger.exception("[handle_stripe_account_link] A stripe error occurred")
            return Response(
                {"detail": "Something went wrong creating Stripe account. Try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        payment_provider.stripe_account_id = account["id"]
        payment_provider.save()

        try:
            payment_provider.stripe_create_default_product()
        except StripeError:
            logger.exception("[handle_stripe_account_link] A stripe error occurred creating Stripe product")
            return Response(
                {"detail": "Something went wrong. Try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    else:
        try:
            account = stripe.Account.retrieve(payment_provider.stripe_account_id)
        except StripeError:
            logger.exception("[handle_stripe_account_link] A stripe error occurred")
            return Response(
                {"detail": "Something went wrong retrieving the Stripe account for this RP. Try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    if account["charges_enabled"]:
        if not payment_provider.stripe_verified:
            payment_provider.stripe_verified = True
            payment_provider.save()
        return Response({"requiresVerification": False})
    raw_reason = account["requirements"]["disabled_reason"]
    reason = (
        "past_due"
        if "past_due" in raw_reason
        else "pending_verification" if "pending_verification" in raw_reason else "unknown"
    )
    data = {"requiresVerification": True, "reason": reason, "stripeConnectStarted": account["details_submitted"]}
    if reason == "past_due":
        try:
            stripe_response = stripe.AccountLink.create(
                account=payment_provider.stripe_account_id,
                # The URL the user will be redirected to if the account link is expired, has been
                # previously-visited, or is otherwise invalid.
                refresh_url=get_stripe_account_link_return_url(request),
                # The URL that the user will be redirected to upon leaving or completing the linked flow.
                return_url=get_stripe_account_link_return_url(request),
                type="account_onboarding",
            )
            data = data | stripe_response
        except StripeError:
            logger.exception("[handle_stripe_account_link] A stripe error occurred")
            return Response(
                {"detail": "Cannot get stripe account link status at this time. Try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_test_email(request):
    """Send test email to user so that they can see what it looks like.

    Available email types are:

    1. receipt: this is the email that is sent to the user when they make a payment
    2. reminder: this is the email that is sent to the user reminding of a future payment
    3. magic_link: this is the email that is sent to the user when they click on the magic link to log in the contributor portal
    """
    serializer = SendTestEmailSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    rp_pk = serializer.validated_data["revenue_program"]
    email_name = serializer.validated_data["email_name"]

    revenue_program = get_object_or_404(RevenueProgram, pk=rp_pk)
    if not request.user.is_superuser and not request.user.roleassignment.can_access_rp(revenue_program):
        logger.warning(
            "[send_test_email] was asked to send a test email link for RP with ID %s by user with id %s who does"
            " not have access.",
            rp_pk,
            request.user.id,
        )
        return Response({"detail": "Requested revenue program not found"}, status=status.HTTP_404_NOT_FOUND)

    if email_name not in ["receipt", "reminder", "magic_link"]:
        raise ValidationError({"email_name": [f"Invalid email name: {email_name}"]})

    logger.info("Sending test email with type '%s', for user %s and rp %s", email_name, request.user.id, rp_pk)

    match email_name:
        case "receipt":
            data = make_send_test_contribution_email_data(request.user, revenue_program)
            send_receipt_email.delay(data)
        case "reminder":
            data = make_send_test_contribution_email_data(request.user, revenue_program)
            send_templated_email.delay(
                request.user.email,
                f"Reminder: {revenue_program.name} scheduled contribution",
                render_to_string("recurring-contribution-email-reminder.txt", data),
                render_to_string("recurring-contribution-email-reminder.html", data),
            )
        case "magic_link":
            data = make_send_test_magic_link_email_data(request.user, revenue_program)

            if data["style"]["is_default_logo"]:
                data["style"]["logo_url"] = f"{settings.SITE_URL}/static/nre-logo-white.png"

            send_templated_email.delay(
                request.user.email,
                "Manage your contributions",
                render_to_string("nrh-manage-contributions-magic-link.txt", data),
                render_to_string("nrh-manage-contributions-magic-link.html", data),
            )

    return Response(status=status.HTTP_202_ACCEPTED)


@api_view(["POST"])
@permission_classes([IsAuthenticated, HasFlaggedAccessToMailchimp, IsOrgAdmin])
def handle_mailchimp_oauth_success(request):
    logger.info("handle_mailchimp_oauth_success called with request data %s", request.data)
    serializer = MailchimpOauthSuccessSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    if (
        rp_id := serializer.validated_data["revenue_program"]
    ) not in RevenueProgram.objects.filtered_by_role_assignment(request.user.roleassignment).values_list(
        "id", flat=True
    ):
        logger.warning(
            "`handle_mailchimp_oauth_success` called with request data referencing a non-existent or unowned revenue program"
            " with ID %s by user with email %s",
            rp_id,
            request.user.email,
        )
        return Response({"detail": "Requested revenue program not found"}, status=status.HTTP_404_NOT_FOUND)
    logger.info(
        "handle_mailchimp_oauth_success asyncronously exchanging Oauth code for server prefix and access"
        " token for revenue program with ID %s",
        rp_id,
    )
    exchange_mailchimp_oauth_code_for_server_prefix_and_access_token.delay(
        rp_id, serializer.validated_data["mailchimp_oauth_code"]
    )
    return Response(status=status.HTTP_202_ACCEPTED)
