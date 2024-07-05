import logging
from functools import cached_property

from django.conf import settings
from django.db import models
from django.urls import reverse

from github.CommitStatus import CommitStatus

from apps.common.github import get_github_client
from apps.common.models import IndexedTimeStampedModel


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class CommitStatus(IndexedTimeStampedModel):
    """ """

    # For saving the GitHub ID of the status. This will only exist if we succesfully create a commit
    # status on GH for the corresponding revengine commit status instance. Our system allows for the
    # existence of a revengine commit status without a corresponding GH commit status.
    github_id = models.IntegerField(max_length=40)
    name = models.CharField(max_length=50)
    commit_sha = models.CharField(max_length=40)
    # This is where we can store our internal notes on what happened in the test run
    details = models.TextField()
    screenshot = models.ImageField(upload_to="e2e/screenshots/", null=True, blank=True)

    def __str__(self):
        return f"Commit status {self.name} {self.id} for SHA {self.commit_sha}"

    @cached_property
    def _client(self):
        return get_github_client()

    @cached_property
    def _ref_statuses(self):
        return [x for x in self._client.get_repo(settings.GITHUB_REPO).get_commit(self.commit_sha).get_statuses()]

    @cached_property
    def upstream(self) -> CommitStatus | None:
        return next((x for x in self._ref_statuses if x.id == self.id), None)

    @property
    def target_url(self) -> str:
        return reverse("e2e:commit-status-detail", args=[self.id])

    @property
    def context(self) -> str:
        return f"e2e/{self.name}"
