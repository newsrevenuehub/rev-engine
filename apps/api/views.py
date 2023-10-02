import logging
from dataclasses import asdict
from datetime import datetime
from urllib.parse import quote_plus, urlparse

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from django.middleware import csrf
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils.safestring import mark_safe

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt import exceptions
from rest_framework_simplejwt import views as simplejwt_views
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.api.authentication import ShortLivedTokenAuthentication
from apps.api.serializers import ContributorObtainTokenSerializer
from apps.api.throttling import ContributorRateThrottle
from apps.api.tokens import ContributorRefreshToken
from apps.contributions.models import Contributor
from apps.contributions.serializers import ContributorSerializer
from apps.contributions.tasks import task_pull_serialized_stripe_contributions_to_cache
from apps.emails.tasks import send_templated_email
from apps.organizations.models import Organization, RevenueProgram
from apps.users.choices import Roles
from apps.users.models import RoleAssignment
from apps.users.serializers import AuthedUserSerializer


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


COOKIE_PATH = "/"


def construct_rp_domain(subdomain, referer=None):
    """Find Revenue Program specific subdomain and use it to construct magic link host.

    Return RP specific domain or None if not found.
    """
    logger.info("[construct_rp_domain] constructing rp domain for subdomain (%s) and referer (%s)", subdomain, referer)
    if ":" in subdomain:  # Assume full url.
        subdomain = urlparse(subdomain).hostname.split(".")[0]
    if not subdomain and referer:
        bits = urlparse(referer).hostname.split(".")
        if len(bits) > 2:
            subdomain = bits[0]
    if not subdomain:
        return None
    parsed = urlparse(settings.SITE_URL)
    domain_bits = parsed.hostname.split(".")
    if len(domain_bits) > 2:
        domain_bits = domain_bits[1:]  # All but leaf subdomain.
    domain = ".".join(
        [
            subdomain,
        ]
        + domain_bits
    )
    if parsed.port:
        domain += f":{parsed.port}"
    return domain


def set_token_cookie(response, token, expires):
    logger.info("[set_token_cookie] for token (%s)", token)
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

    NB: sets permission_classes to an empty list, in case permissions are
    set as defaults in parent context. The JWT resource inherently needs to be
    accessible.
    """

    permission_classes = []

    # These fields are used in calls to .only below to optimize queries.
    # They are required by OrganizationInlineSerializer, which AuthedUserSerializer uses
    # """
    org_onlies: tuple[str] = (
        "id",
        "name",
        "plan_name",
        "send_receipt_email_via_nre",
        "show_connected_to_mailchimp",
        "show_connected_to_salesforce",
        "show_connected_to_slack",
        "slug",
        "uuid",
    )

    # These fields are used in calls to .only below to optimize queries.
    # They are required by RevenueProgramInlineSerializerForAuthedUserSerializer, which AuthedUserSerializer uses
    rp_onlies: tuple[str] = (
        "fiscal_sponsor_name",
        "fiscal_status",
        "id",
        "name",
        "organization",
        "payment_provider__stripe_verified",
        "slug",
        "tax_id",
    )

    # These fields are used in calls to .only below to optimize queries.
    # They are required by RevenueProgramInlineSerializerForAuthedUserSerializer and OrganizationInlineSerializer,
    # which AuthedUserSerializer uses
    ra_onlies: tuple[str] = tuple(
        [f"organization__{x}" for x in org_onlies] + [f"revenue_programs__{x}" for x in rp_onlies]
    )

    def get_role_type(self, val: str = None) -> tuple[str, str]:
        return (str(Roles(val)), Roles(val).label)

    def get_all_orgs_and_rps(self) -> tuple[QuerySet, QuerySet]:
        """Convenience method to dry up repeated logic used for superusers and hub admins."""
        return (
            Organization.objects.only(*self.org_onlies).all(),
            RevenueProgram.objects.select_related("payment_provider").only(*self.rp_onlies).all(),
        )

    def get_user(self, user: get_user_model()) -> get_user_model():
        """Return a user object as required by the AuthedUserSerializer.

        This method is somewhat convoluted but this is in the service of fully optimizing the queries
        and handling complexity around superusers and hub admins requiring different queries than
        org admins and rp admins.
        """

        if user.is_superuser:
            # TODO: [DEV-3913] Change this to .organizations once that's no longer on user model
            user._organizations, user.revenue_programs = self.get_all_orgs_and_rps()
            user.role_type = ("superuser", "Superuser")
            return user

        try:
            role_type = RoleAssignment.objects.only("role_type").get(user=user).role_type
        except RoleAssignment.DoesNotExist:
            role_type = None

        if role_type == Roles.HUB_ADMIN:
            # TODO: [DEV-3913] Change this to .organizations once that's no longer on user model
            user._organizations, user.revenue_programs = self.get_all_orgs_and_rps()
            user.role_type = self.get_role_type(val=role_type)
            return user

        if role_type not in [Roles.ORG_ADMIN, Roles.RP_ADMIN, Roles.HUB_ADMIN]:
            # TODO: [DEV-3913] Change this to .organizations once that's no longer on user model
            user._organizations = []
            user.revenue_programs = []
            user.role_type = None
            return user

        # default case for rp_admin and org_admin
        user.role_type = self.get_role_type(val=role_type)
        ra = (
            RoleAssignment.objects.filter(user=user)
            .prefetch_related("revenue_programs", "revenue_programs__payment_provider")
            .select_related("organization")
            .only(*self.ra_onlies)
            .first()
        )
        # TODO: [DEV-3913] Change this to .organizations once that's no longer on user model
        user._organizations = [ra.organization]
        user.revenue_programs = ra.revenue_programs
        return user

    def post(self, request, *args, **kwargs):
        jwt_serializer = TokenObtainPairSerializer(data=request.data)
        try:
            jwt_serializer.is_valid(raise_exception=True)
        except exceptions.TokenError as e:
            raise exceptions.InvalidToken(e.args[0])

        response = Response(
            {
                "detail": "success",
                "csrftoken": csrf.get_token(self.request),
                "user": AuthedUserSerializer(self.get_user(jwt_serializer.user)).data,
            },
            status=status.HTTP_200_OK,
        )
        return set_token_cookie(
            response,
            jwt_serializer.validated_data["access"],
            datetime.now() + settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"],
        )

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
    Contributors enter their email address in to a form and request a magic link.

    Here we validate that email address, check if they exist. If they don't,
    we send the same response as if they did. We don't want to expose
    contributors here. We also rate-limit this endpoint by email requested to
    prevent reverse brute-forcing tokens (though that's nearly impossible
    without this protection).
    """

    authentication_classes = []
    permission_classes = []
    filter_backends = []
    throttle_classes = [ContributorRateThrottle]

    @staticmethod
    def get_magic_link(domain, token, email):
        return f"https://{domain}/{settings.CONTRIBUTOR_VERIFY_URL}?token={token}&email={quote_plus(email)}"

    def post(self, request, *args, **kwargs):
        logger.info("[RequestContributorTokenEmailView][post] Request received for magic link %s", request.data)
        serializer = ContributorObtainTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contributor, created = Contributor.objects.get_or_create(email=request.data["email"])
        if created:
            logger.info(
                "[RequestContributorTokenEmailView] Created new contributor with email %s", request.data["email"]
            )

        serializer.update_short_lived_token(contributor)

        domain = construct_rp_domain(serializer.validated_data.get("subdomain", ""), request.headers.get("Referer", ""))

        if not domain:
            logger.info("[RequestContributorTokenEmailView][post] Could not determine domain for request")
            return Response({"detail": "Missing Revenue Program subdomain"}, status=status.HTTP_404_NOT_FOUND)
        logger.info("Trying to retrieve revenue program by slug: %s", serializer.validated_data.get("subdomain"))

        revenue_program = get_object_or_404(RevenueProgram, slug=serializer.validated_data.get("subdomain"))
        # Celery backend job to pull contributions from Stripe and store the serialized data in cache, user will have
        # data by the time the user opens contributor portal.
        task_pull_serialized_stripe_contributions_to_cache.delay(
            serializer.validated_data["email"], revenue_program.stripe_account_id
        )

        magic_link = self.get_magic_link(
            domain, serializer.validated_data["access"], serializer.validated_data["email"]
        )
        logger.info(
            "Sending magic link email to [%s] | magic link: [%s]", serializer.validated_data["email"], magic_link
        )
        data = {
            "magic_link": mark_safe(magic_link),
            "email": serializer.validated_data["email"],
            "style": asdict(revenue_program.transactional_email_style),
            "rp_name": revenue_program.name,
        }
        send_templated_email.delay(
            serializer.validated_data["email"],
            "Manage your contributions",
            render_to_string("nrh-manage-contributions-magic-link.txt", data),
            render_to_string("nrh-manage-contributions-magic-link.html", data),
        )
        # Email is async task. We won't know if it succeeds or not so optimistically send OK.
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
        logger.info("[VerifyContributorTokenView][post] Request received for user (%s)", request.user)
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
