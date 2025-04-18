import pytest

from apps.activity_log.models import ActivityLog
from apps.contributions.models import Contribution


@pytest.mark.django_db
class TestActivityLog:
    """Test the ActivityLog model."""

    @pytest.fixture
    def activity_log(self, monthly_contribution: Contribution) -> ActivityLog:
        """Create a sample ActivityLog instance for testing."""
        return monthly_contribution.create_contributor_canceled_contribution_activity_log()

    def test_activity_log_str(self, activity_log: ActivityLog) -> None:
        """Test the string representation of the ActivityLog model."""
        assert str(activity_log)
