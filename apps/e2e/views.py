from django.http import HttpResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.csrf import csrf_exempt

from apps.e2e.models import CommitStatus


@csrf_exempt
def commit_status_detail(request, status_id: str, commit_sha: str) -> HttpResponse:
    status = get_object_or_404(CommitStatus, github_id=status_id, commit_sha=commit_sha)
    context = {"commit_status": status}
    return render(request, "commit-status-detail.html", context)
