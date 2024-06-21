import logging

from django.conf import settings

from rest_framework import viewsets
from rest_framework.views import Response

from apps.api.permissions import IsE2EUser
from apps.e2e import TESTS
from apps.e2e.serializers import E2ETestRunSerializer
from apps.e2e.tasks import do_ci_e2e_test_run


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class E2EView(viewsets.ViewSet):
    permission_classes = [IsE2EUser]
    serializer_class = E2ETestRunSerializer

    def get(self, request):
        return Response({"tests": TESTS.keys()})

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        logger.info("Triggering async run of e2e tests %s", request.data)
        do_ci_e2e_test_run.delay(
            tests=serializer.validated_data["tests"],
            commit_sha=serializer.validated_data.get("commit_sha"),
            report_results=True,
        )
        return Response({"status": "success"})
