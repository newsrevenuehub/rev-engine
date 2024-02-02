from rest_framework.viewsets import ReadOnlyModelViewSet

from apps.api.permissions import IsAuthenticatedWithDoubleSubmitCsrf
from apps.organizations.models import RevenueProgram
from apps.public.permissions import IsActiveSuperUser
from apps.public.serializers import RevenueProgramDetailSerializer, RevenueProgramListSerializer


class RevenueProgramViewset(ReadOnlyModelViewSet):
    model = RevenueProgram
    permission_classes = [IsAuthenticatedWithDoubleSubmitCsrf, IsActiveSuperUser]

    def get_queryset(self):
        queryset = RevenueProgram.objects.all()
        stripe_account_id = self.request.query_params.get("stripe_account_id", None)
        if stripe_account_id is not None:
            queryset = queryset.filter(payment_provider__stripe_account_id=stripe_account_id)
        return queryset

    def get_serializer_class(self, **kwargs):
        if self.action == "list":
            return RevenueProgramListSerializer
        return RevenueProgramDetailSerializer
