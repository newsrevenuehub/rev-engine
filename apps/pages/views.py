import logging

from django.conf import settings
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

import django_filters
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from reversion.views import RevisionMixin

from apps.api.permissions import HasRoleAssignment
from apps.common.views import FilterForSuperUserOrRoleAssignmentUserMixin
from apps.element_media.models import MediaImage
from apps.organizations.models import RevenueProgram
from apps.pages import serializers
from apps.pages.filters import StyleFilter
from apps.pages.models import DonationPage, Font, Style
from apps.public.permissions import IsActiveSuperUser


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class PageDetailError(Exception):
    def __init__(self, message, *args, status=status.HTTP_404_NOT_FOUND, **kwargs):
        super().__init__(*args, **kwargs)
        self.message = message
        self.status = status


class PageFullDetailHelper:
    def __init__(self, request, live=False):
        self.request = request
        self.live = live
        try:
            self.revenue_program_slug = request.GET["revenue_program"]
            self.page_slug = request.GET.get("page")
        except KeyError:
            raise PageDetailError("Missing required parameter", status=status.HTTP_400_BAD_REQUEST) from None
        try:
            self.revenue_program = (
                RevenueProgram.objects.select_related(
                    "organization", "payment_provider", "default_donation_page__styles"
                )
                .prefetch_related("benefitlevel_set", "default_donation_page")
                .get(slug=self.revenue_program_slug)
            )
        except RevenueProgram.DoesNotExist:
            logger.info('Request for page with non-existent RevenueProgram by slug "%s"', self.revenue_program_slug)
            raise PageDetailError("Could not find revenue program matching those parameters") from None
        self.donation_page = (
            self.revenue_program.donationpage_set.select_related(
                "revenue_program__organization", "revenue_program__payment_provider", "styles"
            )
            .prefetch_related("revenue_program__benefitlevel_set")
            .filter(slug=self.page_slug)
            .first()
            if self.page_slug
            # If no default_donation_page is set, return the first page in the RP
            # We need to return a valid "donation_page" to populate "Welcome to the {page.revenue_program.name}
            # contributor portal" in the UI
            else (
                self.revenue_program.default_donation_page
                if self.revenue_program.default_donation_page
                else self.revenue_program.donationpage_set.select_related(
                    "revenue_program__organization", "revenue_program__payment_provider", "styles"
                )
                .prefetch_related("revenue_program__benefitlevel_set")
                .first()
            )
            # Context why this can be done:
            # The serializer returns rp.default_donation_page, so we can check on the Frontend if the donation page is
            # the default page or not
        )
        if not self.donation_page:
            if self.page_slug:
                logger.info('Request for non-existent page by slug "%s"', self.page_slug)
            else:
                logger.info(
                    'Request for default contribution page, but no default page set for revenue program "%s"',
                    self.revenue_program.name,
                )
            raise PageDetailError("Could not find page matching those parameters")
        self._validate_page_request()

    def get_data(self):
        """Serialize Contribution Page and return JSON."""
        page_serializer = serializers.DonationPageFullDetailSerializer(
            instance=self.donation_page, context={"live": self.live}
        )
        return page_serializer.data

    def _validate_page_request(self):
        """Ensure valid request.

        - If page is not requested live, check nothing.
        - If page is requested live, the contribution page IS live aka "published".
        - If page is requested live, the Organization has a verified payment provider.
        """
        if not self.live:
            return
        if not self.donation_page.is_live:
            logger.info('Request for un-published page "%s"', self.donation_page)
            raise PageDetailError(message="This page has not been published", status=status.HTTP_404_NOT_FOUND)
        if not self.revenue_program.payment_provider:
            logger.error(
                (
                    'Request made for live page "%s", but RP "%s" does not have a payment provider configured. '
                    "The RP can be updated at %s"
                ),
                self.donation_page,
                self.donation_page.revenue_program.name,
                reverse("admin:organizations_revenueprogram_change", args=(self.revenue_program.id,)),
            )
            raise PageDetailError(
                message="RevenueProgram does not have a payment provider configured",
                status=status.HTTP_404_NOT_FOUND,
            )
        if not self.revenue_program.payment_provider.is_verified_with_default_provider():
            logger.error(
                (
                    'Request made for live page "%s", but RP "%s" is not verified with its default payment provider. '
                    "Payment provider can be updated at %s"
                ),
                self.donation_page,
                self.donation_page.revenue_program.name,
                reverse("admin:organizations_paymentprovider_change", args=(self.revenue_program.payment_provider.id,)),
            )
            raise PageDetailError("RevenueProgram does not have a fully verified payment provider")


class PageViewSet(FilterForSuperUserOrRoleAssignmentUserMixin, RevisionMixin, viewsets.ModelViewSet):
    """Contribution pages exposed through API.

    Only superusers and users with role assignments are meant to have access. Results of lists are filtered
    on per user basis.
    """

    model = DonationPage
    filter_backends = [
        filters.OrderingFilter,
    ]
    permission_classes = [
        IsAuthenticated,
        IsActiveSuperUser | HasRoleAssignment,
    ]
    ordering_fields = ["username", "email"]
    ordering = ["published_date", "name"]
    # We don't expect orgs to have a huge number of pages here.
    # In the future, we may wish to turn pagination back on (which will require frontend changes) if
    # pages are ever accessed via api and not restricted by org.
    pagination_class = None

    # we don't allow put
    http_method_names = ["get", "patch", "delete", "post"]

    def get_queryset(self):
        return self.filter_queryset_for_superuser_or_ra()

    def get_serializer_class(self):
        if self.action in ("partial_update", "create", "retrieve"):
            return serializers.DonationPageFullDetailSerializer

    @method_decorator(ensure_csrf_cookie)
    @action(detail=False, methods=["get"], permission_classes=[], authentication_classes=[], url_path="live-detail")
    def live_detail(self, request):
        """Request when a published page needs to be viewed.

        Permission and authentication classes are reset because meant to be open access.
        """
        try:
            donation_page = PageFullDetailHelper(request, live=True)
            return Response(donation_page.get_data(), status=status.HTTP_200_OK)
        except PageDetailError as exc:
            return Response({"detail": exc.message}, status=exc.status)

    @action(detail=False, methods=["get"], url_path="draft-detail")
    def draft_detail(self, request):
        """Get a page by revenue program slug + page slug.

        NB: This endpoint use to serve a different purpose which informed the method name and url path.
        This endpoint gets used by the SPA in contexts where the RP and page slugs are available and known,
        but not the page ID.

        Access control is ensured by implementation of `get_queryset` above. In short, you can't retrieve
        a page by this method that you don't own (it's owned by diff org or rp)
        or have access to (via being superuser or hub admin).
        """
        try:
            donation_page = PageFullDetailHelper(request, live=False)
            return Response(donation_page.get_data(), status=status.HTTP_200_OK)
        except PageDetailError as exc:
            return Response({"detail": exc.message}, status=exc.status)

    def partial_update(self, request, *args, **kwargs):
        response = super().partial_update(request, *args, **kwargs)
        # The `all` condtion below is quirky, but necessary for now because this view is dealing with
        # multipart form data in order to support file upload.
        #
        # If the environment is set up to capture page screenshots, then request.FILES will always be truthy
        # because a page screenshot will always be there. But in case where the user has added an image element
        # to sidebar elements, request.FILES will also contain that data. So one case we need to support is
        # when user patches the page to add an image to sidebar elements — this is the scenario presupposed by the
        # call to `MediaImage.create_from_request` below (although that will also run even if no image is present).
        #
        # Another scenario we need to support is when a user is trying to set sidebar_elements to be an empty list, and
        # this is why we need to include `request.data.get('sidebar_elements')` in the `all` condition below.
        # If the user is setting sidebar_elements to be empty, then the value for sidebar elements in the request data will
        # be the string value '[]', representing an empty list. The reason this value will be an empty string is because
        # this endpoint is supporting file upload, and therefore form data instead of JSON is submitted. If we know
        # that `sidebar_elements` are being patched, we then need to look at `response.data.sidebar_elements` because this
        # contains the value for that field after the serializer has converted the validated data to a list (in this cae, an empty one).
        #
        #
        # Yet another scenario we need to support is when the page already has an image sidebar element, but elements other
        # than sidebar_elements are being patched. In that case, we do NOT want the conditional block below to run because
        # it will cause an error because `data = MediaImage.create_from_request(request.POST, request.FILES, kwargs["pk"])` will
        # yield `None` and the db will raise an integrity error when we attempt to set that field to None when saving. This scenario
        # was the cause of a bug captured in [DEV-2861](https://news-revenue-hub.atlassian.net/browse/DEV-2861)
        if all([request.FILES, request.data.get("sidebar_elements"), response.data.get("sidebar_elements", None)]):
            # Link up thumbs and MediaImages
            data = MediaImage.create_from_request(request.POST, request.FILES, kwargs["pk"])
            response.data["sidebar_elements"] = data.get("sidebar_elements")
            page = DonationPage.objects.get(pk=kwargs["pk"])
            page.sidebar_elements = response.data["sidebar_elements"]
            page.save()
        return response

    def destroy(self, request, pk):
        try:
            page = self.get_queryset().get(pk=pk)
        except DonationPage.DoesNotExist:
            logger.exception('Request for non-existent page with ID "%s"', pk)
            return Response({"detail": "Could not find page with that ID"}, status=status.HTTP_404_NOT_FOUND)
        page.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def list(self, request):
        """List all available pages for the current user.

        NB: This method assumes that any queryset filtering vis-a-vis user role and identity has
        already been done upstream in get_queryset.

        In order to optimize for query performance, we limit returned fields with .only (which we configure the
        serializer to define, as that's the place where these field references are maintained)
        """
        serializer = serializers.DonationPageListSerializer
        qs = self.get_queryset().only(*serializer._ONLIES)
        serialized = serializer(qs, many=True)
        return Response(serialized.data)


class StyleViewSet(FilterForSuperUserOrRoleAssignmentUserMixin, RevisionMixin, viewsets.ModelViewSet):
    """Contribution Page Template styles exposed through API.

    Only superusers and users with role assignments are meant to have access. Results of lists are filtered
    on per user basis.
    """

    model = Style
    queryset = Style.objects.all()
    serializer_class = serializers.StyleListSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated, IsActiveSuperUser | HasRoleAssignment]
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_class = StyleFilter

    # prohibit put
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        return self.filter_queryset_for_superuser_or_ra()


class FontViewSet(viewsets.ReadOnlyModelViewSet):
    model = Font
    queryset = Font.objects.all()
    permission_classes = [IsAuthenticated]  # anyone who is authenticated read
    serializer_class = serializers.FontSerializer
    pagination_class = None
