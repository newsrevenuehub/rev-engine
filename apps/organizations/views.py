from rest_framework import viewsets

from apps.organizations import serializers
from apps.organizations.models import Feature, Organization, Plan, RevenueProgram


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return serializers.OrganizationDetailSerializer
        return serializers.OrganizationListSerializer


class FeatureViewSet(viewsets.ModelViewSet):
    queryset = Feature.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return serializers.FeatureDetailSerializer
        return serializers.FeatureListSerializer


class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return serializers.PlanDetailSerializer
        return serializers.PlanListSerializer


class RevenueProgramViewSet(viewsets.ModelViewSet):
    queryset = RevenueProgram.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return serializers.RevenueProgramDetailSerializer
        return serializers.RevenueProgramListSerializer
