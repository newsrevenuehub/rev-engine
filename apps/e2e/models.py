import logging

from django.conf import settings
from django.db import models

from apps.common.models import IndexedTimeStampedModel


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class E2ERun(IndexedTimeStampedModel):
    """ """

    e2e_ci_check = models.ForeignKey("E2ECiCheck", on_delete=models.CASCADE)
    # limit choices
    outcome = models.CharField(max_length=10, default="PENDING")
    name = models.CharField(max_length=255)
    # how to type this?
    results = models.JSONField()
    screenshot = models.ImageField(upload_to="e2e/screenshots/", null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.outcome}"


class E2ECiCheck(IndexedTimeStampedModel):
    """Model for storing CI check results.

    Consists of a suite of check_runs.
    """

    commit_sha = models.CharField(max_length=40, unique=True)
    # choices
    outcome = models.CharField(max_length=10, default="PENDING")
    # validate this vs. the choices
    name = models.CharField(max_length=255)

    def run(self):
        checks = self.e2e_check_set.all()
        for check in checks:
            check.run()

    def run(self, name: str) -> None:

        for check_run in (runs := get_check_runs_for_module(name)):
            check_run.run()
            check_run.save()
        self.outcome = "SUCCESS" if all(run.outcome == "PASSED" for run in runs) else "FAILURE"
        self.save(update_fields=["outcome", "modified"])
