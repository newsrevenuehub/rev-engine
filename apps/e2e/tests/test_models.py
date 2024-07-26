import pytest


@pytest.mark.django_db()
class TestCommitStatus:
    def test___str__(self, commit_status):
        assert str(commit_status) == (
            f"Commit status {commit_status.name} {commit_status.id} for SHA "
            f"{commit_status.commit_sha} and context {commit_status.context}"
        )
