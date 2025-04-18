from apps.common import StrEnum


class ActivityLogAction(StrEnum):
    """Enum representing the action types for activity logs."""

    CANCELED = "canceled"

    @classmethod
    def choices(cls):
        """Return a list of tuples for use in model field choices."""
        return [(action.value, action.name) for action in cls]
