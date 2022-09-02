from unittest import mock

import pytest

from apps.common.context_processors import commit_sha, sentry_dsn


@pytest.mark.xfail(reason="Seems unused? SENTRY_DSN not in settings. TODO: delete or document")
def test_sentry_dsn():
    assert "SENTRY_DSN" in sentry_dsn(mock.Mock())


@pytest.mark.xfail(
    reason="COMMIT_SHA not in settings but is mentioned in cloudbuild.yaml TODO: document and add base setting or delete if unused."
)
def test_commit_sha():
    assert "COMMIT_SHA" in commit_sha(mock.Mock())
