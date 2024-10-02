from github import Github

from apps.common.github import get_github_client


def test_get_github_client(settings):
    settings.GITHUB_TOKEN = "test_token"
    assert isinstance(get_github_client(), Github)
