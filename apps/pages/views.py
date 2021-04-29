from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.api.permissions import UserBelongsToOrg
from apps.pages import serializers
from apps.pages.models import Benefit, BenefitTier, DonationPage, DonorBenefit, Style, Template


class OrganizationLimitedListView:
    model = None

    def get_queryset(self):
        if self.action == "list" and hasattr(self.model, "organization"):
            return self.model.objects.filter(organization__users=self.request.user)
        return self.model.objects.all()


class PageViewSet(OrganizationLimitedListView, viewsets.ModelViewSet):
    model = DonationPage
    permission_classes = [IsAuthenticated, UserBelongsToOrg]

    def get_serializer_class(self):
        return (
            serializers.DonationPageDetailSerializer
            if self.action == "retrieve"
            else serializers.DonationPageListSerializer
        )


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

    def get_serializer_class(self):
        return (
            serializers.DonorBenefitDetailSerializer
            if self.action == "retrieve"
            else serializers.DonorBenefitListSerializer
        )


class BenefitTierViewSet(OrganizationLimitedListView, viewsets.ModelViewSet):
    model = BenefitTier
    permission_classes = [IsAuthenticated, UserBelongsToOrg]
    serializer_class = serializers.BenefitTierSerializer


class BenefitViewSet(OrganizationLimitedListView, viewsets.ModelViewSet):
    model = Benefit
    permission_classes = [IsAuthenticated, UserBelongsToOrg]
    serializer_class = serializers.BenefitSerializer
