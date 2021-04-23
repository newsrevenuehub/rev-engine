from rest_framework import viewsets

from apps.organizations.models import Organization


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()

    def get_serializer_class(self):
        pass
