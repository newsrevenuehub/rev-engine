import logging

from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

import django_filters
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from reversion.views import RevisionMixin

from apps.api.permissions import HasRoleAssignment
from apps.element_media.models import MediaImage
from apps.pages import serializers
from apps.pages.filters import StyleFilter
from apps.pages.helpers import PageDetailError, PageFullDetailHelper
from apps.pages.models import DonationPage, Font, Style, Template
from apps.public.permissions import IsActiveSuperUser
from apps.users.views import FilterQuerySetByUserMixin, PerUserDeletePermissionsMixin


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class PageViewSet(RevisionMixin, viewsets.ModelViewSet, FilterQuerySetByUserMixin, PerUserDeletePermissionsMixin):
    """Donation pages exposed through API

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

    def get_queryset(self):
        # supplied by FilterQuerySetByUserMixin
        return self.filter_queryset_for_user(self.request.user, self.model.objects.all())

    def get_serializer_class(self):
        if self.action in ("partial_update", "create", "retrieve"):
            return serializers.DonationPageFullDetailSerializer
        else:
            return serializers.DonationPageListSerializer

    @method_decorator(ensure_csrf_cookie)
    @action(detail=False, methods=["get"], permission_classes=[], authentication_classes=[], url_path="live-detail")
    def live_detail(self, request):
        """
        This is the action requested when a page needs to be viewed.

        Permission and authentication classes are reset because meant to be open access.
        """
        try:
            helper = PageFullDetailHelper(request, live=True)
            return Response(helper.get_donation_page_data(), status=status.HTTP_200_OK)
        except PageDetailError as e:
            return Response({"detail": e.message}, status=e.status)

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
            helper = PageFullDetailHelper(request)
            return Response(helper.get_donation_page_data(), status=status.HTTP_200_OK)
        except PageDetailError as e:
            return Response({"detail": e.message}, status=e.status)

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
        try:
            page = self.model.objects.get(pk=pk)
        except DonationPage.DoesNotExist:
            logger.error('Request for non-existent page with ID "%s"', pk)
            return Response({"detail": "Could not find page with that ID"}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, page)
        page.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TemplateViewSet(RevisionMixin, viewsets.ModelViewSet, FilterQuerySetByUserMixin):
    """Page templates as exposed through API

    Only superusers and users with role assignments are meant to have access. Results of lists are filtered
    on per user basis.
    """

    model = Template
    queryset = Template.objects.all()
    pagination_class = None

    permission_classes = [
        IsAuthenticated,
        IsActiveSuperUser | HasRoleAssignment,
    ]

    def get_queryset(self):
        return self.filter_queryset_for_user(self.request.user, self.model.objects.all())

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


class StyleViewSet(RevisionMixin, viewsets.ModelViewSet, FilterQuerySetByUserMixin, PerUserDeletePermissionsMixin):
    """Donation pages exposed through API

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

    def get_queryset(self):
        return self.filter_queryset_for_user(self.request.user, self.model.objects.all())


class FontViewSet(viewsets.ReadOnlyModelViewSet):
    model = Font
    queryset = Font.objects.all()
    # anyone who is authenticated read
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.FontSerializer
    pagination_class = None
