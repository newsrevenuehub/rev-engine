from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from apps.organizations.models import RevenueProgram
from apps.public.permissions import IsActiveSuperUser
from apps.public.serializers import RevenueProgramDetailSerializer, RevenueProgramListSerializer


class RevenueProgramViewset(ReadOnlyModelViewSet):
    model = RevenueProgram
    permission_classes = [IsAuthenticated, IsActiveSuperUser]
    queryset = RevenueProgram.objects.all()

    def get_serializer_class(self, **kwargs):
        if self.action == "list":
            return RevenueProgramListSerializer
        return RevenueProgramDetailSerializer
