import logging

from django.conf import settings
from django.db import models

from apps.common.models import IndexedTimeStampedModel
from apps.e2e.choices import CommitStatusState


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class CommitStatus(IndexedTimeStampedModel):
    # For saving the GitHub ID of the status. This will only exist if we succesfully create a commit
    # status on GH for the corresponding revengine commit status instance. Our system allows for the
    # existence of a revengine commit status without a corresponding GH commit status.
    github_id = models.BigIntegerField(null=True, blank=True)
    name = models.CharField(max_length=50)
    commit_sha = models.CharField(max_length=40)
    # This is where we can store our internal notes on what happened in the test run
    details = models.TextField(default="")
    screenshot = models.ImageField(upload_to="e2e/screenshots/", null=True, blank=True)
    state = models.CharField(max_length=10, choices=CommitStatusState.choices, default=CommitStatusState.PENDING)

    def __str__(self):
        return f"Commit status {self.name} {self.id} for SHA {self.commit_sha} and context {self.context}"

    @property
    def context(self) -> str:
        return f"e2e/{self.name}"
