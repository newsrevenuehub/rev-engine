from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt

from rest_framework.decorators import permission_classes
from rest_framework.views import Response

from apps.api.permissions import IsE2EUser
from apps.e2e.models import CommitStatus


@csrf_exempt
@permission_classes([IsE2EUser])
def commit_status_detail(request, github_id: str) -> Response:
    status = get_object_or_404(CommitStatus, github_id=github_id)
    return Response(status.details)
