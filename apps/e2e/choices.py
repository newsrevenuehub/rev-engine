from django.db import models


class CommitStatusState(models.TextChoices):
    SUCCESS = "success"
    FAILURE = "failure"
    PENDING = "pending"
    ERROR = "error"
