import pytest

from apps.activity_log.models import ActivityLog
from apps.contributions.models import Contribution


@pytest.fixture
def activity_log(monthly_contribution: Contribution) -> ActivityLog:
    """Create a sample ActivityLog instance for testing."""
    return monthly_contribution.create_contributor_canceled_contribution_activity_log()
