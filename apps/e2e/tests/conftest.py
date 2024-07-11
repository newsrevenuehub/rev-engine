import pytest


@pytest.fixture(autouse=True)
def _enable_e2e(settings):
    settings.E2E_ENABLED = True
