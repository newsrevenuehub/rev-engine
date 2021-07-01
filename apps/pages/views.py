import logging

from django.conf import settings

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.api.permissions import UserBelongsToOrg
from apps.organizations.models import RevenueProgram
from apps.organizations.views import OrganizationLimitedListView
from apps.pages import serializers
from apps.pages.models import Benefit, BenefitTier, DonationPage, DonorBenefit, Style, Template


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class PageViewSet(OrganizationLimitedListView, viewsets.ModelViewSet):
    model = DonationPage
    permission_classes = [IsAuthenticated, UserBelongsToOrg]

    def get_serializer_class(self):
        if self.action in ("full_detail", "partial_update", "create"):
            return serializers.DonationPageFullDetailSerializer
        elif self.action == "retrieve":
            return serializers.DonationPageDetailSerializer
        else:
            return serializers.DonationPageListSerializer

    @action(detail=False, methods=["get"], permission_classes=[], authentication_classes=[])
    def full_detail(self, request):
        """
        This is the action requested when a page needs to be viewed/edited.
        """
        revenue_program_slug = request.GET.get("revenue_program")
        page_slug = request.GET.get("page")
        live = request.GET.get("live") == "1" or False

        if not revenue_program_slug:
            return Response({"detail": "Missing required parameter"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rev_program = RevenueProgram.objects.get(slug=revenue_program_slug)
        except RevenueProgram.DoesNotExist:
            logger.error(f'Request for page with non-existent RevenueProgram by slug "{revenue_program_slug}" ')
            return Response(
                {"detail": "Could not find RevenueProgram from that slug"}, status=status.HTTP_404_NOT_FOUND
            )

        try:
            donation_page = (
                rev_program.donationpage_set.get(slug=page_slug) if page_slug else rev_program.default_donation_page
            )
        except DonationPage.DoesNotExist:
            logger.error(f'Request for non-existant page by slug "{page_slug}" ')
            return Response(
                {"detail": "Could not find page matching those parameters"}, status=status.HTTP_404_NOT_FOUND
            )

        if live and not donation_page.is_live:
            logger.error(f'Request for un-published page "{donation_page}" ')
            return Response({"detail": "This page has not been published"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer_class()
        page_serializer = serializer(instance=donation_page)
        return Response(page_serializer.data, status=status.HTTP_200_OK)


class TemplateViewSet(OrganizationLimitedListView, viewsets.ModelViewSet):
    model = Template
    permission_classes = [IsAuthenticated, UserBelongsToOrg]

    def get_serializer_class(self):
        return serializers.TemplateDetailSerializer if self.action == "retrieve" else serializers.TemplateListSerializer


class StyleViewSet(OrganizationLimitedListView, viewsets.ModelViewSet):
    model = Style
    permission_classes = [IsAuthenticated, UserBelongsToOrg]
    serializer_class = serializers.StyleSerializer


class DonorBenefitViewSet(OrganizationLimitedListView, viewsets.ModelViewSet):
    model = DonorBenefit
    permission_classes = [IsAuthenticated, UserBelongsToOrg]
    serializer_class = serializers.DonorBenefitDetailSerializer


class BenefitTierViewSet(OrganizationLimitedListView, viewsets.ModelViewSet):
    model = BenefitTier
    permission_classes = [IsAuthenticated, UserBelongsToOrg]
    serializer_class = serializers.BenefitTierSerializer


class BenefitViewSet(OrganizationLimitedListView, viewsets.ModelViewSet):
    model = Benefit
    permission_classes = [IsAuthenticated, UserBelongsToOrg]
    serializer_class = serializers.BenefitSerializer
