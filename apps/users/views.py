from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.serializers import UserSerializer


user_model = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_user(request):
    if request.method == "GET":
        try:
            user = user_model.objects.get(pk=request.user.pk)
            user_serializer = UserSerializer(user)
            return Response(data=user_serializer.data, status=status.HTTP_200_OK)
        except user_model.DoesNotExist:
            return Response(
                {"detail": "Could not find User instance for authetnicated user"}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response({"detail": "Could not complete request"}, status=status.HTTP_400_BAD_REQUEST)
