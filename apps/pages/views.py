from rest_framework import viewsets

from apps.pages import serializers
from apps.pages.models import Benefit, BenefitTier, DonationPage, DonorBenefit, Style, Template


class PageViewSet(viewsets.ModelViewSet):
    queryset = DonationPage.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return serializers.DonationPageDetailSerializer
        return serializers.DonationPageListSerializer


class TemplateViewSet(viewsets.ModelViewSet):
    queryset = Template.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return serializers.TemplateDetailSerializer
        return serializers.TemplateListSerializer


class StyleViewSet(viewsets.ModelViewSet):
    queryset = Style.objects.all()
    serializer_class = serializers.StyleSerializer


class DonorBenefitViewSet(viewsets.ModelViewSet):
    queryset = DonorBenefit.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return serializers.DonorBenefitDetailSerializer
        return serializers.DonorBenefitListSerializer


class BenefitTierViewSet(viewsets.ModelViewSet):
    queryset = BenefitTier.objects.all()
    serializer_class = serializers.BenefitTierSerializer


class BenefitViewSet(viewsets.ModelViewSet):
    queryset = Benefit.objects.all()
    serializer_class = serializers.BenefitSerializer
