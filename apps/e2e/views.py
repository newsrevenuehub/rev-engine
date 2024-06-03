import logging

from django.conf import settings

from rest_framework.views import APIView, Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError

from apps.api.permissions import IsE2EUser
from apps.e2e import TESTS
from apps.e2e.tasks import do_ci_e2e_test_run

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class E2EView(APIView):
    permission_classes = [IsE2EUser]

    def get(self, request):
        return Response({"tests": TESTS.keys()})

    def validate_request(self, request):
        tests = request.data["tests"]
        if not tests:
            raise ValidationError("No tests provided")
        if difference := set(tests.keys()) - set(TESTS.keys()):
            raise ValidationError(f"Invalid test names provided: {difference}")

    @action(methods=["post"], url_path="trigger-tests")
    def trigger_tests(self, request):
        logger.info("Triggering tests %s", request.data)
        self.validate_request(request)
        do_ci_e2e_test_run.delay(tests=request.data["tests"])
        return Response({"status": "success"})
