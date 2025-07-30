from django.shortcuts import get_object_or_404

from knox.auth import TokenAuthentication
from rest_framework.decorators import action
from rest_framework.mixins import RetrieveModelMixin
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from apps.api.permissions import IsSwitchboardAccount
from apps.users import serializers
from apps.users.models import User


class SwitchboardUsersViewSet(RetrieveModelMixin, GenericViewSet):
    permission_classes = [IsSwitchboardAccount]
    queryset = User.objects.all()
    serializer_class = serializers.SwitchboardUserSerializer
    authentication_classes = [TokenAuthentication]

    @action(methods=["get"], url_path="email/(?P<email>[^/]+)", detail=False)
    def get_by_email(self, request, email):
        user = get_object_or_404(User.objects.all(), email__iexact=email)
        serializer = serializers.SwitchboardUserSerializer(user)
        return Response(serializer.data)
