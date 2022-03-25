import logging

from django.conf import settings

from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.api.permissions import HasRoleAssignment
from apps.element_media.models import MediaImage
from apps.pages import serializers
from apps.pages.helpers import PageDetailError, PageFullDetailHelper
from apps.pages.models import DonationPage, Font, Style, Template
from apps.public.permissions import IsSuperUser
from apps.users.views import ViewSetUserQueryRouterMixin


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class PageViewSet(ViewSetUserQueryRouterMixin, viewsets.ModelViewSet):
    model = DonationPage
    queryset = DonationPage.objects.all()
    filter_backends = [
        filters.OrderingFilter,
    ]
    permission_classes = [
        IsAuthenticated,
        IsSuperUser | HasRoleAssignment,
    ]
    ordering_fields = ["username", "email"]
    ordering = ["published_date", "name"]
    # We don't expect orgs to have a huge number of pages here.
    # In the future, we may wish to turn pagination back on (which will require frontend changes) if
    # pages are ever accessed via api and not restricted by org.
    pagination_class = None

    __gate_create_by_rp = True
    __gate_create_by_org = True

    def get_serializer_class(self):

        if self.action in ("partial_update", "create"):
            return serializers.DonationPageFullDetailSerializer
        elif self.action == "retrieve":
            return serializers.DonationPageDetailSerializer
        else:
            return serializers.DonationPageListSerializer

    @action(detail=False, methods=["get"], permission_classes=[], authentication_classes=[], url_path="live-detail")
    def live_detail(self, request):
        """
        This is the action requested when a page needs to be viewed.
        """
        error = None
        try:
            page_detail_helper = PageFullDetailHelper(request, live=True)
            page_detail_helper.set_revenue_program()
            page_detail_helper.set_donation_page()
            page_detail_helper.validate_page_request()
            page_data = page_detail_helper.get_donation_page_data()
        except PageDetailError as page_detail_error:
            error = (page_detail_error.message, page_detail_error.status)

        if error:
            return Response({"detail": error[0]}, status=error[1])
        return Response(page_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_classes=[], url_path="draft-detail")
    def draft_detail(self, request):
        """
        This is the action requested when a page needs to be edited. Crucially, note the absence of the empty
        authentication_classes list here as compared to the live_detail version. This way, not only can we ensure
        users are authenticated before they view the page in edit mode, but the `validate_page_request` method
        can access request.user to verify an org-level relationship with the page requested.

        The actual edit actions are protected against unauthorized access in their own views.
        """
        error = None
        try:
            page_detail_helper = PageFullDetailHelper(request, live=False)
            page_detail_helper.set_revenue_program()
            page_detail_helper.set_donation_page()
            page_detail_helper.validate_page_request()
            page_data = page_detail_helper.get_donation_page_data()
        except PageDetailError as page_detail_error:
            error = (page_detail_error.message, page_detail_error.status)

        if error:
            return Response({"detail": error[0]}, status=error[1])
        return Response(page_data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        response = super().partial_update(request, *args, **kwargs)
        if request.FILES and request.data.get("sidebar_elements", None):
            # Link up thumbs and MediaImages
            data = MediaImage.create_from_request(request.POST, request.FILES, kwargs["pk"])
            response.data["sidebar_elements"] = data.get("sidebar_elements")
            page = DonationPage.objects.get(pk=kwargs["pk"])
            page.sidebar_elements = response.data["sidebar_elements"]
            page.save()
        return response

    def destroy(self, request, pk):
        page = self.model.objects.get(pk=pk)
        self.check_object_permissions(request, page)
        try:
            donation_page = self.model.objects.get(pk=pk)
        except DonationPage.DoesNotExist:
            logger.error(f'Request for non-existent page with ID "{pk}" ')
            return Response({"detail": "Could not find page with that ID"}, status=status.HTTP_404_NOT_FOUND)
        donation_page.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TemplateViewSet(viewsets.ModelViewSet):
    model = Template
    queryset = Template.objects.all()
    pagination_class = None

    def get_serializer_class(self):
        return (
            serializers.TemplateDetailSerializer
            if self.action
            in (
                "retrieve",
                "create",
            )
            else serializers.TemplateListSerializer
        )


class StyleViewSet(viewsets.ModelViewSet):
    model = Style
    queryset = Style.objects.all()
    serializer_class = serializers.StyleListSerializer
    pagination_class = None


class FontViewSet(viewsets.ReadOnlyModelViewSet):
    model = Font
    queryset = Font.objects.all()
    # Don't require a RoleAssignment for this endpoint.
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.FontSerializer
    pagination_class = None
