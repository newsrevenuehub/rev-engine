from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from apps.common.models import IndexedTimeStampedModel

from .typings import ActivityLogAction


class ActivityLog(IndexedTimeStampedModel):
    """Represent an activity log entry.

    Actor is the user who performed the action. In the future we expect to accommodate
    system-as-actor, in which case we would not point to a distinct actor and the actor-related
    fields would be null.

    The activity_object is the object that was acted upon. This is a generic foreign key to
    allow for any model to be the activity object. We call it the relatively verbose name
    activity_object to avoid confusion with conventional use of the term "object" in Django generic
    foreign keys.


    The action is a string that describes the action taken.
    """

    actor_content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, related_name="actor", null=True, blank=True
    )
    actor_object_id = models.PositiveIntegerField(null=True, blank=True)
    actor_content_object = GenericForeignKey("actor_content_type", "actor_object_id")

    activity_object_content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, related_name="activity_object"
    )
    activity_object_object_id = models.PositiveIntegerField(null=False, blank=False)
    activity_object_content_object = GenericForeignKey("activity_object_content_type", "activity_object_object_id")
    """The object that was acted upon."""

    action = models.CharField(max_length=255, choices=ActivityLogAction.choices())

    def __str__(self):
        actor_string = (
            f"{self.actor_content_object.__class__.__name__} #{self.actor_content_object.pk}"
            if self.actor_content_object
            else "System"
        )
        object_string = (
            f"{self.activity_object_content_object.__class__.__name__} #{self.activity_object_content_object.pk}"
        )

        return (
            f"{actor_string} {self.action.lower()} {object_string} on {self.created.strftime('%Y-%m-%d at %H:%M:%S')}"
        )

    class Meta:
        indexes = [
            models.Index(fields=["actor_content_type", "actor_object_id"]),
            models.Index(fields=["activity_object_content_type", "activity_object_object_id"]),
        ]
