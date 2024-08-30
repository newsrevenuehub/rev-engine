import pytest

from apps.e2e.tests.factories import CommitStatusFactory


@pytest.fixture
def commit_status():
    return CommitStatusFactory()
