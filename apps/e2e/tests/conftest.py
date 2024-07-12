import pytest

from apps.e2e.tests.factories import CommitStatusFactory


@pytest.fixture(autouse=True)
def _enable_e2e(settings):
    settings.E2E_ENABLED = True


@pytest.fixture()
def commit_status():
    return CommitStatusFactory()
