from django.contrib.auth import get_user_model
from django.contrib.auth.views import PasswordResetConfirmView
from django.urls import reverse_lazy

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.serializers import UserSerializer


user_model = get_user_model()


class UserTypeSensitivePasswordResetConfirm(PasswordResetConfirmView):
    def form_valid(self, form):
        if self.user.organizations.exists():
            self.success_url = reverse_lazy("orgadmin_password_reset_complete")
        return super().form_valid(form)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_user(request):
    if request.method == "GET":
        user = user_model.objects.get(pk=request.user.pk)
        user_serializer = UserSerializer(user)
        return Response(data=user_serializer.data, status=status.HTTP_200_OK)
