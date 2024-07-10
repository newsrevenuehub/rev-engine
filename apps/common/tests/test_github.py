from apps.common.github import get_github_client


def test_get_github_client(settings):
    settings.GITHUB_TOKEN = (token := "test_token")
    assert get_github_client().auth.token == token
