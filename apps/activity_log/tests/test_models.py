import pytest

from apps.activity_log.models import ActivityLog


@pytest.mark.django_db
class TestActivityLog:
    """Test the ActivityLog model."""

    def test_activity_log_str(self, activity_log: ActivityLog) -> None:
        """Test the string representation of the ActivityLog model."""
        assert str(activity_log)
